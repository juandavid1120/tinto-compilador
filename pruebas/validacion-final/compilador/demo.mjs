import { compilar } from '../../../compilador/compilar.js';
import { instruccionesATexto } from '../../../compilador/generador.js';
import { EJEMPLOS, RETOS } from '../../../web/ejemplos.js';
const cuad=['pintar rojo','repetir 4 veces:','avanzar 3','girar derecha','fin'].join('\n');
let r=compilar(cuad);
console.log('CUADRADO instr:',r.instrucciones.map(i=>i.op+' '+i.arg).join(', '));
console.log(instruccionesATexto(r.instrucciones).join(' | '));
console.log('pintadas',Object.keys(r.casillasPintadas).length, Object.keys(r.casillasPintadas).join(' '), 'colores',[...new Set(Object.values(r.casillasPintadas))], 'final',JSON.stringify(r.estadoFinal));
console.log('(0,0) pintada?', '0,0' in r.casillasPintadas, 'pasos mover',r.pasos.filter(p=>p.accion==='mover').length, 'total pasos', r.pasos.length);
console.log('pasos:',r.pasos.map(p=>p.accion==='mover'?`m${p.x},${p.y}`:p.accion==='girar'?`g:${p.direccion}`:p.accion==='contar'?`c${p.vueltas}`:p.accion==='volver'?`v${p.quedan}${p.salta?'S':''}`:`col:${p.color}`).join(' '));
for(const e of EJEMPLOS){
  const r=compilar(e.codigo);
  const fase=r.error?r.error.fase:null;
  console.log(`\n## ${e.id} "${e.frase}" [${e.etiqueta}] esperado=${e.esperado} obtenido=${fase} ${fase===e.esperado?'COINCIDE':'*** NO COINCIDE ***'}`);
  if(r.error) console.log('   ',r.error.mensaje,'| L',r.error.linea,'C',r.error.columna,'|',r.error.explicacion);
  else { console.log('    instr:',r.instrucciones.map(i=>i.op+' '+i.arg).join(', ')); console.log('    final',JSON.stringify(r.estadoFinal),'pintadas',Object.keys(r.casillasPintadas).length,Object.entries(r.casillasPintadas).map(([k,v])=>k+':'+v).join(' ')); }
}
console.log('\nRETOS');for(const t of RETOS) console.log(' ',t.id,'fase',t.fase,'|',t.pista);
// ejemplos de reto: L, escalera según la pista, inicial
const pruebas={ 'L (pista)':'avanzar 5\ngirar derecha\navanzar 3', 'retos escalera pista':'repetir 4 veces:\navanzar 1\ngirar derecha\navanzar 1\ngirar izquierda\nfin',
 'escalera 6 -> 12 casillas diagonales':EJEMPLOS[1].codigo, 'escalera 10':'repetir 10 veces:\navanzar 1\ngirar derecha\navanzar 1\ngirar izquierda\nfin' };
for(const [n,c] of Object.entries(pruebas)){const r=compilar(c);console.log(n,'->',r.error?r.error.mensaje:`final ${JSON.stringify(r.estadoFinal)} pint ${Object.keys(r.casillasPintadas).length}`)}
// orden de errores semánticos
for (const c of ['avanzar 99\navanzar 0','avanzar 99\nrepetir 101 veces:\nfin','repetir 101 veces:\nfin\navanzar 0','avanzar 99\nrepetir 0 veces:\nfin']){ const r=compilar(c); console.log(JSON.stringify(c),'->',r.error.mensaje); }
