import { writeFileSync } from 'node:fs';
import { traducir, cuadricula } from './lib.mjs';
const frases = [
 // figuras simples
 'dibuja un cuadrado', 'hazme un cuadrado azul', 'quiero un rectángulo verde', 'dibuja una línea horizontal roja',
 'una línea vertical hacia abajo', 'dibuja una escalera amarilla', 'dibuja un zigzag', 'dibuja un marco que rodee todo el tablero',
 'dibuja una cruz', 'dibuja la letra L',
 // tamaños
 'dibuja un cuadrado grande', 'un cuadrado pequeño verde', 'dibuja un cuadrado de 5', 'un rectángulo de 7 de ancho y 4 de alto', 'dibuja una línea de 6 casillas',
 // colores
 'cuadrado amarillo', 'dibuja un cuadrado morado', 'un cuadrado negro',
 // paisas
 'parce, hágame un cuadrito', 'ome, pinte una rayita azul pues', 'mijo dibújeme una escalerita verde, ¿si o qué?', 'quiero ver un cuadrado rojo bien bacano',
 // ortografía
 'dibuja un cuadrdo rojo', 'aser una linea orisontal', 'dibuja un recatngulo azul',
 // inglés
 'draw a red square', 'make a blue line', 'draw a green staircase',
 // imposibles
 'dibuja un círculo', 'dibuja un triángulo', 'dibuja una estrella amarilla', 'dibuja un corazón rojo', 'dibuja una casa',
 // no dibujos
 'cuéntame un chiste', 'hazme una pizza', '¿cuál es la capital de Colombia?', 'cuánto es 2+2',
 // vagas
 'dibuja algo bonito', 'sorpréndeme', 'haz algo', 'hola',
 // letras rectas
 'dibuja la letra T', 'dibuja la letra H en azul', 'dibuja la letra E', 'dibuja la letra U verde', 'dibuja la letra F',
 // letras diagonal
 'dibuja la letra K', 'dibuja la letra M', 'dibuja la letra X', 'dibuja la letra Z roja', 'dibuja la inicial de mi nombre, me llamo Valentina',
];
const res = [];
for (const f of frases) {
  const r = await traducir(f);
  res.push(r);
  const tipo = r.cuerpo?.codigo !== undefined ? 'CODIGO' : r.cuerpo?.noPuedo !== undefined ? 'NOPUEDO' : 'ERROR';
  const comp = r.comp ? (r.comp.error ? 'ERR:' + r.comp.error.fase + ':' + r.comp.error.mensaje : r.comp.excepcion ? 'EXC' : 'compila') : '-';
  console.log(`\n### [${res.length}] ${f}\n${(r.ms/1000).toFixed(1)}s http=${r.estado} ${tipo} ${comp} ${r.err||''}`);
  if (r.cuerpo?.codigo !== undefined) { console.log(r.cuerpo.codigo.split('\n').join(' | ')); const g = cuadricula(r.comp); if (g) console.log(g); }
  else console.log(JSON.stringify(r.cuerpo));
  writeFileSync('bateria-resultados.json', JSON.stringify(res, null, 1));
}
