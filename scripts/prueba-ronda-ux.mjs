import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
const url='http://127.0.0.1:9000/salas/tienda-test/pairings.json?ns=demo-byepass-default-rtdb';
if(process.argv[2]==='avanzar'){
 const p=await (await fetch(url)).json();assert.equal(p.name,'Verificación local');await writeFile('data/ux-pairings-previos.json',JSON.stringify(p));
 const ronda={number:p.lastRound+1,matches:p.rounds.at(-1).matches.map(m=>({...m,result:''}))};p.rounds.push(ronda);p.lastRound=ronda.number;p.phase='paired';p.updatedAt=Date.now();
 assert.ok((await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).ok);
}else if(process.argv[2]==='restaurar'){
 const body=await readFile('data/ux-pairings-previos.json','utf8');assert.equal(JSON.parse(body).name,'Verificación local');assert.ok((await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body})).ok);
}else throw Error('Acción desconocida');
console.log('Escenario local:',process.argv[2]);
