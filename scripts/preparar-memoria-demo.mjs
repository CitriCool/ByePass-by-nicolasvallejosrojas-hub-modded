const base='http://127.0.0.1:9000/salas/memoria-cuentas-demo.json?ns=demo-byepass-default-rtdb';
const anterior=await (await fetch(base)).json();
if(anterior && anterior.pairings?.name!=='Memorice Pokemon de prueba')throw Error('La sala contiene otros datos; no se modifica.');
const dato={nombre:'Memorice de prueba',pairings:{name:'Memorice Pokemon de prueba',fecha:'2026-11-09',lastRound:1,phase:'results',updatedAt:Date.now(),rounds:[{number:1,matches:[{p1:'Organizador de pruebas',p2:'Jugador de pruebas',table:1,result:'Empate'}]}]}};
const r=await fetch(base,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(dato)});if(!r.ok)throw Error('No se pudo preparar la sala local.');console.log('Sala ficticia lista: memoria-cuentas-demo');
