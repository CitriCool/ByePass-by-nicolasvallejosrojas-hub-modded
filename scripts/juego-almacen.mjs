import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
export function crearAlmacen(directorio){
 const archivo=new URL('resultados.json',directorio);let cola=Promise.resolve();
 async function leer(){try{return JSON.parse(await readFile(archivo,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
 function editar(fn){const tarea=cola.then(async()=>{const d=await leer();fn(d);await mkdir(directorio,{recursive:true});const tmp=new URL('resultados.tmp',directorio);await writeFile(tmp,JSON.stringify(d,null,2));await rename(tmp,archivo);return d;});cola=tarea.catch(()=>{});return tarea;}
 return {leer,editar};
}
