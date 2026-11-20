import { correr, estado, shot, esperar, esperarFin, resumenPintadas, coords, CUADRADO, NOMBRES } from './lib.mjs';

async function pasoAPaso(page) {
  let n = 0;
  while (!(await page.isDisabled('#btn-siguiente')) && n < 8) { await page.click('#btn-siguiente'); await esperar(200); n++; }
  await esperar(500);
  return n;
}
async function detalleError(page) {
  return page.evaluate(() => {
    const ex = document.querySelector('#panel .error-explicacion');
    const me = document.querySelector('#panel .error-mensaje');
    const b = document.getElementById('banda');
    const ed = document.getElementById('codigo');
    const cs = getComputedStyle(ed);
    const alto = parseFloat(cs.lineHeight), arriba = parseFloat(cs.paddingTop);
    const lineaBanda = b.hidden ? null : Math.round((parseFloat(b.style.top) + ed.scrollTop - arriba) / alto) + 1;
    const filaPanel = [...document.querySelectorAll('#panel .fila.con-error')].map((f) => f.dataset.linea);
    const mala = [...document.querySelectorAll('#panel .mala')].map((m) => m.textContent);
    return {
      explicacion: ex?.textContent ?? null,
      mensaje: me?.textContent ?? null,
      fsExp: ex ? parseFloat(getComputedStyle(ex).fontSize) : null,
      fsMsg: me ? parseFloat(getComputedStyle(me).fontSize) : null,
      explicacionArribaDelMensaje: ex && me ? ex.getBoundingClientRect().bottom <= me.getBoundingClientRect().top + 1 : null,
      lineaBanda, filaPanel, mala,
      numerosError: [...document.querySelectorAll('#numeros .numero')].map((n, i) => (n.classList.contains('con-error') ? i + 1 : 0)).filter(Boolean),
      estadoPanel: document.querySelector('#panel .panel-estado')?.textContent,
      panel: document.querySelector('#panel .panel-titulo h2')?.textContent,
    };
  });
}
const fmt = (e) => `fases ${e.fases.join(', ')}; ${resumenPintadas(e)}; ${e.estadoRobot}`;

