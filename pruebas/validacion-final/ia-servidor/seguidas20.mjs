import { traducir } from './lib.mjs';
const frases = ['dibuja un cuadrado rojo','hazme una escalera azul','una línea horizontal verde','dibuja la letra L','un rectángulo amarillo grande'];
const ms = []; let ok = 0;
for (let i = 0; i < 20; i++) {
  const r = await traducir(frases[i % 5]); ms.push(r.ms); if (r.estado === 200) ok++;
  console.log(`#${i+1} ${frases[i%5]} -> ${(r.ms/1000).toFixed(2)}s http=${r.estado} compila=${r.comp ? (r.comp.error ? 'ERR' : 'si') : '-'}`);
}
const m = a => a.reduce((x,y)=>x+y,0)/a.length/1000;
console.log(`200s=${ok}/20 prim10=${m(ms.slice(0,10)).toFixed(2)}s ult10=${m(ms.slice(10)).toFixed(2)}s min=${Math.min(...ms)/1000} max=${Math.max(...ms)/1000}`);
