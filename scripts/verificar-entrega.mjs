import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import http from 'node:http';
import { startServer } from './server.mjs';
const server=await startServer(8002), resultados=[];
try {
 for(const pagina of ['admin','cuenta','muro','staff','herramientas','estadisticas']){
  const r=await fetch(`http://127.0.0.1:8002/${pagina}.html`);assert.equal(r.status,200);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'self'"));
 } resultados.push('Cabeceras locales de seis páginas con sesión');
 const request=headers=>new Promise((resolve,reject)=>http.get('http://127.0.0.1:8002/rulings.json',{headers},r=>{const chunks=[];r.on('data',b=>chunks.push(b));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));}).on('error',reject));
 const r=await request({'accept-encoding':'br'});assert.equal(r.headers['content-encoding'],'br');assert.equal((await request({'if-none-match':r.headers.etag})).status,304);
 const body=await readFile('web/rulings.json');let inicio=performance.now();const datos=JSON.parse(body);const parseMs=performance.now()-inicio;
 inicio=performance.now();const ordenada=[...datos.rulings].sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));const sortMs=performance.now()-inicio;
 const medicion={bytesOriginales:body.length,bytesGzip:gzipSync(body).length,bytesBrotli:r.body.length,parseMs,sortMs,registros:ordenada.length,entorno:'Node local; no sustituye medición en celular'};
 resultados.push('Compresión Brotli y caché condicional HTTP 304');
 await writeFile('data/entrega-verification.json',JSON.stringify({fecha:new Date().toISOString(),resultados,medicion},null,2)); console.log(JSON.stringify({resultados,medicion},null,2));
} finally {server.close();server.closeAllConnections();}
