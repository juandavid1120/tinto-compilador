import { compilar } from '../../../compilador/compilar.js';
export async function traducir(texto, puerto = 3000, tmo = 30000) {
  const t0 = Date.now();
  let estado = 0, cuerpo = null, err = null;
  try {
    const r = await fetch(`http://localhost:${puerto}/api/traducir`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }), signal: AbortSignal.timeout(tmo),
    });
    estado = r.status;
    const txt = await r.text();
    try { cuerpo = JSON.parse(txt); } catch { cuerpo = { crudo: txt }; }
  } catch (e) { err = String(e); }
  const ms = Date.now() - t0;
  let comp = null;
  if (cuerpo && typeof cuerpo.codigo === 'string') {
    try { comp = compilar(cuerpo.codigo); } catch (e) { comp = { excepcion: String(e) }; }
  }
  return { texto, estado, cuerpo, err, ms, comp };
}
export function cuadricula(comp) {
  if (!comp || !comp.casillasPintadas) return '';
  const letras = { rojo: 'R', azul: 'A', verde: 'V', amarillo: 'Y', negro: '#' };
  const filas = [];
  for (let y = 0; y < 10; y++) {
    let f = '';
    for (let x = 0; x < 10; x++) { const c = comp.casillasPintadas[`${x},${y}`]; f += c ? letras[c] || '?' : '.'; }
    filas.push(f);
  }
  return filas.join('\n');
}
