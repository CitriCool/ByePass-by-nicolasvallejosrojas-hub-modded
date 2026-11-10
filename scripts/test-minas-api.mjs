import {startServer} from './server.mjs';
import {crearMinasApi} from './minas-api.mjs';
import {crearCampo} from './minas-motor.mjs';
const crear=(uid,contexto)=>{const p=crearCampo(uid,contexto);p.minas=[30,31,32,33,34,35];p.inicio=Date.now();return p;};
const servidor=await startServer(8002,{apiMinas:crearMinasApi({directorio:new URL('../data/minas-api-fixture/',import.meta.url),crear})});
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const host='http://127.0.0.1:8002',AUTH='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:',DB='http://127.0.0.1:9000/';
const cuentas=[],resultados=[];const sala='minas-api-'+Date.now();
async function req(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok);return r.json();}
async function db(ruta,method='GET',data){const r=await fetch(DB+ruta+'.json?ns=demo-byepass-default-rtdb',{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});assert.ok(r.ok);return r.json();}
async function api(u,accion,extra={},origin=host){const r=await fetch(host+'/api/minas',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({token:u?.idToken,sala,accion,...extra})});return {status:r.status,...await r.json()};}
async function caso(n,fn){await fn();resultados.push(n);console.log('OK:',n);}
try{
 for(const nombre of ['Alex Memoria','Bea Memoria']){const u=await req(AUTH+'signUp?key=local',{email:`memoria-${Date.now()}-${cuentas.length}@example.test`,password:'PruebaLocal2026!',returnSecureToken:true});cuentas.push(u);await db('usuarios/'+u.localId,'PUT',{nombre,nacimiento:'1995-01-01',creado:Date.now()});}
 const [a,b]=cuentas;const p={name:'Prueba de memoria',fecha:'2026-11-09',lastRound:1,phase:'results',rounds:[{number:1,matches:[{p1:'Alex Memoria',p2:'Bea Memoria',table:1,result:'Empate'}]}]};await db('salas/'+sala+'/pairings','PUT',p);
 await caso('Rechaza token ausente y origen ajeno',async()=>{assert.equal((await api(null,'estado')).status,400);assert.equal((await api(a,'estado',{},'https://otro.example')).status,403);});
 let juego,ultimoEnvio;
 await caso('Campo inicia oculto y ligado a la cuenta',async()=>{juego=await api(a,'iniciar',{uid:b.localId,puntos:99999});assert.equal(juego.status,200);assert.ok(juego.casillas.every(c=>c.numero===null&&!c.mina));});
 await caso('Otra cuenta no puede descubrir las casillas ajenas',async()=>{assert.equal((await api(b,'mover',{id:juego.id,secuencia:0,indice:0,tipo:'destapar'})).status,400);});
 await caso('Banderas, limite y reintentos no duplican acciones',async()=>{
  const envio={id:juego.id,secuencia:0,indice:30,tipo:'bandera'};juego=await api(a,'mover',envio);assert.equal(juego.banderas,1);assert.equal((await api(a,'mover',envio)).secuencia,1);
  for(let i=31;i<36;i++)juego=await api(a,'mover',{id:juego.id,secuencia:juego.secuencia,indice:i,tipo:'bandera'});
  assert.equal(juego.banderas,6);assert.equal((await api(a,'mover',{id:juego.id,secuencia:juego.secuencia,indice:29,tipo:'bandera'})).status,400);
  juego=await api(a,'mover',{id:juego.id,secuencia:juego.secuencia,indice:35,tipo:'bandera'});assert.equal(juego.banderas,5);
 });
 await caso('Victoria guarda puntos del servidor y un solo historial',async()=>{
  const envio={id:juego.id,secuencia:juego.secuencia,indice:0,tipo:'destapar',puntos:99999,uid:b.localId};juego=await api(a,'mover',envio);
  assert.equal(juego.ganada,true);assert.ok(juego.puntos>0&&juego.puntos<=1000);assert.equal(juego.resumen.mejor.puntos,juego.puntos);assert.equal(juego.resumen.partidas,1);assert.equal((await api(a,'mover',envio)).resumen.partidas,1);assert.equal((await api(b,'estado')).mejor,null);
 });
 await caso('Ranking optativo, marca personal persistente y retiro inmediato',async()=>{const r=await api(a,'preferencia',{publico:true});assert.ok(r.ranking.some(v=>v.nombre==='Alex Memoria'));assert.equal((await api(a,'estado')).mejor.puntos,juego.puntos);assert.ok((await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));await api(a,'preferencia',{publico:false});assert.ok(!(await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));});
 await caso('Perder no reemplaza la mejor victoria',async()=>{
  const anterior=await api(a,'estado');let p2=await api(a,'iniciar');p2=await api(a,'mover',{id:p2.id,secuencia:p2.secuencia,indice:29,tipo:'destapar'});p2=await api(a,'mover',{id:p2.id,secuencia:p2.secuencia,indice:35,tipo:'destapar'});
  assert.equal(p2.ganada,false);assert.equal(p2.puntos,0);assert.deepEqual(p2.resumen.mejor,anterior.mejor);assert.equal(p2.resumen.partidas,2);
 });
 await caso('Nueva ronda invalida una aventura abierta',async()=>{
  const activa=await api(a,'iniciar');assert.equal(activa.status,200);
  assert.equal((await api(a,'mover',{id:activa.id,secuencia:-1,indice:0,tipo:'destapar'})).status,400);
  const cambio=structuredClone(p);cambio.lastRound=2;cambio.rounds.push({...cambio.rounds[0],number:2});await db('salas/'+sala+'/pairings','PUT',cambio);
  assert.equal((await api(a,'mover',{id:activa.id,secuencia:0,indice:0,tipo:'destapar'})).status,400);await db('salas/'+sala+'/pairings','PUT',p);
 });
 await caso('Resultado retirado impide iniciar otra partida',async()=>{p.rounds[0].matches[0].result='';await db('salas/'+sala+'/pairings','PUT',p);assert.equal((await api(a,'iniciar')).status,400);});
 await writeFile('data/minas-api-verification.json',JSON.stringify({fecha:new Date().toISOString(),resultados},null,2));
}finally{
 servidor.close();servidor.closeAllConnections();
 for(const u of cuentas){await db('usuarios/'+u.localId,'DELETE');await req(AUTH+'delete?key=local',{idToken:u.idToken});}
 await db('salas/'+sala,'DELETE');
 // Solo se retiran los registros de las identidades ficticias creadas por esta ejecución.
 try{const file='data/minas-api-fixture/resultados.json';const d=JSON.parse(await readFile(file,'utf8'));for(const u of cuentas)delete d[u.localId];await writeFile(file,JSON.stringify(d,null,2));}catch(e){if(e.code!=='ENOENT')throw e;}
}
