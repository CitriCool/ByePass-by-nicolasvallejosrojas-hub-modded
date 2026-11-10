import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './server.mjs';
async function listar(dir){ const out=[]; for(const e of await readdir(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...await listar(p)); else if(/\.(html|js|css)$/.test(p)) out.push(p); } return out.sort(); }
const archivos=await listar(path.join(root,'web'));
const normalizar=s=>s.replace(/\?v=[a-zA-Z0-9.-]+/g,'?v=BUILD');
const datos=await Promise.all(archivos.map(p=>readFile(p,'utf8')));
const version=createHash('sha256').update(datos.map(normalizar).join('\n')).digest('hex').slice(0,12);
for(let i=0;i<archivos.length;i++){
 let s=datos[i].replace(/([\w./-]+\.(?:js|css))\?v=[a-zA-Z0-9.-]+/g,`$1?v=${version}`);
 s=s.replace(/(["'])(\.\/)?(admin-panel|admin-publicacion|errores|inscripcion-datos)\.js\1/g,`$1$2$3.js?v=${version}$1`);
 await writeFile(archivos[i],s);
}
await writeFile(path.join(root,'data/assets-version.json'),JSON.stringify({version},null,2)); console.log('Versión de recursos:',version);
