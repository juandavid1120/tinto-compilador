// R2-19: solo teclado
import { correr, esperar, casillas, fases, pint, esperarQuieto } from './lib.mjs';

const descr = (page) =>
  page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return { cuerpo: true };
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      tag: e.tagName.toLowerCase(), id: e.id || '', clase: (e.className || '').toString().slice(0, 30),
      nombre: (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      focusVisible: e.matches(':focus-visible'),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      sombra: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 60),
      visibleEnVentana: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    };
  });

await correr('g5', 200000, async ({ pagina, res, foto }) => {
  const r = {};
  const page = await pagina({ etiqueta: 'R2-19' });
  // ---- Camino A: ejemplo -> Enter -> Siguiente fase con Enter ----
  const pasosTab = [];
  let llegoEjemplo = false;
  await page.evaluate(() => document.activeElement?.blur?.());
  for (let i = 1; i <= 40; i++) {
    await page.keyboard.press('Tab');
    const d = await descr(page);
    pasosTab.push({ i, ...d });
    if (d.clase?.includes('ejemplo') && d.tag === 'button') { llegoEjemplo = true; break; }
  }
  r.A_tabsHastaPrimerEjemplo = { llegoEjemplo, n: pasosTab.length, recorrido: pasosTab.map((p) => `${p.i}:${p.tag}${p.id ? '#' + p.id : ''} "${p.nombre}"`) };
  await foto(page, 'R2-19-A1-foco-en-ejemplo');
  await page.keyboard.press('Enter');
  await esperar(500);
  r.A_trasEnterEjemplo = { codigo: await page.inputValue('#codigo'), fases: await fases(page), siguienteDisabled: await page.isDisabled('#btn-siguiente'), foco: await descr(page) };
  // Tab hasta Siguiente fase
  const hastaSig = [];
  for (let i = 1; i <= 30; i++) {
    await page.keyboard.press('Tab');
    const d = await descr(page);
    hastaSig.push(`${i}:${d.tag}${d.id ? '#' + d.id : ''} "${d.nombre}"`);
    if (d.id === 'btn-siguiente') { r.A_focoEnSiguiente = d; break; }
  }
  r.A_tabsHastaSiguiente = hastaSig;
  await foto(page, 'R2-19-A2-foco-siguiente');
  r.A_fasesEnter = [];
  for (let k = 1; k <= 5; k++) {
    await page.keyboard.press('Enter');
    await esperar(400);
    const f = await fases(page);
    r.A_fasesEnter.push({ k, fases: f.join(','), foco: (await descr(page)).id || (await descr(page)).nombre, panel: (await page.evaluate(() => document.querySelector('#panel .panel-titulo h2')?.textContent)) });
    if (k === 3) await foto(page, 'R2-19-A3-fase3');
  }
  await esperarQuieto(page, { quieto: 2000, max: 20000 });
  r.A_final = { fases: await fases(page), casillas: (await casillas(page)).length, siguienteDisabled: await page.isDisabled('#btn-siguiente'), foco: await descr(page) };
  await foto(page, 'R2-19-A4-final');
  // Desde el foco final: llegar a "Ejecutar otra vez" y activarlo con Enter
  const hastaRepetir = [];
  let repetirOk = false;
  for (let i = 1; i <= 8; i++) {
    await page.keyboard.press('Tab');
    const d = await descr(page);
    hastaRepetir.push(`${i}:${d.tag} "${d.nombre}" fv=${d.focusVisible}`);
    if (d.nombre.includes('Ejecutar otra vez')) { repetirOk = true; break; }
  }
  r.A_hastaEjecutarOtraVez = { alcanzable: repetirOk, tabs: hastaRepetir };
  if (repetirOk) {
    await page.keyboard.press('Enter');
    await esperar(300);
    r.A_ejecutarOtraVezConEnter = { casillasA_los300ms: (await casillas(page)).length };
    await esperarQuieto(page, { quieto: 2000, max: 20000 });
    r.A_ejecutarOtraVezConEnter.casillasFinal = (await casillas(page)).length;
  }
  // Shift+Tab hasta una tarjeta de personaje y Enter
  let vioPanel = null;
  for (let i = 1; i <= 8; i++) {
    await page.keyboard.press('Shift+Tab');
    const d = await descr(page);
    if (d.clase?.includes('personaje')) {
      await page.keyboard.press('Enter');
      await esperar(300);
      vioPanel = { tarjeta: d.nombre, panel: await page.evaluate(() => document.querySelector('#panel .panel-titulo h2')?.textContent), tabsAtras: i, foco: d };
      break;
    }
  }
  r.A_personajeConTeclado = vioPanel;
  await foto(page, 'R2-19-A5-personaje-teclado');

  // ---- Camino B: editor, escribir, Cmd+Enter, Siguiente con Enter ----
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#btn-compilar');
  const hastaEditor = [];
  for (let i = 1; i <= 40; i++) {
    await page.keyboard.press('Tab');
    const d = await descr(page);
    hastaEditor.push(`${i}:${d.tag}${d.id ? '#' + d.id : ''}`);
    if (d.id === 'codigo') { r.B_focoEnEditor = d; break; }
  }
  r.B_tabsHastaEditor = hastaEditor;
  await foto(page, 'R2-19-B1-foco-editor');
  await page.keyboard.type('pintar azul\navanzar 2');
  r.B_codigoTecleado = await page.inputValue('#codigo');
  await page.keyboard.press('Meta+Enter');
  await esperar(500);
  r.B_trasCmdEnter = { fases: await fases(page), siguienteDisabled: await page.isDisabled('#btn-siguiente'), foco: (await descr(page)).id };
  // Tab dentro del editor: sangra (no sale)
  await page.keyboard.press('Tab');
  r.B_tabDentroDelEditor = { foco: (await descr(page)).id, codigo: JSON.stringify(await page.inputValue('#codigo')) };
  // Escape + Tab sale del editor
  await page.keyboard.press('Escape');
  const ayuda = await page.evaluate(() => document.querySelector('#ayuda-editor').textContent);
  await page.keyboard.press('Tab');
  r.B_escapeLuegoTab = { ayudaTrasEscape: ayuda, foco: await descr(page) };
  // Volver con Shift+Tab hasta Siguiente fase
  let enSig = false;
  for (let i = 1; i <= 8; i++) {
    await page.keyboard.press('Shift+Tab');
    const d = await descr(page);
    if (d.id === 'btn-siguiente') { enSig = i; break; }
  }
  r.B_shiftTabHastaSiguiente = enSig;
  for (let k = 1; k <= 5; k++) { await page.keyboard.press('Enter'); await esperar(300); }
  await esperarQuieto(page, { quieto: 2000, max: 20000 });
  r.B_final = { fases: await fases(page), casillas: await casillas(page), foco: await descr(page) };
  await foto(page, 'R2-19-B2-final');

  // ---- Recorrido completo de foco (Tab), con indicador de foco de cada parada ----
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#btn-compilar');
  await page.click('.ejemplo:nth-child(1)'); // solo para tener contenido en paneles
  await esperar(300);
  await page.evaluate(() => document.activeElement?.blur?.());
  const ciclo = [];
  for (let i = 1; i <= 70; i++) {
    const antes = await descr(page);
    if (antes.id === 'codigo') await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    const d = await descr(page);
    if (d.cuerpo) { ciclo.push({ i, cuerpo: true }); break; }
    ciclo.push({ i, ...d });
  }
  r.ciclo = ciclo.map((c) => (c.cuerpo ? `${c.i}: (vuelve al documento)` : `${c.i}: ${c.tag}${c.id ? '#' + c.id : ''} "${c.nombre}" fv=${c.focusVisible} outline=${c.outline} sombra=${c.sombra} enVentana=${c.visibleEnVentana}`));
  r.cicloSinIndicador = ciclo.filter((c) => !c.cuerpo && (c.outline.startsWith('none') || c.outline.includes(' 0px ')) && c.sombra === 'none').map((c) => `${c.i}: ${c.tag}${c.id ? '#' + c.id : ''} "${c.nombre}"`);
  res['R2-19'] = r;
  await page.context().close();
});
