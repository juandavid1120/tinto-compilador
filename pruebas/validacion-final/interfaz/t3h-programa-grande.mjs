// Programa grande: ¿se congela la página mientras el robot dibuja?
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, compilar, velocidad } from './lib.mjs';

await correr('t3h-programa-grande', 200000, async ({ pagina, nota }) => {
  const page = await pagina();
  await velocidad(page, 5);
  for (const n of [60, 300, 1500]) {
    const cod = Array(n).fill('girar derecha').join('\n');
    await modoAuto(page, true);
    await page.evaluate((c) => { document.getElementById('codigo').value = c; document.getElementById('codigo').dispatchEvent(new Event('input')); }, cod);
    await page.evaluate(() => { window.__lag = { max: 0, n: 0 }; let t = performance.now(); clearInterval(window.__iv); window.__iv = setInterval(() => { const a = performance.now(); window.__lag.max = Math.max(window.__lag.max, a - t - 20); window.__lag.n++; t = a; }, 20); });
    await page.evaluate(() => document.getElementById('btn-compilar').click());
    await esperar(7000); // ya llegó a El Ejecutor (5 fases ~4 s) y lleva ~3 s dibujando
    const lag = await page.evaluate(() => { const l = { ...window.__lag }; window.__lag = { max: 0, n: 0 }; return l; });
    const t0 = Date.now();
    await page.click('#btn-reiniciar');
    const tClic = Date.now() - t0;
    const lag2 = await page.evaluate(() => ({ ...window.__lag }));
    nota(`[${n} líneas "girar derecha", auto, rápida] retraso máximo del hilo mientras anima: ${Math.round(lag.max)} ms (${lag.n} latidos en ~7 s); clic en Reiniciar tardó ${tClic} ms`);
    await page.evaluate(() => clearInterval(window.__iv));
    await page.click('#btn-reiniciar');
  }
});
