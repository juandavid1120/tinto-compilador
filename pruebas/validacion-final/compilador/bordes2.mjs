import { compilar } from '../../../compilador/compilar.js';
const show=(n,c)=>{let r;const t=Date.now();try{r=compilar(c)}catch(e){console.log(`## ${n}: EXCEPCION ${e.constructor.name}: ${e.message}`);return}
 const e=r.error;console.log(`## ${n} (${Date.now()-t}ms): ${e?`[${e.fase}] L${e.linea} C${e.columna} ${e.mensaje}`:`OK pasos=${r.pasos?.length} vacio=${r.vacio}`}`)};
const nest=(n,body='girar derecha')=>'repetir 1 veces:\n'.repeat(n)+body+'\n'+'fin\n'.repeat(n);
show('50 anidados',nest(50)); show('51 anidados',nest(51)); show('51 sin cerrar','repetir 1 veces:\n'.repeat(51));
show('100000 avanzar 1','avanzar 1\n'.repeat(100000));
show('1M de lineas vacias','\n'.repeat(1000000));
show('5MB basura','x'.repeat(5_000_000));
show('null',null);show('undefined',undefined);show('numero',123);show('objeto',{});
// lineas con CRLF y lineas vacias
show('crlf error L4','pintar rojo\r\n\r\n\r\navanzar @\r\n');
show('crlf+vacias semantico L5','pintar rojo\r\n\r\n   \r\n\t\r\navanzar 99\r\n');
show('cr solo L3','pintar rojo\ravanzar 1\ravanzar @');
show('crcrlf mix','a\r\r\nb');
show('crlf fin L2 col','avanzar\r\n'); show('lf fin L2 col','avanzar\n');
show('repetir sin fin L3 con vacias','pintar rojo\n\n   repetir 3 veces:\n avanzar 1\n');
show('tab col','\t\tavanzar @');
show('palabra 5000 letras','a'.repeat(5000));
for (const c of ['avanzar\r\n','avanzar\n']) { const r=compilar(c); console.log(JSON.stringify(r.error.columna)); }
const r=compilar('avanzar 3'); console.log(JSON.stringify(r.error.mensaje), [...r.error.mensaje].map(x=>x.codePointAt(0).toString(16)).slice(-4));
// ejecutor directo con instrucciones inconsistentes
import {ejecutar} from '../../../compilador/ejecutor.js';
try{console.log(ejecutar([{op:'VOLVER',arg:0}]))}catch(e){console.log('ejecutor VOLVER sin CONTAR:',e.constructor.name,e.message)}
