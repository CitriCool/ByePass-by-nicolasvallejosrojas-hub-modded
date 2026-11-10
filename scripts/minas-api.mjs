import {identidad,leer} from './memoria-api.mjs';
import {validarContexto,mejorMarca} from './memoria-motor.mjs';
import {crearAlmacen} from './juego-almacen.mjs';
import {crearCampo,verCampo,jugarCampo} from './minas-motor.mjs';
export function crearMinasApi({directorio=new URL('../data/minas/',import.meta.url),crear=crearCampo}={}){
 const sesiones=new Map(),almacen=crearAlmacen(directorio);
 function resumen(d,u){const mio=d[u.uid]||{};return {publico:!!mio.publico,mejor:mio.mejor||null,partidas:mio.partidas||0,ultimas:mio.ultimas||[],ranking:Object.entries(d).filter(([,v])=>v.publico&&v.mejor).map(([uid,v])=>({nombre:v.nombre,puntos:v.mejor.puntos,duracion:v.mejor.duracion,tu:uid===u.uid})).sort((a,b)=>b.puntos-a.puntos||a.duracion-b.duracion||a.nombre.localeCompare(b.nombre)).slice(0,20)};}
 return async function minasApi(req,res){
  if(new URL(req.url,'http://localhost').pathname!=='/api/minas')return false;
  const enviar=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  if(req.method!=='POST'){enviar(405,{error:'Método no permitido.'});return true;}
  if(req.headers.origin!==`http://127.0.0.1:${res.socket.localPort}`||!req.headers['content-type']?.startsWith('application/json')){enviar(403,{error:'Origen no permitido.'});return true;}
  try{
   let texto='';for await(const c of req){texto+=c;if(texto.length>16000)throw Error('Solicitud demasiado grande.');}
   const b=JSON.parse(texto),u=await identidad(b.token),sala=String(b.sala||'');if(!/^[A-Za-z0-9_-]{1,80}$/.test(sala))throw Error('Sala inválida.');
   let d=await almacen.leer();
   if(b.accion==='estado')enviar(200,resumen(d,u));
   else if(b.accion==='preferencia'){
    if(typeof b.publico!=='boolean')throw Error('Preferencia inválida.');d=await almacen.editar(d=>d[u.uid]={...d[u.uid],publico:b.publico,nombre:u.nombre});enviar(200,resumen(d,u));
   }else if(b.accion==='iniciar'){
    const contexto=validarContexto(await leer('salas/'+sala+'/pairings'),u.nombre);
    for(const [id,p] of sesiones)if(p.uid===u.uid||Date.now()-p.creado>900000)sesiones.delete(id);
    if(sesiones.size>=1000)throw Error('Hay muchas partidas abiertas. Inténtalo más tarde.');const p=crear(u.uid,{...contexto,sala});sesiones.set(p.id,p);enviar(200,verCampo(p));
   }else if(b.accion==='mover'){
    const p=sesiones.get(b.id);if(!p||p.uid!==u.uid||p.contexto.sala!==sala)throw Error('Partida no disponible para esta cuenta.');
    if(Date.now()-p.creado>900000)throw Error('La partida venció.');
    const contexto=validarContexto(await leer('salas/'+sala+'/pairings'),u.nombre);if(contexto.clave!==p.contexto.clave){sesiones.delete(p.id);throw Error('Hay una nueva ronda. Revisa tu mesa.');}
    if(p.guardando)throw Error('Espera la confirmación del guardado.');
    if(!Number.isInteger(b.secuencia)||b.secuencia<0)throw Error('Movimiento inválido.');
    let estado;
    if(b.secuencia===p.secuencia-1&&p.ultimo?.indice===b.indice&&p.ultimo?.tipo===b.tipo)estado=verCampo(p);
    else{estado=jugarCampo(p,u.uid,b.secuencia,b.indice,b.tipo);p.ultimo={indice:b.indice,tipo:b.tipo};}
    if(p.terminada){p.guardando=true;try{d=await almacen.editar(d=>{const a=d[u.uid]||{};if((a.ultimas||[]).some(m=>m.id===p.id))return;
     const marca={id:p.id,puntos:p.puntos,duracion:p.duracion,ganada:p.ganada,movimientos:p.movimientos,fecha:Date.now()};
     d[u.uid]={...a,nombre:u.nombre,mejor:p.ganada?mejorMarca(a.mejor,marca):a.mejor||null,partidas:(a.partidas||0)+1,ultimas:[marca,...(a.ultimas||[])].slice(0,10)};
    });estado.resumen=resumen(d,u);}finally{p.guardando=false;}}
    enviar(200,estado);
   }else throw Error('Acción no permitida.');
  }catch(e){enviar(400,{error:e.message==='fetch failed'?'No se pudo conectar con los emuladores.':e.message});}
  return true;
 };
}
export const minasApi=crearMinasApi();
