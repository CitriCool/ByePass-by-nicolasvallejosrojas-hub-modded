import {startServer} from './server.mjs';
import {crearSaltoApi} from './salto-api.mjs';
const servidor=await startServer(8002,{apiSalto:crearSaltoApi({directorio:new URL('../data/salto-api-fixture/',import.meta.url)})});
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const host='http://127.0.0.1:8002',AUTH='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:',DB='http://127.0.0.1:9000/';
const cuentas=[],resultados=[];const sala='salto-api-'+Date.now();
async function req(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok);return r.json();}
async function db(ruta,method='GET',data){const r=await fetch(DB+ruta+'.json?ns=demo-byepass-default-rtdb',{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});assert.ok(r.ok);return r.json();}
async function api(u,accion,extra={},origin=host){const r=await fetch(host+'/api/salto',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({token:u?.idToken,sala,accion,...extra})});return {status:r.status,...await r.json()};}
async function caso(n,fn){await fn();resultados.push(n);console.log('OK:',n);}
try{
 for(const nombre of ['Alex Memoria','Bea Memoria']){const u=await req(AUTH+'signUp?key=local',{email:`memoria-${Date.now()}-${cuentas.length}@example.test`,password:'PruebaLocal2026!',returnSecureToken:true});cuentas.push(u);await db('usuarios/'+u.localId,'PUT',{nombre,nacimiento:'1995-01-01',creado:Date.now()});}
 const [a,b]=cuentas;const p={name:'Prueba de memoria',fecha:'2026-11-09',lastRound:1,phase:'results',rounds:[{number:1,matches:[{p1:'Alex Memoria',p2:'Bea Memoria',table:1,result:'Empate'}]}]};await db('salas/'+sala+'/pairings','PUT',p);
 await caso('Rechaza token ausente y origen ajeno',async()=>{assert.equal((await api(null,'estado')).status,400);assert.equal((await api(a,'estado',{},'https://otro.example')).status,403);});
 let juego,ultimoEnvio;
 await caso('Inicia la pesca con la cuenta autenticada',async()=>{juego=await api(a,'iniciar',{uid:b.localId,puntos:999999});assert.equal(juego.status,200);assert.equal(juego.secuencia,0);assert.equal(juego.altura,0);});
 await caso('Otra cuenta no puede enviar movimientos sobre la partida',async()=>{assert.equal((await api(b,'impulsar',{id:juego.id,indice:0,secuencia:0})).status,400);});
 await caso('Cuatro impulsos calculados por servidor guardan altura e historial',async()=>{
  let ultimo;
  for(let n=0;n<4;n++){
   const objetivo=juego.inicioPaso+2100;
   await new Promise(r=>setTimeout(r,Math.max(0,objetivo-Date.now())));
   ultimo={id:juego.id,secuencia:juego.secuencia,uid:b.localId,altura:999999};
   juego=await api(a,'impulsar',ultimo);assert.equal(juego.status,200,JSON.stringify(juego));
   if(n===0){const repetido=await api(a,'impulsar',ultimo);assert.equal(repetido.secuencia,juego.secuencia);}
  }
  assert.ok(juego.terminada);assert.ok(juego.altura>100&&juego.altura<=10000);assert.equal(juego.resumen.mejor.altura,juego.altura);assert.equal(juego.resumen.partidas,1);
  assert.equal((await api(a,'impulsar',ultimo)).resumen.partidas,1);assert.equal((await api(b,'estado')).mejor,null);
 });
 await caso('Ranking optativo, marca personal persistente y retiro inmediato',async()=>{const r=await api(a,'preferencia',{publico:true});assert.ok(r.ranking.some(v=>v.nombre==='Alex Memoria'));assert.equal((await api(a,'estado')).mejor.altura,juego.altura);assert.ok((await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));await api(a,'preferencia',{publico:false});assert.ok(!(await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));});
 await caso('Nueva ronda invalida una aventura abierta',async()=>{
  const activa=await api(a,'iniciar');assert.equal(activa.status,200);
  assert.equal((await api(a,'impulsar',{id:activa.id,secuencia:-1})).status,400);
  const cambio=structuredClone(p);cambio.lastRound=2;cambio.rounds.push({...cambio.rounds[0],number:2});await db('salas/'+sala+'/pairings','PUT',cambio);
  assert.equal((await api(a,'impulsar',{id:activa.id,secuencia:0})).status,400);await db('salas/'+sala+'/pairings','PUT',p);
 });
 await caso('Resultado retirado impide iniciar otra partida',async()=>{p.rounds[0].matches[0].result='';await db('salas/'+sala+'/pairings','PUT',p);assert.equal((await api(a,'iniciar')).status,400);});
 await writeFile('data/salto-api-verification.json',JSON.stringify({fecha:new Date().toISOString(),resultados},null,2));
}finally{
 servidor.close();servidor.closeAllConnections();
 for(const u of cuentas){await db('usuarios/'+u.localId,'DELETE');await req(AUTH+'delete?key=local',{idToken:u.idToken});}
 await db('salas/'+sala,'DELETE');
 // Solo se retiran los registros de las identidades ficticias creadas por esta ejecución.
 try{const file='data/salto-api-fixture/resultados.json';const d=JSON.parse(await readFile(file,'utf8'));for(const u of cuentas)delete d[u.localId];await writeFile(file,JSON.stringify(d,null,2));}catch(e){if(e.code!=='ENOENT')throw e;}
}
