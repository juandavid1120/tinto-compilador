import { correr, esperar, esperarQuieto, velocidad, modoAuto, fases } from './lib.mjs';
import { MEDIR } from './medir.mjs';
await correr('x150', 120000, async ({ pagina, res, foto }) => {
  const page = await pagina({ ancho: 960, alto: 600, dsf: 1.5, etiqueta: 'R2-18-150-scroll' });
  await velocidad(page, 5); await modoAuto(page, true);
  for (const [n, sel] of [['sintactico', '.ejemplo:nth-child(4)'], ['semantico', '.ejemplo:nth-child(5)']]) {
    await page.click(sel); await esperarQuieto(page, { quieto: 1800, max: 20000 }); await esperar(600);
    await page.evaluate(() => { document.body.scrollTop = 99999; document.documentElement.scrollTop = 99999; });
    await esperar(300);
    res[n] = await page.evaluate(() => {
      const m = ({ body: document.body.scrollTop, doc: document.documentElement.scrollTop, innerH: innerHeight });
      const eco = document.querySelector('#panel .error-codigo'); const pr = document.querySelector('#panel').getBoundingClientRect();
      const er = eco?.getBoundingClientRect();
      const env = document.querySelector('#btn-enviar').getBoundingClientRect();
      return { ...m, panelBottom: Math.round(pr.bottom), codigoRect: er && [Math.round(er.top), Math.round(er.bottom)], enviarBottom: Math.round(env.bottom) };
    });
    await foto(page, `R2-18-150-scrolleado-${n}`);
  }
});
