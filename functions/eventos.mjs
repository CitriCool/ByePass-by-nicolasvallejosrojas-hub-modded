import { createHash } from 'node:crypto';
export function crearAvisos(evento){
  if (!evento.id || !evento.tipo) throw new Error('Evento sin identificador o tipo.');
  const id = createHash('sha256').update(evento.id).digest('hex');
  const tipos = { inscripcion:'Inscripción recibida', resultado:'Resultado actualizado', staff:'Aviso del equipo', admision:'Acceso al equipo actualizado' };
  if (!tipos[evento.tipo]) throw new Error('Tipo de aviso desconocido.');
  return [...new Set(evento.destinatarios || [])].map(uid => ({ id:id+'-'+uid, uid, titulo:tipos[evento.tipo], texto:String(evento.texto || '').slice(0,500), canal:'simulado', estado:'pendiente', creado:evento.creado }));
}
export async function procesarEvento(evento, { existe, guardar }){
  let nuevos = 0;
  for (const aviso of crearAvisos(evento)){
    if (await existe(aviso.id)) continue;
    await guardar(aviso.id, aviso); nuevos++;
  }
  return nuevos;
}
