// R2-02: HTML en el editor
import { correr, esperar, fases, ponerCodigo, modoAuto, esperarQuieto, velocidad } from './lib.mjs';
await correr('g7', 90000, async ({ pagina, res, foto }) => {
  const page = await pagina({ etiqueta: 'R2-02' });
  await modoAuto(page, true); await velocidad(page, 5);
  const r = { variantes: [] };
  const casos = [['a-script', 'avanzar <script>alert(1)</script>'], ['b-img', '<img src=x onerror="document.title=\'HACK\'">'], ['c-etiqueta-en-medio', 'pintar rojo\navanzar 2 <b>hola</b>']];
  for (const [n, codigo] of casos) {
    await ponerCodigo(page, codigo);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 1800, max: 15000 });
    // abre tambien la burbuja "¿Qué pasó aquí?"
    await page.click('#panel button:has-text("¿Qué pasó aquí?")').catch(() => {});
    await esperar(500);
    const info = await page.evaluate(() => {
      const p = document.querySelector('#panel');
      const nuevos = [...document.querySelectorAll('script')].filter((s) => !s.src).length;
      return {
        fases: [...document.querySelectorAll('.personaje')].map((x) => x.dataset.estado),
        titulo: document.title,
        scriptsEnLinea: nuevos,
        imgSrcX: document.querySelectorAll('img[src="x"]').length, scriptsEnPanel: p.querySelectorAll('script').length, bEnPanelOEditor: document.querySelectorAll('#panel b, #panel img, .editor-caja b, .editor-caja img, #historial b, #historial img').length,
        explicacion: p.querySelector('.error-explicacion')?.textContent,
        mensaje: p.querySelector('.error-mensaje')?.textContent,
        codigoEnPanel: [...p.querySelectorAll('.fila-texto')].map((e) => e.textContent).join(' / '),
        burbuja: p.querySelector('.burbuja')?.innerText.replace(/\n/g, ' ').slice(0, 200),
        innerHTMLmensaje: p.querySelector('.error-mensaje')?.innerHTML,
        numerosConError: [...document.querySelectorAll('#numeros .con-error')].map((e) => e.textContent),
      };
    });
    r.variantes.push({ n, codigo, ...info });
    await foto(page, `R2-02-${n}`);
  }
  r.dialogosAlert = 'ver vigilancia (vig.dialogos)';
  res['R2-02'] = r;
  await page.context().close();
});
