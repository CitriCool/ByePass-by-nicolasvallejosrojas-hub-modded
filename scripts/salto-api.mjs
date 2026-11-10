import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {identidad,leer} from './memoria-api.mjs';
import {validarContexto} from './memoria-motor.mjs';
import {crearSalto,verSalto,impulsar} from './salto-motor.mjs';
export function crearSaltoApi({directorio=new URL('../data/salto/',import.meta.url)}={}){
const sesiones=new Map(),archivo=new URL('resultados.json',directorio);
let cola=Promise.resolve();
async function datos(){try{return JSON.parse(await readFile(archivo,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
function guardar(fn){const tarea=cola.then(async()=>{const d=await datos();fn(d);await mkdir(directorio,{recursive:true});const tmp=new URL('resultados.tmp',directorio);await writeFile(tmp,JSON.stringify(d,null,2));await rename(tmp,archivo);return d;});cola=tarea.catch(()=>{});return tarea;}
function resumen(d,u){const mio=d[u.uid]||{};return {publico:!!mio.publico,mejor:mio.mejor||null,ultimas:mio.ultimas||[],partidas:mio.partidas||0,ranking:Object.entries(d).filter(([,v])=>v.publico&&v.mejor).map(([uid,v])=>({nombre:v.nombre,altura:v.mejor.altura,duracion:v.mejor.duracion,tu:uid===u.uid})).sort((a,b)=>b.altura-a.altura||a.duracion-b.duracion||a.nombre.localeCompare(b.nombre)).slice(0,20)};}
return async function saltoApi(req,res){
 if(new URL(req.url,'http://localhost').pathname!=='/api/salto')return false;
 const enviar=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
 if(req.method!=='POST'){enviar(405,{error:'Método no permitido.'});return true;}
 if(req.headers.origin!==`http://127.0.0.1:${res.socket.localPort}`||!req.headers['content-type']?.startsWith('application/json')){enviar(403,{error:'Origen no permitido.'});return true;}
 try{
  let texto='';for await(const chunk of req){texto+=chunk;if(texto.length>16000)throw Error('Solicitud demasiado grande.');}
  const b=JSON.parse(texto),recibido=Date.now(),u=await identidad(b.token),sala=String(b.sala||'');
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(sala))throw Error('Sala inválida.');
  let d=await datos();
  if(b.accion==='estado')enviar(200,resumen(d,u));
  else if(b.accion==='preferencia'){
   if(typeof b.publico!=='boolean')throw Error('Preferencia inválida.');
   d=await guardar(d=>d[u.uid]={...d[u.uid],publico:b.publico,nombre:u.nombre});enviar(200,resumen(d,u));
  }else if(b.accion==='iniciar'){
   const contexto=validarContexto(await leer('salas/'+sala+'/pairings'),u.nombre);
   for(const [id,p] of sesiones)if(Date.now()-p.inicio>90000||p.uid===u.uid)sesiones.delete(id);
   if(sesiones.size>=1000)throw Error('Hay muchas partidas abiertas. Inténtalo más tarde.');
   const p=crearSalto(u.uid,{...contexto,sala});sesiones.set(p.id,p);enviar(200,verSalto(p));
  }else if(b.accion==='impulsar'){
   if(!Number.isInteger(b.secuencia)||b.secuencia<0)throw Error('Movimiento inválido.');
   const p=sesiones.get(b.id);if(!p||p.uid!==u.uid||p.contexto.sala!==sala)throw Error('Partida no disponible para esta cuenta.');
   if(Date.now()-p.inicio>90000)throw Error('La partida venció. Inicia otra.');
   const contexto=validarContexto(await leer('salas/'+sala+'/pairings'),u.nombre);
   if(contexto.clave!==p.contexto.clave){sesiones.delete(p.id);throw Error('Hay una nueva ronda. Revisa tus emparejamientos.');}
   if(p.guardando)throw Error('Espera la confirmación de tu resultado.');
   let estado;
   if(b.secuencia===p.secuencia-1)estado=verSalto(p);else {impulsar(p,u.uid,b.secuencia,recibido);estado=verSalto(p);}
   if(p.terminada){p.guardando=true;try{d=await guardar(d=>{const a=d[u.uid]||{};if((a.ultimas||[]).some(m=>m.id===p.id))return;
    const marca={id:p.id,altura:estado.altura,duracion:estado.duracion,precisiones:estado.precisiones,fecha:Date.now()};
    const mejor=!a.mejor||marca.altura>a.mejor.altura||marca.altura===a.mejor.altura&&marca.duracion<a.mejor.duracion?marca:a.mejor;
    d[u.uid]={...a,nombre:u.nombre,mejor,partidas:(a.partidas||0)+1,ultimas:[marca,...(a.ultimas||[])].slice(0,10)};
   });estado.resumen=resumen(d,u);}finally{p.guardando=false;}}
   enviar(200,estado);
  }else throw Error('Acción no permitida.');
 }catch(e){enviar(400,{error:e.message==='fetch failed'?'No se pudo conectar con los emuladores.':e.message});}
 return true;
}

}
export const saltoApi=crearSaltoApi();
