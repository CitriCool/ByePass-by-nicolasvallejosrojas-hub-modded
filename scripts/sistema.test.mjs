import test from 'node:test';
import assert from 'node:assert/strict';
import { planPublicacion, aplicarRutas } from '../web/admin-publicacion.js';
import { procesarEvento } from '../functions/eventos.mjs';
test('Publica exactamente el estado siguiente sin mutar el torneo original',()=>{
 const t={ronda:{1:{mesas:[{a:'a',b:'b'}]}}}; const rutas={'salas/x/torneo/ronda/1/mesas/0/r':1};
 const p=planPublicacion(t,rutas,'salas/x',n=>({resultado:n.ronda[1].mesas[0].r}));
 assert.equal(p['salas/x/pairings'].resultado,1); assert.equal(t.ronda[1].mesas[0].r,undefined);
});
test('Quitar la última ronda borra la publicación en la misma operación',()=>{
 const p=planPublicacion({ronda:{1:{mesas:[]}}},{'salas/x/torneo/ronda/1':null},'salas/x',()=>{throw Error();});assert.equal(p['salas/x/pairings'],null);
});
test('Soporta reemplazar el torneo completo y rutas de otros nodos',()=>{
 assert.deepEqual(aplicarRutas(null,{'salas/x/torneo':{nombre:'Nuevo'},'jugadores/a':true},'salas/x'),{nombre:'Nuevo'});
});
test('Reintentar un evento no duplica notificaciones y conserva destinatarios únicos',async()=>{
 const out=new Map();const io={existe:async id=>out.has(id),guardar:async(id,v)=>out.set(id,v)};
 const e={id:'evento-1',tipo:'inscripcion',destinatarios:['a','a','b'],creado:1};
 assert.equal(await procesarEvento(e,io),2);assert.equal(await procesarEvento(e,io),0);assert.equal(out.size,2);
});
test('Fallo al guardar notificaciones puede reanudarse sin perder destinatarios',async()=>{
 const out=new Map();let falla=true;const io={existe:async id=>out.has(id),guardar:async(id,v)=>{if(v.uid==='b'&&falla){falla=false;throw Error('Sin conexión');}out.set(id,v);}};
 const e={id:'evento-2',tipo:'staff',destinatarios:['a','b'],creado:1};await assert.rejects(procesarEvento(e,io));assert.equal(await procesarEvento(e,io),1);
});

import { rondasDe } from '../web/torneo.js';
test('Firebase puede devolver rondas como arreglo con posiciones nulas',()=>{ assert.equal(rondasDe({ronda:[null,{mesas:[{a:'a'}]}]}).length,1); });
