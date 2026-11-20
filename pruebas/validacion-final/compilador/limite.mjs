import { compilar } from '../../../compilador/compilar.js';
for (const n of [9999,10000,10001]) { const r=compilar('pintar rojo\n'.repeat(n)); console.log(n,'lineas pintar ->',r.error?`[${r.error.fase}] L${r.error.linea} ${r.error.mensaje}`:`OK pasos=${r.pasos.length}`); }
// por ciclos: repetir 100 { repetir 49 {girar} } = 100+4900+4900=9900 ; añadir
for (const k of [100,101,102]) { const r=compilar(`repetir 100 veces:\nrepetir 49 veces:\ngirar derecha\nfin\nfin\n`+'pintar rojo\n'.repeat(k)); console.log('9900 + '+k+' pintar ->',r.error?`[${r.error.fase}] L${r.error.linea}`:`OK pasos=${r.pasos.length} instrucciones=${r.instrucciones.length}`);}
// pasos máximos de animación
const g=compilar('repetir 100 veces:\nrepetir 20 veces:\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\nfin\nfin');
console.log(g.error?g.error.mensaje:`pasos=${g.pasos.length}`);
// peor caso de pasos: avanzar 9 y volver
let mx=0; const prog='repetir 100 veces:\nrepetir 22 veces:\navanzar 9\ngirar derecha\ngirar derecha\navanzar 9\ngirar derecha\ngirar derecha\nfin\nfin'; const h=compilar(prog); console.log('peor',h.error?h.error.mensaje:`pasos=${h.pasos.length}`);
const t=Date.now(); for(let i=0;i<20;i++) compilar(prog); console.log('ms por compilar',(Date.now()-t)/20);
