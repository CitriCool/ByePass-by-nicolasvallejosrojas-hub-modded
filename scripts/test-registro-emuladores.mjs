import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { crearRegistro, perfilCompleto } from '../web/registro.js';
import { root } from './server.mjs';

const project = 'demo-byepass-registro';
assert.equal(process.env.GCLOUD_PROJECT, project, 'Solo se permite el proyecto de pruebas de registro.');
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST, '127.0.0.1:9003');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9093');
const DB = 'http://127.0.0.1:9003', AUTH = 'http://127.0.0.1:9093';
const ns = project + '-default-rtdb', clave = 'ValidacionLocal2026!';
const resultados = [];
let numero = 0;
const datos = extra => ({ nombre: 'Ana Vega', nacimiento: '1995-05-12', correo: `registro-${++numero}@example.test`,
  clave, publico: false, playerId: '', ...extra });
async function request(url, method = 'GET', body, admin = false) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: 'Bearer owner' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error?.message || data.error || `HTTP ${r.status}`), {
    code: [401,403].includes(r.status) ? 'PERMISSION_DENIED' : data.error?.message || `HTTP_${r.status}`,
  });
  return data;
}
function database(ruta = '', user, method = 'GET', body, admin = false) {
  const url = new URL(`${DB}/${ruta}.json`); url.searchParams.set('ns', ns);
  if (user) url.searchParams.set('auth', user.token);
  return request(url, method, body, admin);
}
const auth = (accion, body) => request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:${accion}?key=local-test`, 'POST', body);
const users = () => request(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:query`, 'POST', {}, true);
async function preparar(beta = false, max = 2) {
  await database('', null, 'PUT', { beta: { activa: beta, codigos: { PRUEBA1234: { max, usados: 0 } } } }, true);
}
function cliente() {
  const estado = { user: null, altas: 0, escrituras: 0, bajas: 0, pendientes: new Map() };
  const api = {
    usuarioActual: () => estado.user,
    crearCuenta: async (email, password) => {
      const u = await auth('signUp', { email, password, returnSecureToken: true }); estado.altas++;
      return estado.user = { uid: u.localId, email, token: u.idToken };
    },
    cambiarNombre: async (u, displayName) => {
      const r = await auth('update', { idToken: u.token, displayName, returnSecureToken: true });
      if (r.idToken) u.token = r.idToken;
    },
    leerPerfil: u => database(`usuarios/${u.uid}`, u),
    borrarCuenta: async u => { await auth('delete', { idToken: u.token }); estado.bajas++; estado.user = null; },
    leerBeta: async () => await database('beta/activa') === true,
    normalizarCodigo: c => String(c || '').toUpperCase(),
    validarInvitacion: async c => {
      const max = await database(`beta/codigos/${c}/max`), usados = await database(`beta/codigos/${c}/usados`);
      return typeof max === 'number' && (usados || 0) < max ? '' : 'beta/codigo';
    },
    guardarPerfil: (u, dato) => {
      estado.escrituras++;
      const { invitacion, ...p } = dato;
      const rutas = Object.fromEntries(Object.entries(p).map(([k,v]) => [`usuarios/${u.uid}/${k}`,v]));
      if (invitacion) Object.assign(rutas, {
        [`usuarios/${u.uid}/invitacion`]: invitacion,
        [`beta/codigos/${invitacion}/usados`]: { '.sv': { increment: 1 } },
        [`beta/codigos/${invitacion}/quienes/${u.uid}`]: Date.now(),
        [`beta/testers/${u.uid}`]: true,
      });
      return database('', u, 'PATCH', rutas);
    },
    verificarCorreo: async () => {},
    pendientes: { guardar: (u,p) => estado.pendientes.set(u,p), leer: u => estado.pendientes.get(u), quitar: u => estado.pendientes.delete(u) },
  };
  return { estado, api, servicio: crearRegistro(api, { espera: 5000 }) };
}
async function caso(nombre, fn) {
  await fn(); resultados.push(nombre); console.log('OK:', nombre);
}
try {
  await caso('Alta normal confirmada en Auth y Realtime Database', async () => {
    await preparar(); const c = cliente(); const user = await c.servicio.registrar(datos());
    assert.ok(perfilCompleto(await c.api.leerPerfil(user))); assert.equal(c.estado.altas, 1);
  });
  await caso('Rechazo real de las reglas: se borra Auth y se puede reutilizar el correo', async () => {
    await preparar(); const c = cliente(), d = datos(); const guardar = c.api.guardarPerfil;
    c.api.guardarPerfil = (u,p) => guardar(u, { ...p, nombre: 'X' });
    await assert.rejects(c.servicio.registrar(d), { code: 'registro/no-guardado' });
    assert.equal(c.estado.user, null); assert.equal(c.estado.bajas, 1);
    assert.ok(!(await users()).userInfo.some(u => u.email === d.correo));
    c.api.guardarPerfil = guardar; await c.servicio.registrar(d);
    assert.ok(perfilCompleto(await c.api.leerPerfil(c.estado.user)));
  });
  await caso('Respuesta perdida: se conserva el perfil y el código solo se consume una vez', async () => {
    await preparar(true); const c = cliente(), guardar = c.api.guardarPerfil;
    c.api.guardarPerfil = async (u,p) => { await guardar(u,p); throw Object.assign(new Error('Respuesta perdida'), { code: 'network' }); };
    const user = await c.servicio.registrar(datos({ invitacion: 'PRUEBA1234' }));
    assert.ok(perfilCompleto(await c.api.leerPerfil(user))); assert.equal(c.estado.bajas, 0);
    await c.servicio.reanudar(c.estado.pendientes.get(user.uid));
    assert.equal(await database('beta/codigos/PRUEBA1234/usados'), 1); assert.equal(c.estado.escrituras, 1);
    const perfil = await c.api.leerPerfil(user);
    await assert.rejects(guardar(user, perfil), { code: 'PERMISSION_DENIED' });
    assert.equal(await database('beta/codigos/PRUEBA1234/usados'), 1);
  });
  await caso('Reversión fallida: completar con el mismo UID sin otro alta', async () => {
    await preparar(); const c = cliente(), guardar = c.api.guardarPerfil, borrar = c.api.borrarCuenta;
    c.api.guardarPerfil = (u,p) => guardar(u, { ...p, nombre: 'X' });
    c.api.borrarCuenta = async () => { throw Object.assign(new Error('Red interrumpida'), { code: 'network' }); };
    await assert.rejects(c.servicio.registrar(datos()), { code: 'registro/pendiente' });
    const uid = c.estado.user.uid, pendiente = c.servicio.pendiente(uid);
    assert.ok(!JSON.stringify(pendiente).includes(clave));
    c.api.guardarPerfil = guardar; c.api.borrarCuenta = borrar;
    await c.servicio.reanudar(pendiente);
    assert.equal(c.estado.user.uid, uid); assert.equal(c.estado.altas, 1); assert.ok(perfilCompleto(await c.api.leerPerfil(c.estado.user)));
  });
  await caso('Dos altas al último cupo: una admitida y la otra revertida', async () => {
    await preparar(true, 1); const a = cliente(), b = cliente();
    let liberar, llegadas = 0; const barrera = new Promise(r => liberar = r);
    for (const c of [a,b]) {
      const crear = c.api.crearCuenta;
      c.api.crearCuenta = async (...args) => { const u = await crear(...args); if (++llegadas === 2) liberar(); await barrera; return u; };
    }
    const resultado = await Promise.allSettled([a.servicio.registrar(datos({ invitacion:'PRUEBA1234' })), b.servicio.registrar(datos({ invitacion:'PRUEBA1234' }))]);
    assert.equal(resultado.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(resultado.filter(r => r.status === 'rejected' && r.reason.code === 'beta/codigo').length, 1);
    assert.equal(await database('beta/codigos/PRUEBA1234/usados'), 1);
    assert.equal(a.estado.bajas+b.estado.bajas, 1);
  });
  await caso('Una cuenta no puede leer otro perfil ni escribir permisos administrativos', async () => {
    await preparar(); const a = cliente(), b = cliente();
    const ua = await a.servicio.registrar(datos()), ub = await b.servicio.registrar(datos());
    await assert.rejects(database(`usuarios/${ua.uid}`, ub), { code:'PERMISSION_DENIED' });
    await assert.rejects(database(`usuarios/${ua.uid}`, null), { code:'PERMISSION_DENIED' });
    await assert.rejects(database(`admins/${ub.uid}`, ub, 'PUT', true), { code:'PERMISSION_DENIED' });
    await assert.rejects(database(`usuarios/${ub.uid}/rol`, ub, 'PUT', 'admin'), { code:'PERMISSION_DENIED' });
  });
  await mkdir(path.join(root,'data'), {recursive:true});
  await writeFile(path.join(root,'data/registro-emuladores-verification.json'),JSON.stringify({ fecha:new Date().toISOString(), proyecto:project, resultados },null,2));
  console.log('Pruebas completas en emuladores exclusivos de registro; no se modificó el entorno de navegación.');
} finally {
  // Solo esta instancia desechable y sus cuentas de @example.test.
  await request(`${AUTH}/emulator/v1/projects/${project}/accounts`, 'DELETE');
}
