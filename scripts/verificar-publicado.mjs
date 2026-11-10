import { readFile, writeFile } from 'node:fs/promises';
// El mod no incluye el CNAME del sitio original: se consulta el dominio publicado de forma explícita.
const host='byepass.cl';
const resultados=[];
for(const ruta of ['/admin.html','/cuenta.html']){
 try {
  const r=await fetch('https://'+host+ruta,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(15000)});
  const cabeceras=Object.fromEntries(['content-security-policy','x-frame-options','x-content-type-options','referrer-policy','strict-transport-security','server'].map(k=>[k,r.headers.get(k)]));
  const protegeMarco=!!cabeceras['x-frame-options'] || /frame-ancestors/.test(cabeceras['content-security-policy'] || '');
  resultados.push({ruta,status:r.status,cabeceras,protegeMarco});
 } catch(e){resultados.push({ruta,error:e.message});}
}
await writeFile('data/cabeceras-publicadas.json',JSON.stringify({fecha:new Date().toISOString(),dominio:host,metodo:'HEAD, sin autenticar ni consultar Firebase',resultados},null,2));
console.log(JSON.stringify(resultados,null,2));
