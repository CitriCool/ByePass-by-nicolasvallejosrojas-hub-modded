import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { crearPartida, visible, voltear, validarContexto, mejorMarca } from './memoria-motor.mjs';
export {identidad, leer};

const sesiones = new Map();
const carpeta = new URL('../data/memoria/', import.meta.url);
const archivo = new URL('resultados.json', carpeta);
let cola = Promise.resolve();
async function datos() {
  try { return JSON.parse(await readFile(archivo, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}
function guardar(fn) {
  const resultado = cola.then(async () => {
    const d = await datos(); await fn(d); await mkdir(carpeta, { recursive: true });
    const temporal = new URL('resultados.tmp', carpeta); await writeFile(temporal, JSON.stringify(d, null, 2)); await rename(temporal, archivo); return d;
  });
  cola = resultado.catch(() => {}); return resultado;
}
async function json(url, body) {
  const r = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Error('No se pudo comprobar la cuenta o el torneo.');
  return r.json();
}
const leer = ruta => json('http://127.0.0.1:9000/' + ruta + '.json?ns=demo-byepass-default-rtdb');
async function identidad(token) {
  if (!token || token.length > 8000) throw Error('Inicia sesión para guardar tus resultados.');
  const r = await json('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=local', { idToken: token });
  const u = r.users?.[0];
  if (!u?.email || !/^[A-Za-z0-9_-]{1,128}$/.test(u.localId)) throw Error('Entra con una cuenta de ByePass.');
  const perfil = await leer('usuarios/' + u.localId);
  if (!perfil?.nombre) throw Error('Completa primero el perfil de tu cuenta.');
  return { uid: u.localId, nombre: perfil.nombre.slice(0, 80) };
}
function resumen(d, u) {
  const mio = d[u.uid] || {};
  const ranking = Object.entries(d).filter(([, v]) => v.publico && v.mejor).map(([uid, v]) => ({ nombre: v.nombre, puntos: v.mejor.puntos, intentos: v.mejor.intentos, duracion: v.mejor.duracion, tu: uid === u.uid }))
    .sort((a, b) => b.puntos - a.puntos || a.duracion - b.duracion || a.nombre.localeCompare(b.nombre)).slice(0, 20);
  return { nombre: u.nombre, publico: !!mio.publico, mejor: mio.mejor || null, partidas: mio.partidas || 0, ultimas: mio.ultimas || [], ranking };
}
export async function memoriaApi(req, res) {
  if (new URL(req.url, 'http://localhost').pathname !== '/api/memoria') return false;
  const enviar = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST') { enviar(405, { error: 'Método no permitido.' }); return true; }
  // No hay CORS ni destino configurable: solo el origen local de esta web.
  if (req.headers.origin !== `http://127.0.0.1:${res.socket.localPort}` || !req.headers['content-type']?.startsWith('application/json')) { enviar(403, { error: 'Origen no permitido.' }); return true; }
  try {
    let texto = ''; for await (const chunk of req) { texto += chunk; if (texto.length > 16000) throw Error('Solicitud demasiado grande.'); }
    const b = JSON.parse(texto), u = await identidad(b.token);
    const sala = String(b.sala || ''); if (!/^[a-zA-Z0-9_-]{1,80}$/.test(sala)) throw Error('Sala inválida.');
    let d = await datos();
    if (b.accion === 'estado') enviar(200, resumen(d, u));
    else if (b.accion === 'preferencia') {
      if (typeof b.publico !== 'boolean') throw Error('Preferencia inválida.');
      d = await guardar(d => { d[u.uid] = { ...d[u.uid], publico: b.publico, nombre: u.nombre }; });
      enviar(200, resumen(d, u));
    } else if (b.accion === 'iniciar') {
      for (const [id, p] of sesiones) if (Date.now() - p.inicio > 900000) sesiones.delete(id);
      const contexto = validarContexto(await leer('salas/' + sala + '/pairings'), u.nombre);
      for (const [id, p] of sesiones) if (p.uid === u.uid) sesiones.delete(id);
      if (sesiones.size >= 1000) throw Error('Hay muchas partidas abiertas. Inténtalo más tarde.');
      const p = crearPartida(u.uid, { ...contexto, sala }); sesiones.set(p.id, p);
      enviar(200, visible(p));
    } else if (b.accion === 'voltear') {
      const p = sesiones.get(b.id); if (!p || p.uid !== u.uid || p.contexto.sala !== sala) throw Error('Partida no disponible para esta cuenta.');
      const contexto = validarContexto(await leer('salas/' + sala + '/pairings'), u.nombre);
      if (contexto.clave !== p.contexto.clave) { sesiones.delete(p.id); throw Error('Hay una nueva ronda. Vuelve a tus emparejamientos.'); }
      if (p.guardando) throw Error('Espera la confirmación de tu resultado.');
      // Si falla el guardado, el mismo último movimiento permite reintentarlo sin duplicar la marca.
      let estado;
      if (b.secuencia === p.secuencia - 1 && b.indice === p.ultimoIndice) estado = visible(p);
      else { estado = voltear(p, u.uid, b.indice, b.secuencia); p.ultimoIndice = b.indice; }
      if (p.terminada) {
        p.guardando = true;
        try {
          const marca = { id: p.id, puntos: p.puntos, intentos: p.intento, duracion: p.duracion, fecha: Date.now() };
          d = await guardar(d => {
            const anterior = d[u.uid] || {};
            if ((anterior.ultimas || []).some(m => m.id === p.id)) return;
            d[u.uid] = { ...anterior, nombre: u.nombre, mejor: mejorMarca(anterior.mejor, marca), partidas: (anterior.partidas || 0) + 1, ultimas: [marca, ...(anterior.ultimas || [])].slice(0, 10) };
          });
          estado.resumen = resumen(d, u);
        } finally { p.guardando = false; }
      }
      enviar(200, estado);
    } else throw Error('Acción no permitida.');
  } catch (e) { enviar(400, { error: e.message === 'fetch failed' ? 'No se pudo conectar con los emuladores.' : e.message }); }
  return true;
}
