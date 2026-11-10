import { randomInt, randomUUID } from 'node:crypto';
import { estadoEspera } from '../web/espera-estado.js';

export function crearPartida(uid, contexto, ahora = Date.now()) {
  const cartas = Array.from({ length: 12 }, (_, i) => i % 6);
  for (let i = 11; i > 0; i--) { const j = randomInt(i + 1); [cartas[i], cartas[j]] = [cartas[j], cartas[i]]; }
  return { id: randomUUID(), uid, contexto, cartas, inicio: ahora, intento: 0, abiertas: [], parejas: [], secuencia: 0, ocultaHasta: 0, terminada: false };
}
export function visible(p, ahora = Date.now()) {
  return { id: p.id, intento: p.intento, parejas: p.parejas.length, secuencia: p.secuencia,
    abiertas: [...p.abiertas], parejasTipos: [...p.parejas],
    cartas: p.cartas.map((tipo, i) => ({ indice: i, tipo: p.parejas.includes(tipo) || p.abiertas.includes(i) ? tipo : null })),
    terminada: p.terminada, puntos: p.puntos, duracion: p.terminada ? p.duracion : Math.floor((ahora - p.inicio) / 1000) };
}
export function voltear(p, uid, indice, secuencia, ahora = Date.now()) {
  if (uid !== p.uid) throw Error('Esta partida pertenece a otra cuenta.');
  if (ahora - p.inicio > 15 * 60 * 1000) throw Error('La partida venció. Inicia otra.');
  if (p.terminada) throw Error('Esta partida ya terminó.');
  if (!Number.isInteger(indice) || indice < 0 || indice > 11 || secuencia !== p.secuencia) throw Error('Movimiento inválido. Inicia otra partida.');
  if (ahora < p.ocultaHasta) throw Error('Espera a que se oculten las cartas.');
  if (p.abiertas.length === 2) p.abiertas = [];
  if (p.abiertas.includes(indice) || p.parejas.includes(p.cartas[indice])) throw Error('Esa carta ya está descubierta.');
  p.abiertas.push(indice); p.secuencia++;
  if (p.abiertas.length === 2) {
    p.intento++;
    const [a, b] = p.abiertas;
    if (p.cartas[a] === p.cartas[b]) { p.parejas.push(p.cartas[a]); p.abiertas = []; }
    else p.ocultaHasta = ahora + 900;
  }
  if (p.parejas.length === 6) {
    p.terminada = true; p.duracion = Math.max(1, Math.floor((ahora - p.inicio) / 1000));
    p.puntos = Math.max(50, 1000 - (p.intento - 6) * 35 - p.duracion * 2);
  }
  return visible(p, ahora);
}
export function validarContexto(publicado, nombre) {
  const e = estadoEspera(publicado, nombre);
  if (!e.listo) throw Error(e.motivo);
  return e;
}
export function mejorMarca(anterior, nuevo) {
  if (!anterior || nuevo.puntos > anterior.puntos || (nuevo.puntos === anterior.puntos && nuevo.duracion < anterior.duracion)) return nuevo;
  return anterior;
}
