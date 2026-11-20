import { traducir, cuadricula } from './lib.mjs';
const frases = ['dibuja un cuadrado rojo', 'hazme una escalera azul', 'dibuja la letra L en verde', 'una línea horizontal amarilla'];
const t0 = Date.now();
const rs = await Promise.all(frases.map(async f => { const r = await traducir(f); r.fin = Date.now() - t0; return r; }));
for (const r of rs) {
  console.log(`\n### ${r.texto}\n${(r.ms/1000).toFixed(2)}s http=${r.estado} ${JSON.stringify(r.cuerpo)} compila=${r.comp ? (r.comp.error ? 'ERR '+r.comp.error.mensaje : 'si') : '-'}`);
  console.log(cuadricula(r.comp));
}
console.log(`\ntotal pared=${((Date.now()-t0)/1000).toFixed(2)}s`);
