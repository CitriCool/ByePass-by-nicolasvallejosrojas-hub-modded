import {randomInt,randomUUID} from 'node:crypto';
export const LADO=6,MINAS=6;
export function vecinos(i){const x=i%LADO,y=Math.floor(i/LADO),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if((dx||dy)&&nx>=0&&nx<LADO&&ny>=0&&ny<LADO)out.push(ny*LADO+nx);}return out;}
export function crearCampo(uid,contexto,ahora=Date.now()){return {id:randomUUID(),uid,contexto,creado:ahora,inicio:null,minas:null,abiertas:[],banderas:[],secuencia:0,terminada:false,ganada:false,movimientos:0};}
export function sembrar(p,primera,azar=randomInt){const zona=new Set([primera,...vecinos(primera)]),opciones=Array.from({length:LADO*LADO},(_,i)=>i).filter(i=>!zona.has(i));for(let i=opciones.length-1;i>0;i--){const j=azar(i+1);[opciones[i],opciones[j]]=[opciones[j],opciones[i]];}p.minas=opciones.slice(0,MINAS);}
export function verCampo(p,ahora=Date.now()){return {id:p.id,lado:LADO,minas:MINAS,secuencia:p.secuencia,movimientos:p.movimientos,banderas:p.banderas.length,terminada:p.terminada,ganada:p.ganada,puntos:p.puntos||0,duracion:p.terminada?p.duracion:p.inicio===null?0:Math.floor((ahora-p.inicio)/1000),casillas:Array.from({length:LADO*LADO},(_,i)=>({indice:i,abierta:p.abiertas.includes(i),bandera:p.banderas.includes(i),mina:p.terminada&&p.minas?.includes(i)||false,numero:p.abiertas.includes(i)?vecinos(i).filter(v=>p.minas.includes(v)).length:null,exploto:p.exploto===i}))};}
export function jugarCampo(p,uid,secuencia,indice,accion,ahora=Date.now()){
 if(uid!==p.uid)throw Error('La partida pertenece a otra cuenta.');
 if(ahora-p.creado>15*60*1000)throw Error('La partida venció. Inicia otra.');
 if(p.terminada)throw Error('Esta partida ya terminó.');
 if(secuencia!==p.secuencia||!Number.isInteger(secuencia)||!Number.isInteger(indice)||indice<0||indice>=LADO*LADO||!['destapar','bandera'].includes(accion))throw Error('Movimiento inválido.');
 if(p.abiertas.includes(indice))throw Error('Esta casilla ya está abierta.');
 if(accion==='bandera'){
  if(p.banderas.includes(indice))p.banderas=p.banderas.filter(i=>i!==indice);else {if(p.banderas.length===MINAS)throw Error('Ya marcaste las seis banderas.');p.banderas.push(indice);}
 }else{
  if(p.banderas.includes(indice))throw Error('Quita la bandera antes de destapar esta casilla.');
  if(p.minas===null){sembrar(p,indice);p.inicio=ahora;}
  if(p.minas.includes(indice)){p.exploto=indice;p.terminada=true;}
  else{
   const cola=[indice],visitadas=new Set(p.abiertas);
   while(cola.length){const i=cola.pop();if(visitadas.has(i)||p.banderas.includes(i)||p.minas.includes(i))continue;visitadas.add(i);if(!vecinos(i).some(v=>p.minas.includes(v)))cola.push(...vecinos(i));}
   p.abiertas=[...visitadas];if(p.abiertas.length===LADO*LADO-MINAS){p.terminada=true;p.ganada=true;p.banderas=[...p.minas];}
  }
 }
 p.secuencia++;p.movimientos++;
 if(p.terminada){p.duracion=Math.max(1,Math.floor((ahora-p.inicio)/1000));p.puntos=p.ganada?Math.max(100,1000-p.duracion*3):0;}
 return verCampo(p,ahora);
}
