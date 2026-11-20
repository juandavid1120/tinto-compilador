import { compilar } from '../../../compilador/compilar.js';
const prog='repetir 100 veces:\nrepetir 14 veces:\navanzar 9\ngirar derecha\ngirar derecha\navanzar 9\ngirar derecha\ngirar derecha\nfin\nfin';
const t=Date.now(); const h=compilar(prog); console.log(h.error?h.error.mensaje:`pasos=${h.pasos.length} mover=${h.pasos.filter(p=>p.accion==='mover').length} ms=${Date.now()-t}`);
