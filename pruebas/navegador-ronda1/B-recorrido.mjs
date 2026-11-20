import { correr, estado, shot, esperar, esperarFin, resumenPintadas, coords, CUADRADO, NOMBRES } from './lib.mjs';

const tarjeta = (page, i) => page.locator('#linea-personajes .personaje').nth(i);

await correr('B-recorrido', 400000, async ({ nuevaPagina, caso }) => {
  const { page } = await nuevaPagina();
  const modoAuto = await page.getAttribute('#modo', 'aria-checked');
  console.log('modo inicial aria-checked =', modoAuto);

  // ---------- E2E-08 y E2E-09 ----------
  await page.fill('#codigo', CUADRADO);
  await page.click('#btn-compilar');
  await esperar(300);
  let e = await estado(page);
  const obs08 = [`Modo inicial: ${modoAuto === 'false' ? 'paso a paso' : 'automático'}`, `Tras Compilar: fases ${e.fases.join(', ')}; botón Siguiente ${e.siguienteDeshab ? 'deshabilitado' : 'habilitado'} con texto "${e.siguienteNombre}"`];
  let ok08 = e.fases.every((f) => f === 'espera') && !e.siguienteDeshab && e.siguienteNombre === 'El Lector';
  const caps08 = [];
  const obs09 = [];
  let ok09 = true;
  for (let i = 0; i < 5; i++) {
    if (i === 4) {
      // Justo antes del 5.º clic (El Ejecutor): esperar un rato y medir el tablero
      await esperar(1500);
      const pre = await estado(page);
      obs09.push(`Antes del 5.º clic (tras 1,5 s de espera con 4 fases aprobadas): ${resumenPintadas(pre)}; ${pre.estadoRobot}; robot left/top=${pre.robotLeftTop.join('/')}`);
      ok09 = ok09 && pre.pintadas.length === 0 && pre.robot.x === 0 && pre.robot.y === 0 && pre.robotLeftTop[0] === '0%' && pre.robotLeftTop[1] === '0%';
      caps08.push(await shot(page, 'E2E-09-antes-del-ejecutor'));
    }
    await page.click('#btn-siguiente');
    await esperar(250);
    const s = await estado(page);
    const aprobados = s.fases.map((f, k) => (f.startsWith('aprobado') ? k : -1)).filter((k) => k >= 0);
    obs08.push(`Clic ${i + 1}: fases ${s.fases.join(', ')}; panel abierto "${s.panelTit}" (${s.panelEstado}); botón Siguiente: ${s.siguienteDeshab ? 'deshabilitado' : `habilitado "${s.siguienteNombre}"`}`);
    const esperado = [...Array(i + 1).keys()];
    if (JSON.stringify(aprobados) !== JSON.stringify(esperado) || s.panelTit !== NOMBRES[i]) ok08 = false;
    if (i < 4 && (s.pintadas.length !== 0 || s.robot.x !== 0 || s.robot.y !== 0)) ok09 = false;
    caps08.push(await shot(page, `E2E-08-clic${i + 1}`));
  }
  await esperar(1200);
  const mid = await estado(page);
  obs09.push(`1,2 s después del 5.º clic el robot ya se movió: ${resumenPintadas(mid)}; ${mid.estadoRobot}`);
  if (mid.pintadas.length === 0) ok09 = false;
  caso('E2E-08', ok08 ? 'PASA' : 'FALLA', obs08, caps08.filter((c) => c.includes('E2E-08')));
  caso('E2E-09', ok09 ? 'PASA' : 'FALLA', obs09.concat(['En los clics 1 a 4 el tablero estuvo vacío y el robot en (0, 0) (se midió tras cada clic).']), caps08.filter((c) => c.includes('E2E-09')));

  await esperarFin(page, 5);
  e = await estado(page);
  console.log('Final cuadrado:', resumenPintadas(e), e.estadoRobot);

  // ---------- E2E-10: El Lector ----------
  await tarjeta(page, 0).click();
  await esperar(500);
  const lector = await page.evaluate(() => {
    const cuerpo = document.querySelector('#panel .panel-cuerpo');
    const lexemas = [...cuerpo.querySelectorAll('.col-codigo .lexema')].map((s) => ({ t: s.textContent, tipo: [...s.classList].find((c) => c.startsWith('tok-')).slice(4), color: getComputedStyle(s).color, fondo: getComputedStyle(s).backgroundColor }));
    const leyenda = [...cuerpo.querySelectorAll('.leyenda .chip-leyenda')].map((c) => ({ t: c.textContent, color: getComputedStyle(c).color, fondo: getComputedStyle(c).backgroundColor }));
    const filas = [...cuerpo.querySelectorAll('.tokens .token:not(.token-encabezado)')].map((f) => [...f.children].map((c) => c.textContent));
    return { lexemas, leyenda, filas, estado: document.querySelector('#panel .panel-estado').textContent };
  });
  const tiene = (tipo, lex) => lector.filas.some((f) => f[0] === tipo && f[1] === lex);
  const tiposResaltados = [...new Set(lector.lexemas.map((l) => l.tipo))];
  const coloresPorTipo = {};
  for (const l of lector.lexemas) coloresPorTipo[l.tipo] = l.color;
  const colorDistinto = new Set(Object.values(coloresPorTipo)).size === Object.keys(coloresPorTipo).length;
  const ok10 = tiene('PALABRA_RESERVADA', 'pintar') && tiene('COLOR', 'rojo') && tiene('NUMERO', '4') && tiene('DOS_PUNTOS', ':') && lector.leyenda.length === 5 && lector.lexemas.length > 0 && colorDistinto;
  const cap10 = await shot(page, 'E2E-10-lector');
  caso('E2E-10', ok10 ? 'PASA' : 'FALLA', [
    `Lexemas resaltados en el código: ${lector.lexemas.length}; tipos: ${tiposResaltados.join(', ')}; cada tipo con un color distinto: ${colorDistinto} (${JSON.stringify(coloresPorTipo)})`,
    `Leyenda (${lector.leyenda.length} chips): ${lector.leyenda.map((l) => l.t).join(' | ')}`,
    `Lista de tokens (${lector.filas.length} filas), primeras: ${lector.filas.slice(0, 6).map((f) => f.join(' ')).join(' / ')}`,
    `Contiene PALABRA_RESERVADA "pintar": ${tiene('PALABRA_RESERVADA', 'pintar')}; COLOR "rojo": ${tiene('COLOR', 'rojo')}; NUMERO "4": ${tiene('NUMERO', '4')}; DOS_PUNTOS ":": ${tiene('DOS_PUNTOS', ':')}`,
    `Lista completa: ${lector.filas.map((f) => f.join(' ')).join(' / ')}`,
  ], [cap10]);

  // ---------- E2E-11: El Gramático ----------
  await tarjeta(page, 1).click();
  await esperar(3500); // los nodos aparecen uno a uno
  const arbol = await page.evaluate(() => {
    const nodos = [...document.querySelectorAll('#panel .arbol-nodo')].map((g) => {
      const m = g.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/);
      return { clase: [...g.classList].find((c) => c !== 'arbol-nodo'), titulo: g.querySelector('.arbol-titulo').textContent, detalle: g.querySelector('.arbol-detalle').textContent, x: +m[1], y: +m[2] };
    });
    return { nodos, ramas: document.querySelectorAll('#panel .arbol-rama').length };
  });
  const por = (c) => arbol.nodos.filter((n) => n.clase === c);
  const rep = por('repetir')[0];
  const prog = por('programa')[0];
  const ok11 = por('programa').length === 1 && por('pintar').length === 1 && por('repetir').length === 1 && por('avanzar').length === 1 && por('girar').length === 1 && arbol.ramas === 4
    && por('avanzar')[0].x > rep.x && por('girar')[0].x > rep.x && rep.x > prog.x && por('pintar')[0].x > prog.x && por('pintar')[0].x === rep.x;
  const cap11 = await shot(page, 'E2E-11-gramatico');
  caso('E2E-11', ok11 ? 'PASA' : 'FALLA', [
    `Nodos del árbol (${arbol.nodos.length}) con ramas ${arbol.ramas}: ${arbol.nodos.map((n) => `${n.titulo} [${n.detalle}] @x=${n.x},y=${n.y}`).join(' ; ')}`,
    `Programa en la columna x=${prog.x}; Pintar y Repetir en x=${rep.x}; Avanzar x=${por('avanzar')[0].x} y Girar x=${por('girar')[0].x} (más a la derecha que el Repetir, o sea cuelgan de él).`,
  ], [cap11]);

  // ---------- E2E-12: El Juez ----------
  await tarjeta(page, 2).click();
  await esperar(1800);
  const juez = await page.evaluate(() => [...document.querySelectorAll('#panel .revision')].map((r) => ({ visto: r.querySelector('.visto').textContent, texto: r.textContent.replace(/^✓/, '').trim(), op: getComputedStyle(r).opacity })));
  const estJuez = await estado(page);
  const ok12 = juez.length > 0 && juez.every((r) => r.visto === '✓') && estJuez.panelEstado === 'Aprobado';
  const cap12 = await shot(page, 'E2E-12-juez');
  caso('E2E-12', ok12 ? 'PASA' : 'FALLA', [`Panel: ${estJuez.panelTit} / ${estJuez.panelEstado}`, `${juez.length} revisiones, todas con ✓: ${juez.every((r) => r.visto === '✓')}: ${juez.map((r) => `${r.visto} ${r.texto} (opacidad ${r.op})`).join(' | ')}`], [cap12]);

  // ---------- E2E-13: El Traductor ----------
  await tarjeta(page, 3).click();
  await esperar(600);
  const trad = await page.evaluate(() => [...document.querySelectorAll('#panel .col-instrucciones .instruccion')].map((f) => ({ t: f.querySelector('.instruccion-texto').textContent, o: f.querySelector('.instruccion-origen')?.textContent })));
  const esp = ['COLOR rojo', 'CONTAR 4', 'MOVER 3', 'GIRAR DER', 'VOLVER 2'];
  const norm = (s) => s.replace(/^\d+\s+/, '').trim();
  const ok13 = trad.length === 5 && trad.every((t, i) => norm(t.t) === esp[i]);
  const cap13 = await shot(page, 'E2E-13-traductor');
  caso('E2E-13', ok13 ? 'PASA' : 'FALLA', [`Instrucciones en el panel (${trad.length}): ${trad.map((t) => `"${t.t}" ${t.o}`).join(' ; ')}`, `Esperado: ${esp.join(', ')}`], [cap13]);

  // ---------- E2E-14: El Ejecutor (nueva corrida, observando el resaltado) ----------
  await tarjeta(page, 4).click();
  await esperar(300);
  // Reiniciar y ejecutar otra vez desde el panel, muestreando el resaltado
  await page.click('#btn-reiniciar');
  await esperar(200);
  await tarjeta(page, 4).click();
  await page.click('#panel button:has-text("Ejecutar otra vez")');
  const muestras = [];
  const t0 = Date.now();
  let capMov = null;
  while (Date.now() - t0 < 20000) {
    const m = await page.evaluate(() => ({
      actual: [...document.querySelectorAll('#panel .instruccion.actual')].map((f) => f.querySelector('.instruccion-texto').textContent),
      monitor: document.querySelector('#panel .monitor-actual')?.textContent,
      paso: document.querySelector('#panel .monitor-paso')?.textContent,
      trabajando: document.querySelectorAll('#linea-personajes .personaje.trabajando').length,
      pintadas: document.querySelectorAll('#tablero .celda.pintada').length,
    }));
    muestras.push({ ...m, ms: Date.now() - t0 });
    if (!capMov && m.pintadas >= 6) capMov = await shot(page, 'E2E-14-a-durante');
    if (m.trabajando === 0 && muestras.length > 5 && m.pintadas > 0) break;
    await esperar(80);
  }
  await esperar(500);
  const finMon = await page.evaluate(() => ({ paso: document.querySelector('#panel .monitor-paso').textContent, monitor: document.querySelector('#panel .monitor-actual').textContent, detalle: document.querySelector('#panel .monitor-detalle').textContent, barra: document.querySelector('#panel .barra-progreso i').style.width, aclaracion: document.querySelector('#panel .monitor-aclaracion').textContent, actual: [...document.querySelectorAll('#panel .instruccion.actual')].map((f) => f.textContent) }));
  const cap14 = await shot(page, 'E2E-14-b-final');
  const vistas = [...new Set(muestras.flatMap((m) => m.actual))];
  const unaSolaALaVez = muestras.every((m) => m.actual.length <= 1);
  const pasos = [...new Set(muestras.map((m) => m.paso))].filter(Boolean);
  const mt = finMon.paso.match(/(\d+) de (\d+)/);
  const ok14 = vistas.length >= 3 && unaSolaALaVez && mt && mt[1] === mt[2] && Number(mt[2]) === 14;
  caso('E2E-14', ok14 ? 'PASA' : 'FALLA', [
    `Durante la ejecución (${muestras.length} muestras en ${muestras.at(-1).ms} ms) se resaltaron estas instrucciones: ${vistas.join(' | ')}; nunca más de una a la vez: ${unaSolaALaVez}`,
    `Contador de pasos visto: ${pasos.slice(0, 3).join(' | ')} ... ${pasos.slice(-2).join(' | ')} (${pasos.length} valores distintos)`,
    `Al final: "${finMon.paso}" (barra ${finMon.barra}); monitor "${finMon.monitor}": ${finMon.detalle}; ${finMon.aclaracion}`,
    `Esperado para el cuadrado: 14 instrucciones ejecutadas (1 COLOR + 1 CONTAR + 4 vueltas x 3 [MOVER, GIRAR, VOLVER])`,
  ], [capMov, cap14].filter(Boolean));

  // ---------- E2E-15: ¿Qué pasó aquí? ----------
  async function explicaciones(prefijo) {
    const textos = [];
    const caps = [];
    for (let i = 0; i < 5; i++) {
      await tarjeta(page, i).click();
      await esperar(400);
      await page.click('#panel button:has-text("¿Qué pasó aquí?")');
      await esperar(300);
      const t = await page.innerText('#panel .burbuja');
      textos.push(t.trim());
      caps.push(await shot(page, `${prefijo}-${i + 1}`));
    }
    return { textos, caps };
  }
  // Con el cuadrado (ya reveladas las 5 fases)
  await page.click('#btn-reiniciar');
  const ex1 = await explicaciones('E2E-15-cuadrado');
  // Con avanzar 2
  await page.fill('#codigo', 'avanzar 2');
  await page.click('#btn-compilar');
  await esperar(300);
  for (let i = 0; i < 5; i++) { await page.click('#btn-siguiente'); await esperar(150); }
  await esperar(1000);
  const ex2 = await explicaciones('E2E-15-avanzar2');
  const cambian = ex1.textos.map((t, i) => t !== ex2.textos[i]);
  const cuentan = (t) => /\d+ palabras?/.test(t);
  const ok15 = ex1.textos.every((t) => t.length > 30) && ex2.textos.every((t) => t.length > 30) && cambian.every(Boolean);
  caso('E2E-15', ok15 ? 'PASA' : 'FALLA', [
    ...NOMBRES.map((n, i) => `${n} con el cuadrado: ${JSON.stringify(ex1.textos[i])}`),
    ...NOMBRES.map((n, i) => `${n} con "avanzar 2": ${JSON.stringify(ex2.textos[i])}`),
    `El texto cambió entre un programa y otro en cada personaje: ${cambian.join(', ')}`,
  ], [ex1.caps[0], ex1.caps[4], ex2.caps[0], ex2.caps[4]]);
});
