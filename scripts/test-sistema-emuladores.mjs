import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { guardarInscripcion } from '../web/inscripcion-datos.js';
import { planPublicacion } from '../web/admin-publicacion.js';
import { emparejar, aPairings, aHistorial, GANA_A } from '../web/torneo.js';
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:9003');
const ns='demo-byepass-registro-default-rtdb', resultados=[];
async function db(ruta='',u=null,method='GET',body){
 const url=new URL(`http://127.0.0.1:9003/${ruta}.json?ns=${ns}`); if(u) url.searchParams.set('auth',u.idToken);
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...(!u?{Authorization:'Bearer owner'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const v=await r.json(); if(!r.ok) throw Object.assign(new Error(JSON.stringify(v)),{code:'PERMISSION_DENIED'}); return v;
}
async function usuario(){ const r=await fetch('http://127.0.0.1:9093/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})}); return r.json(); }
async function caso(n,fn){await fn();resultados.push(n);console.log('OK:',n);}
const org=await usuario(), a=await usuario(), b=await usuario(), intruso=await usuario();
const tienda='tienda-prueba',evento='evento-1',base='salas/'+tienda;
const dato={nombre:'Ana',apellido:'Vega',correo:'ana@example.test',playerId:'123456',acepta:true,creado:Date.now(),actualizado:Date.now(),division:'masters'};
try{
 await db('',null,'PUT',{beta:{activa:false},tiendas:{[tienda]:{perfil:{nombre:'Tienda de prueba'},miembros:{[org.localId]:{rol:'dueno'}}}},salas:{[tienda]:{agenda:{[evento]:{titulo:'Torneo local',inicioMs:Date.now()+3600000,inscripcion:{abierta:true,cupos:{masters:1}}}}}},cupos:{[tienda]:{[evento]:{masters:{1:''}}}}});
 const reservar=u=>guardarInscripcion({tienda,evento,uid:u.localId,dato,limitada:true,cargar:()=>db(`cupos/${tienda}/${evento}`,u),escribir:r=>db('',u,'PATCH',r)});
 await caso('Último cupo concurrente: exactamente una inscripción y una plaza',async()=>{
  const r=await Promise.allSettled([reservar(a),reservar(b)]); assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
  const i=await db(`inscripciones/${tienda}/${evento}`);assert.equal(Object.keys(i).length,1);
  const uid=Object.keys(i)[0]; assert.equal(await db(`cupos/${tienda}/${evento}/masters/1`),uid);
 });
 const inscritos=await db(`inscripciones/${tienda}/${evento}`), ganador=Object.keys(inscritos)[0], u=ganador===a.localId?a:b;
 await caso('Cloud Function genera un aviso local para el organizador',async()=>{
  let avisos; for(let n=0;n<100;n++){ avisos=await db('notificaciones/'+org.localId);if(avisos && Object.keys(avisos).length) break;await new Promise(r=>setTimeout(r,300)); }
  assert.ok(avisos && Object.values(avisos).some(x=>x.canal==='simulado' && x.titulo==='Inscripción recibida'));
 });
 await caso('Privacidad: otro jugador no puede leer ni modificar la inscripción',async()=>{
  await assert.rejects(db(`inscripciones/${tienda}/${evento}/${ganador}`,intruso));
  await assert.rejects(db(`inscripciones/${tienda}/${evento}/${ganador}`,intruso,'PUT',dato));
 });
 await caso('Rechaza privilegios, publicaciones ajenas y plazas inexistentes',async()=>{
  await assert.rejects(db('admins/'+intruso.localId,intruso,'PUT',true));
  await assert.rejects(db(base+'/pairings',intruso,'PUT',{name:'Falso'}));
  await assert.rejects(db('',intruso,'PATCH',{[`cupos/${tienda}/${evento}/masters/999`]:intruso.localId,[`cupos/${tienda}/${evento}/quien/${intruso.localId}`]:'masters/999',[`inscripciones/${tienda}/${evento}/${intruso.localId}`]:{...dato,cupo:'999'}}));
 });
 await caso('Anulación atómica libera la plaza y permite una nueva inscripción',async()=>{
  await db('',u,'PATCH',{[`inscripciones/${tienda}/${evento}/${ganador}`]:null,[`cupos/${tienda}/${evento}/masters/1`]:'',[`cupos/${tienda}/${evento}/quien/${ganador}`]:null});
  await reservar(intruso);assert.equal(await db(`cupos/${tienda}/${evento}/masters/1`),intruso.localId);
 });
 await caso('Inscripción cerrada: rechaza nuevos envíos y conserva los datos anteriores',async()=>{
  await db(base+'/agenda/'+evento+'/inscripcion/abierta',org,'PUT',false);
  await assert.rejects(reservar(a)); assert.equal(Object.keys(await db(`inscripciones/${tienda}/${evento}`)).length,1);
 });
 await caso('Logo de tienda: dueño guarda y otro jugador no puede modificarlo',async()=>{
  const logo='data:image/png;base64,iVBORw0KGgo=';
  await db('fotos/'+tienda+'/logo',org,'PUT',logo);
  assert.equal(await db('fotos/'+tienda+'/logo',intruso),logo);
  await assert.rejects(db('fotos/'+tienda+'/logo',intruso,'PUT',logo));
  await assert.rejects(db('fotos/'+tienda+'/logo',org,'PUT','javascript:alert(1)'));
 });
 await caso('Torneo completo: crear, emparejar, resultados, publicar e historial',async()=>{
  let t={nombre:'Copa local',fecha:'2026-11-09',rondas:1,semilla:10,jugadores:{a:{nombre:'Ana',desde:1,drop:0},b:{nombre:'Bruno',desde:1,drop:0},c:{nombre:'Carla',desde:1,drop:0},d:{nombre:'Diego',desde:1,drop:0}}};
  await db(base+'/torneo',org,'PUT',t);
  const ronda=emparejar(t); assert.equal(ronda.mesas.length,2);
  let cambios=planPublicacion(t,{[base+'/torneo/ronda/1']:ronda},base,aPairings);await db('',org,'PATCH',cambios);
  t=await db(base+'/torneo',org);
  for(let i=0;i<2;i++){cambios=planPublicacion(t,{[base+`/torneo/ronda/1/mesas/${i}/r`]:GANA_A},base,aPairings);await db('',org,'PATCH',cambios);t=await db(base+'/torneo',org);}
  const publicado=await db(base+'/pairings',org), esperado=JSON.parse(JSON.stringify(aPairings(t))); assert.ok(publicado.updatedAt > 0); delete publicado.updatedAt; delete esperado.updatedAt; assert.deepEqual(publicado,esperado);
  const hist=aHistorial(t); assert.equal(hist.partidas.length,2);assert.equal(hist.standings.length,4);
  await db('',org,'PATCH',{[base+'/historial/copa']:hist,[base+'/torneo/archivado']:true});
  assert.equal((await db(base+'/historial/copa')).partidas.length,2);
  await db('',org,'PATCH',{[base+'/historial/copa']:null,['idsHistorial/'+tienda+'/copa']:null,[base+'/historialVer']:Date.now()});assert.equal(await db(base+'/historial/copa'),null);
 });
 await caso('Fallo de permisos revierte el conjunto: torneo y vista no divergen',async()=>{
  const antes=await db(base+'/pairings');
  await assert.rejects(db('',intruso,'PATCH',{[base+'/torneo/nombre']:'Fraude',[base+'/pairings/name']:'Fraude'}));
  assert.deepEqual(await db(base+'/pairings'),antes);
 });
 await writeFile('data/sistema-emuladores-verification.json',JSON.stringify({fecha:new Date().toISOString(),resultados},null,2));
} finally { await db('',null,'DELETE'); }
