import { onValueCreated, onValueWritten } from 'firebase-functions/v2/database';
import { initializeApp } from 'firebase-admin/app';
import { crearAvisos } from './eventos.mjs';
// Este reemplazo solo funciona dentro del emulador. Nunca envía correo ni FCM real.
if (process.env.FUNCTIONS_EMULATOR !== 'true' || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '')) throw new Error('Funciones exclusivas del entorno local.');
initializeApp();
const raiz = event => (event.data.after || event.data).ref.root;
async function guardar(event, tipo, destinatarios, texto){
 const avisos=crearAvisos({id:event.id,tipo,destinatarios,texto,creado:Date.parse(event.time)});
 for(const aviso of avisos){
  await raiz(event).child(`notificaciones/${aviso.uid}/${aviso.id}`).transaction(actual=>actual || aviso);
 }
}
export const inscripcionRecibida=onValueCreated('/inscripciones/{tienda}/{evento}/{uid}',async event=>{
 const miembros=(await raiz(event).child(`tiendas/${event.params.tienda}/miembros`).get()).val() || {};
 await guardar(event,'inscripcion',Object.keys(miembros),`Nueva inscripción en ${event.params.evento}.`);
});
export const avisoStaff=onValueCreated('/salaChat/{tienda}/{mensaje}',async event=>{
 const miembros=(await raiz(event).child(`salaStaff/${event.params.tienda}/miembros`).get()).val() || {};
 await guardar(event,'staff',Object.keys(miembros).filter(uid=>miembros[uid].estado==='admitido'), 'Hay un mensaje nuevo en la sala del equipo.');
});
export const accesoStaff=onValueWritten('/salaStaff/{tienda}/miembros/{uid}/estado',async event=>{
 if(event.data.before.val()===event.data.after.val() || !event.data.after.exists()) return;
 await guardar(event,'admision',[event.params.uid],'Se actualizó tu acceso a la sala del equipo.');
});
