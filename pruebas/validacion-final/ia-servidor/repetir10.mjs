import { traducir, cuadricula } from './lib.mjs';
const rs = [];
for (let i = 0; i < 10; i++) {
  const r = await traducir('dibuja un cuadrado rojo'); rs.push(r);
  console.log(`#${i+1} ${(r.ms/1000).toFixed(2)}s http=${r.estado} ${JSON.stringify(r.cuerpo)} compila=${r.comp ? (r.comp.error ? 'ERR' : 'si') : '-'}`);
}
const ms = rs.map(r => r.ms); const cods = new Set(rs.map(r => r.cuerpo?.codigo ?? r.cuerpo?.noPuedo ?? r.err));
console.log(`min=${Math.min(...ms)/1000}s prom=${(ms.reduce((a,b)=>a+b,0)/ms.length/1000).toFixed(2)}s max=${Math.max(...ms)/1000}s distintos=${cods.size}`);
const grids = new Set(rs.map(r => cuadricula(r.comp))); console.log('cuadriculas distintas:', grids.size); console.log([...grids][0]);