await correr('C-errores', 400000, async ({ nuevaPagina, caso }) => {
  const nueva = async () => (await nuevaPagina()).page;
  // ---------- E2E-16 ----------
  {
    const page = await nueva();
    await page.click('#lista-ejemplos .ejemplo >> nth=2');
    await esperar(300);
    const clics = await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    const cap = await shot(page, 'E2E-16-lexico');
    const ok = e.fases[0] === 'error' && e.fases.slice(1).every((f) => f === 'espera') && e.pintadas.length === 0 && e.robot.x === 0 && e.robot.y === 0
      && d.explicacion && d.mensaje && d.fsExp > d.fsMsg && d.explicacionArribaDelMensaje && d.lineaBanda === 1 && d.numerosError.includes(1);
    caso('E2E-16', ok ? 'PASA' : 'FALLA', [
      `Editor: ${JSON.stringify(e.editor)}; clics en Siguiente fase hasta que se apagó: ${clics}`,
      fmt(e),
      `Panel: ${d.panel} (${d.estadoPanel}). Explicación simple (${d.fsExp}px, arriba): ${JSON.stringify(d.explicacion)}. Mensaje técnico (${d.fsMsg}px, debajo): ${JSON.stringify(d.mensaje)}; explicación encima del mensaje: ${d.explicacionArribaDelMensaje}`,
      `Línea resaltada en el editor: banda en la línea ${d.lineaBanda}; número de línea marcado: ${d.numerosError.join(',')}; en el panel, fila marcada: ${d.filaPanel.join(',')}; texto subrayado: ${JSON.stringify(d.mala)}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-17 ----------
  {
    const page = await nueva();
    await page.click('#lista-ejemplos .ejemplo >> nth=3');
    await esperar(300);
    const clics = await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    const cap = await shot(page, 'E2E-17-sintactico');
    const ok = e.fases[0] === 'aprobado' && e.fases[1] === 'error' && e.fases.slice(2).every((f) => f === 'espera') && e.pintadas.length === 0 && e.robot.x === 0 && e.robot.y === 0;
    caso('E2E-17', ok ? 'PASA' : 'FALLA', [
      `Editor: ${JSON.stringify(e.editor)}; clics: ${clics}`,
      fmt(e),
      `Panel: ${d.panel} (${d.estadoPanel}). Explicación: ${JSON.stringify(d.explicacion)}. Mensaje: ${JSON.stringify(d.mensaje)}`,
      `Línea resaltada: banda en la línea ${d.lineaBanda}; números marcados: ${d.numerosError.join(',')}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-18 ----------
  {
    const page = await nueva();
    await page.click('#lista-ejemplos .ejemplo >> nth=4');
    await esperar(300);
    const clics = await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    const cap = await shot(page, 'E2E-18-semantico');
    const ok = e.fases[0] === 'aprobado' && e.fases[1] === 'aprobado' && e.fases[2] === 'error' && e.fases.slice(3).every((f) => f === 'espera') && e.pintadas.length === 0 && e.robot.x === 0 && e.robot.y === 0;
    caso('E2E-18', ok ? 'PASA' : 'FALLA', [
      `Editor: ${JSON.stringify(e.editor)}; clics: ${clics}`,
      fmt(e),
      `Panel: ${d.panel} (${d.estadoPanel}). Explicación: ${JSON.stringify(d.explicacion)}. Mensaje: ${JSON.stringify(d.mensaje)}`,
      `Línea resaltada: banda en la línea ${d.lineaBanda}; números marcados: ${d.numerosError.join(',')}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-19 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'avanzar 2\ngirar derecha\navanzar @');
    await page.click('#btn-compilar'); await esperar(200);
    const clics = await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    const cap = await shot(page, 'E2E-19-linea3');
    const indicaTres = /línea 3|linea 3/i.test(`${d.explicacion} ${d.mensaje}`);
    const ok = e.fases[0] === 'error' && d.lineaBanda === 3 && d.numerosError.length === 1 && d.numerosError[0] === 3 && indicaTres && !d.numerosError.includes(1);
    caso('E2E-19', ok ? 'PASA' : 'FALLA', [
      fmt(e),
      `Explicación: ${JSON.stringify(d.explicacion)}. Mensaje: ${JSON.stringify(d.mensaje)}`,
      `El texto menciona la línea 3: ${indicaTres}. Banda del editor en la línea ${d.lineaBanda}; números marcados: ${d.numerosError.join(',')}; panel: fila marcada ${d.filaPanel.join(',')}, subrayado ${JSON.stringify(d.mala)}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-20 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'repetir 5 veces:\n  avanzar 4\nfin');
    await page.click('#btn-compilar'); await esperar(200);
    const clics = await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    const cap = await shot(page, 'E2E-20-ciclo');
    const vuelta3 = /vuelta 3/i.test(`${d.explicacion} ${d.mensaje}`);
    const ok = e.fases[2] === 'error' && e.fases.slice(3).every((f) => f === 'espera') && vuelta3;
    caso('E2E-20', ok ? 'PASA' : 'FALLA', [
      fmt(e),
      `Panel: ${d.panel} (${d.estadoPanel}). Explicación: ${JSON.stringify(d.explicacion)}. Mensaje: ${JSON.stringify(d.mensaje)}`,
      `Menciona la vuelta 3: ${vuelta3}. Línea resaltada: ${d.lineaBanda}; robot sin moverse: ${e.pintadas.length === 0}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-21 ----------
  {
    const page = await nueva();
    await page.click('#lista-ejemplos .ejemplo >> nth=0');
    await esperar(300);
    // cuadrado cargado; reiniciar el recorrido y borrar la última línea con el teclado
    await page.click('#codigo');
    await page.evaluate(() => { const t = document.getElementById('codigo'); const i = t.value.lastIndexOf('\n'); t.focus(); t.setSelectionRange(i, t.value.length); });
    await page.keyboard.press('Backspace');
    const sinFin = await page.inputValue('#codigo');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    const e1 = await estado(page); const d1 = await detalleError(page);
    const cap1 = await shot(page, 'E2E-21-a-sin-fin');
    // reescribir fin
    await page.click('#codigo');
    await page.evaluate(() => { const t = document.getElementById('codigo'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await page.keyboard.type('\nfin');
    const conFin = await page.inputValue('#codigo');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperarFin(page, 5);
    const e2 = await estado(page);
    const cap2 = await shot(page, 'E2E-21-b-reparado');
    const ok1 = e1.fases[0] === 'aprobado' && e1.fases[1] === 'error';
    const ok2 = e2.fases.every((f) => f === 'aprobado') && e2.pintadas.length === 12 && e2.pintadas.every((p) => p.color === 'rojo');
    caso('E2E-21', ok1 && ok2 ? 'PASA' : 'FALLA', [
      `Tras borrar la línea fin: editor ${JSON.stringify(sinFin)}`,
      `Compilar sin fin: ${fmt(e1)}; ${d1.panel} ${d1.estadoPanel}: ${JSON.stringify(d1.explicacion)} / ${JSON.stringify(d1.mensaje)}; banda en la línea ${d1.lineaBanda}`,
      `Tras volver a escribir fin: editor ${JSON.stringify(conFin)}`,
      `Compilar con fin: ${fmt(e2)}; casillas: ${coords(e2)}`,
    ], [cap1, cap2]);
    await page.close();
  }
  // ---------- E2E-22 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'pintar morado');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    const e = await estado(page); const d = await detalleError(page);
    // También la burbuja ¿Qué pasó aquí?
    await page.click('#panel button:has-text("¿Qué pasó aquí?")'); await esperar(300);
    const burbuja = (await page.innerText('#panel .burbuja')).trim();
    const cap = await shot(page, 'E2E-22-morado');
    const texto = `${d.explicacion} ${d.mensaje}`;
    const palabras = ['rojo', 'azul', 'verde', 'amarillo', 'negro', 'naranja', 'morado'].filter((c) => new RegExp(c, 'i').test(texto));
    const ok = e.fases[0] === 'error' && e.fases.slice(1).every((f) => f === 'espera') && /rojo/i.test(texto);
    caso('E2E-22', ok ? 'PASA' : 'FALLA', [
      fmt(e),
      `Explicación: ${JSON.stringify(d.explicacion)}`,
      `Mensaje técnico: ${JSON.stringify(d.mensaje)}`,
      `Colores nombrados en el texto del error: ${palabras.join(', ')}`,
      `Burbuja "¿Qué pasó aquí?": ${JSON.stringify(burbuja)}`,
      `Línea resaltada: ${d.lineaBanda}; subrayado: ${JSON.stringify(d.mala)}`,
    ], [cap]);
    await page.close();
  }
});
