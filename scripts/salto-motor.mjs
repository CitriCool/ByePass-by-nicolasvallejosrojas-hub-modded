import {randomUUID} from 'node:crypto';
export const DURACION_PASO = 3000;
export function crearSalto(uid,contexto,ahora=Date.now()) {
 return {id:randomUUID(),uid,contexto,inicio:ahora,paso:0,secuencia:0,inicioPaso:ahora+2200,precisiones:[],terminada:false};
}
export function precision(ahora,inicio) {
 const progreso=(ahora-inicio)/DURACION_PASO;
 return Math.max(0,Math.round(100-Math.abs(progreso-.72)/.28*100));
}
export function altura(precisiones) {
 if(precisiones.length<2)return 0;
 return Math.round((1+(precisiones[0]||0)*.24+precisiones.slice(1).reduce((a,b)=>a+b,0)*.25)*100);
}
export function verSalto(p,ahora=Date.now()) {
 return {id:p.id,paso:p.paso,secuencia:p.secuencia,inicioPaso:p.inicioPaso,servidorAhora:ahora,duracionPaso:DURACION_PASO,precisiones:[...p.precisiones],altura:altura(p.precisiones),terminada:p.terminada,duracion:p.terminada?p.duracion:Math.max(1,Math.floor((ahora-p.inicio)/1000))};
}
export function impulsar(p,uid,secuencia,ahora=Date.now()) {
 if(uid!==p.uid)throw Error('Esta partida pertenece a otra cuenta.');
 if(ahora-p.inicio>90000)throw Error('La partida venció. Inicia otra.');
 if(p.terminada)throw Error('La partida ya terminó.');
 if(secuencia!==p.secuencia||!Number.isInteger(secuencia))throw Error('Movimiento fuera de orden.');
 if(ahora<p.inicioPaso)throw Error('Espera a que comience el indicador.');
 p.precisiones.push(precision(ahora,p.inicioPaso));p.paso++;p.secuencia++;
 p.terminada=p.paso===4;p.inicioPaso=ahora+850;
 if(p.terminada)p.duracion=Math.max(1,Math.floor((ahora-p.inicio)/1000));
 return verSalto(p,ahora);
}
