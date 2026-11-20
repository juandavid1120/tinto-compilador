import { compilar } from '../../compilador/compilar.js';
const f = (x) => (x.error ? `${x.error.fase}: ${x.error.mensaje}` : `ok, ${x.pasos.length} pasos, ${new Set(x.pasos.filter(p=>p.accion==='mover').map(p=>p.x+','+p.y)).size} casillas distintas`);
console.log('crlf', f(compilar('pintar rojo\r\nrepetir 4 veces:\r\n  avanzar 3\r\n  girar derecha\r\nfin')));
console.log('tabs', f(compilar('pintar rojo\nrepetir 4 veces:\n\tavanzar 3\n\tgirar derecha\nfin')));
console.log('solo CR', f(compilar('pintar rojo\rrepetir 4 veces:\r  avanzar 3\r  girar derecha\rfin')));
console.log('ref', f(compilar('pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin')));
