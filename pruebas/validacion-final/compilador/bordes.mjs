import { compilar } from '../../../compilador/compilar.js';
const casos = [
 ['avanzar 0','avanzar 0'],['avanzar -1','avanzar -1'],['repetir 0','repetir 0 veces:\navanzar 1\nfin'],
 ['repetir 101','repetir 101 veces:\ngirar derecha\nfin'],['repetir 100 ok','repetir 100 veces:\ngirar derecha\nfin'],
 ['repetir 100 con avanzar 1 ida y vuelta','repetir 100 veces:\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\navanzar 1\ngirar derecha\nfin'],
 ['fin suelto','fin'],['fin suelto tras prog','avanzar 1\nfin'],['repetir sin fin','repetir 2 veces:\navanzar 1'],
 ['dos instr en linea','avanzar 1 girar derecha'],['vacio',''],['solo espacios','   \n\t\n  '],
 ['tabs','pintar\trojo\n\trepetir\t4\tveces:\n\t\tavanzar\t3\n\t\tgirar\tderecha\n\tfin'],
 ['crlf','pintar rojo\r\nrepetir 4 veces:\r\n  avanzar 3\r\n  girar derecha\r\nfin\r\n'],
 ['cr solo','pintar rojo\rrepetir 4 veces:\r avanzar 3\r girar derecha\rfin'],
 ['mayus','PINTAR ROJO\nREPETIR 4 VECES:\nAvanzar 3\nGIRAR Derecha\nFIN'],
 ['tilde','avanzár 3'],['eñe','año 3'],['emoji','avanzar 🚀'],['emoji2 familia','avanzar 👨‍👩‍👧'],
 ['sin salto final','avanzar 3'],['gigante','avanzar 99999999999999999999999'],
 ['gigante 400 digitos','avanzar '+'9'.repeat(400)],['repetir gigante','repetir '+'9'.repeat(400)+' veces:\nfin'],
 ['ceros a la izq','avanzar 007'],['4veces','repetir 4veces:\navanzar 1\nfin'],
 ['nbsp','avanzar 3'],['BOM','﻿avanzar 3'],['tab unicode line sep','avanzar 3 girar derecha'],
 ['coma','avanzar 3,'],['punto y coma','avanzar 3;'],['comillas','avanzar "3"'],
 ['dos puntos suelto','avanzar 3 :'],['repetir sin dospuntos fin archivo','repetir 3 veces'],
 ['repetir 3 veces: en misma linea','repetir 3 veces: avanzar 1\nfin'],
 ['repetir vacio','repetir 3 veces:\nfin'],['repetir anidado vacio 100x100x100','repetir 100 veces:\nrepetir 100 veces:\nrepetir 100 veces:\nfin\nfin\nfin'],
 ['3x100 girar','repetir 100 veces:\nrepetir 100 veces:\nrepetir 100 veces:\ngirar derecha\nfin\nfin\nfin'],
 ['mas del borde 10','avanzar 10'],['borde 9','avanzar 9'],['arriba','girar izquierda\navanzar 1'],
 ['izq','girar derecha\ngirar derecha\navanzar 1'],
 ['palabra con digito','avanzar 3a'],['solo numero','3'],['solo fin','FIN'],['solo dospuntos',':'],
 ['veces suelto','veces'],['color suelto','rojo'],['pintar sin color','pintar'],['pintar numero','pintar 3'],
 ['girar arriba','girar arriba'],['avanzar derecha','avanzar derecha'],
 ['avanzar 1.5','avanzar 1.5'],['avanzar 1e3','avanzar 1e3'],['hex','avanzar 0x3'],
 ['unicode digit arabic','avanzar ٣'],['fullwidth','avanzar ３'],
 ['null char','avanzar \u00003'],['ç','avanzar ç'],['guion bajo','avanzar_3'],
 ['10000 exacto','repetir 100 veces:\nrepetir 49 veces:\ngirar derecha\nfin\nfin'],
];
for (const [n,c] of casos) {
  let r; try { r = compilar(c); } catch(e){ console.log(`## ${n}\n  EXCEPCION ${e.constructor.name}: ${e.message}`); continue; }
  const e = r.error;
  console.log(`## ${n}\n  -> ${e ? `[${e.fase}] L${e.linea} C${e.columna} :: ${e.mensaje}\n     expl: ${e.explicacion.slice(0,200)}` : `OK vacio=${r.vacio} instr=${r.instrucciones?.length} pasos=${r.pasos?.length} final=${JSON.stringify(r.estadoFinal)} pint=${r.casillasPintadas?Object.keys(r.casillasPintadas).length:null}`}`);
}
