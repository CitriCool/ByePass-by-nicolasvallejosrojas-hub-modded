import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const host='http://127.0.0.1:8001',AUTH='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:',DB='http://127.0.0.1:9000/';
const cuentas=[],resultados=[];const sala='memoria-api-'+Date.now();
async function req(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok);return r.json();}
async function db(ruta,method='GET',data){const r=await fetch(DB+ruta+'.json?ns=demo-byepass-default-rtdb',{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});assert.ok(r.ok);return r.json();}
async function api(u,accion,extra={},origin=host){const r=await fetch(host+'/api/memoria',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({token:u?.idToken,sala,accion,...extra})});return {status:r.status,...await r.json()};}
async function caso(n,fn){await fn();resultados.push(n);console.log('OK:',n);}
try{
 for(const nombre of ['Alex Memoria','Bea Memoria']){const u=await req(AUTH+'signUp?key=local',{email:`memoria-${Date.now()}-${cuentas.length}@example.test`,password:'PruebaLocal2026!',returnSecureToken:true});cuentas.push(u);await db('usuarios/'+u.localId,'PUT',{nombre,nacimiento:'1995-01-01',creado:Date.now()});}
 const [a,b]=cuentas;const p={name:'Prueba de memoria',fecha:'2026-11-09',lastRound:1,phase:'results',rounds:[{number:1,matches:[{p1:'Alex Memoria',p2:'Bea Memoria',table:1,result:'Empate'}]}]};await db('salas/'+sala+'/pairings','PUT',p);
 await caso('Rechaza token ausente y origen ajeno',async()=>{assert.equal((await api(null,'estado')).status,400);assert.equal((await api(a,'estado',{},'https://otro.example')).status,403);});
 let juego,ultimoEnvio;
 await caso('Inicia con la cuenta y no revela el tablero',async()=>{juego=await api(a,'iniciar',{uid:b.localId,puntos:999999});assert.equal(juego.status,200);assert.equal(juego.cartas.filter(c=>c.tipo!==null).length,0);});
 await caso('Otra cuenta no puede enviar movimientos sobre la partida',async()=>{assert.equal((await api(b,'voltear',{id:juego.id,indice:0,secuencia:0})).status,400);});
 await caso('Reintentar una respuesta perdida no duplica el movimiento',async()=>{const envio={id:juego.id,indice:0,secuencia:0};juego=await api(a,'voltear',envio);const otra=await api(a,'voltear',envio);assert.equal(otra.secuencia,juego.secuencia);assert.equal(otra.intento,0);});
 await caso('Partida completa guarda una marca del servidor sin aceptar puntos ni UID del cliente',async()=>{
  const memoria=new Map();juego.cartas.forEach(c=>{if(c.tipo!==null)memoria.set(c.indice,c.tipo);});
  for(let n=0;n<80&&!juego.terminada;n++){
   if(juego.abiertas.length===2)await new Promise(r=>setTimeout(r,1000));
   const resueltos=new Set(juego.parejasTipos),abierta=juego.abiertas.length===1?juego.abiertas[0]:null;
   const libres=Array.from({length:12},(_,i)=>i).filter(i=>!resueltos.has(memoria.get(i))&&i!==abierta);
   let i;
   if(abierta!==null)i=libres.find(i=>memoria.has(i)&&memoria.get(i)===memoria.get(abierta))??libres.find(i=>!memoria.has(i))??libres[0];
   else {const pareja=libres.find(i=>memoria.has(i)&&libres.some(j=>j!==i&&memoria.get(i)===memoria.get(j)));i=pareja??libres.find(i=>!memoria.has(i))??libres[0];}
   ultimoEnvio={id:juego.id,indice:i,secuencia:juego.secuencia,uid:b.localId,puntos:999999};juego=await api(a,'voltear',ultimoEnvio);assert.equal(juego.status,200,JSON.stringify(juego));juego.cartas.forEach(c=>{if(c.tipo!==null)memoria.set(c.indice,c.tipo);});
  }
  assert.ok(juego.terminada);assert.ok(juego.puntos<=1000);assert.equal(juego.resumen.mejor.puntos,juego.puntos);assert.equal(juego.resumen.nombre,'Alex Memoria');assert.equal(juego.resumen.publico,false);assert.equal(juego.resumen.partidas,1);assert.equal(juego.resumen.ultimas.length,1);const reintento=await api(a,'voltear',ultimoEnvio);assert.equal(reintento.resumen.partidas,1);assert.equal((await api(b,'estado')).mejor,null);
 });
 await caso('Ranking optativo, marca personal persistente y retiro inmediato',async()=>{const r=await api(a,'preferencia',{publico:true});assert.ok(r.ranking.some(v=>v.nombre==='Alex Memoria'));assert.equal((await api(a,'estado')).mejor.puntos,juego.puntos);assert.ok((await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));await api(a,'preferencia',{publico:false});assert.ok(!(await api(b,'estado')).ranking.some(v=>v.nombre==='Alex Memoria'));});
 await caso('Resultado retirado impide iniciar otra partida',async()=>{p.rounds[0].matches[0].result='';await db('salas/'+sala+'/pairings','PUT',p);assert.equal((await api(a,'iniciar')).status,400);});
 await writeFile('data/memoria-api-verification.json',JSON.stringify({fecha:new Date().toISOString(),resultados},null,2));
}finally{
 for(const u of cuentas){await db('usuarios/'+u.localId,'DELETE');await req(AUTH+'delete?key=local',{idToken:u.idToken});}
 await db('salas/'+sala,'DELETE');
 // Solo se retiran los registros de las identidades ficticias creadas por esta ejecución.
 try{const file='data/memoria/resultados.json';const d=JSON.parse(await readFile(file,'utf8'));for(const u of cuentas)delete d[u.localId];await writeFile(file,JSON.stringify(d,null,2));}catch(e){if(e.code!=='ENOENT')throw e;}
}
