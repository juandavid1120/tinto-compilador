import { correr, estado, shot, esperar, esperarFin, ponerModoAuto, resumenPintadas, coords, CUADRADO, NOMBRES } from './lib.mjs';

async function pasoAPaso(page) {
  let n = 0;
  while (!(await page.isDisabled('#btn-siguiente')) && n < 8) { await page.click('#btn-siguiente'); await esperar(200); n++; }
  return n;
}
async function ponerVelocidad(page, v) {
  await page.evaluate((v) => { const r = document.getElementById('velocidad'); r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }, v);
}
const fmt = (e) => `fases ${e.fases.join(', ')}; ${resumenPintadas(e)}; ${e.estadoRobot}`;
async function girado(page) { return page.evaluate(() => document.querySelector('#tablero .robot svg').style.transform); }

await correr('D-editor-tablero', 500000, async ({ nuevaPagina, caso }) => {
  const nueva = async () => (await nuevaPagina()).page;
  // ---------- E2E-23 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar'); await esperar(200);
    // Borrar todo con el teclado (Cmd+A y Backspace)
    await page.click('#codigo');
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
    const valor = await page.inputValue('#codigo');
    await page.click('#btn-compilar'); await esperar(400);
    const e = await estado(page);
    const cap = await shot(page, 'E2E-23-vacio');
    const texto = await page.innerText('#panel');
    const ok = valor === '' && e.vacio === 'No hay nada que compilar' && e.fases.every((f) => f === 'espera') && e.siguienteDeshab && e.pintadas.length === 0;
    caso('E2E-23', ok ? 'PASA' : 'FALLA', [
      `Editor tras borrar todo: ${JSON.stringify(valor)}`,
      `Panel: ${JSON.stringify(texto)}`,
      fmt(e), `Botón Siguiente fase deshabilitado: ${e.siguienteDeshab}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-24 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'AVANZAR 3');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperarFin(page, 5);
    const e = await estado(page);
    const cap = await shot(page, 'E2E-24-mayusculas');
    const ok = e.fases.every((f) => f === 'aprobado') && e.pintadas.length === 3 && e.robot.x === 3 && e.robot.y === 0;
    caso('E2E-24', ok ? 'PASA' : 'FALLA', [`Código: "AVANZAR 3"`, fmt(e), `Casillas: ${coords(e)}`], [cap]);
    await page.close();
  }
  // ---------- E2E-25 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'avanzar 9');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperarFin(page, 5);
    const e1 = await estado(page);
    const cap1 = await shot(page, 'E2E-25-a-avanzar9');
    await page.fill('#codigo', 'avanzar 10');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperar(500);
    const e2 = await estado(page);
    const err = await page.evaluate(() => ({ ex: document.querySelector('#panel .error-explicacion')?.textContent, me: document.querySelector('#panel .error-mensaje')?.textContent, p: document.querySelector('#panel .panel-titulo h2')?.textContent }));
    const cap2 = await shot(page, 'E2E-25-b-avanzar10');
    const ok1 = e1.fases.every((f) => f === 'aprobado') && e1.robot.x === 9 && e1.robot.y === 0 && e1.pintadas.length === 9;
    const ok2 = e2.fases[0] === 'aprobado' && e2.fases[1] === 'aprobado' && e2.fases[2] === 'error' && e2.fases.slice(3).every((f) => f === 'espera') && e2.pintadas.length === 0;
    caso('E2E-25', ok1 && ok2 ? 'PASA' : 'FALLA', [
      `avanzar 9: ${fmt(e1)}; casillas ${coords(e1)}`,
      `avanzar 10: ${fmt(e2)}; panel ${err.p}: ${JSON.stringify(err.ex)} / ${JSON.stringify(err.me)}`,
    ], [cap1, cap2]);
    await page.close();
  }
  // ---------- E2E-26 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'pintar rojo\navanzar 3\npintar azul\navanzar 3');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperarFin(page, 5);
    const e = await estado(page);
    const cap = await shot(page, 'E2E-26-dos-colores');
    const rojas = e.pintadas.filter((p) => p.color === 'rojo').map((p) => p.x).sort((a, b) => a - b);
    const azules = e.pintadas.filter((p) => p.color === 'azul').map((p) => p.x).sort((a, b) => a - b);
    const ok = JSON.stringify(rojas) === '[1,2,3]' && JSON.stringify(azules) === '[4,5,6]' && e.pintadas.every((p) => p.y === 0);
    caso('E2E-26', ok ? 'PASA' : 'FALLA', [fmt(e), `Rojas en x=${rojas.join(',')}; azules en x=${azules.join(',')} (fila 0)`, `Casillas: ${coords(e)}`], [cap]);
    await page.close();
  }
  // ---------- E2E-27 ----------
  {
    const page = await nueva();
    await page.fill('#codigo', 'repetir 2 veces:\n  repetir 3 veces:\n    avanzar 1\n  fin\n  girar derecha\nfin');
    await page.click('#btn-compilar'); await esperar(200);
    await pasoAPaso(page);
    await esperarFin(page, 5);
    const e = await estado(page);
    // árbol
    await page.locator('#linea-personajes .personaje').nth(1).click();
    await esperar(3500);
    const arbol = await page.evaluate(() => [...document.querySelectorAll('#panel .arbol-nodo')].map((g) => { const m = g.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/); return { clase: [...g.classList].find((c) => c !== 'arbol-nodo'), titulo: g.querySelector('.arbol-titulo').textContent, x: +m[1], y: +m[2] }; }));
    const capArbol = await shot(page, 'E2E-27-a-arbol');
    // traductor
    await page.locator('#linea-personajes .personaje').nth(3).click();
    await esperar(500);
    const trad = await page.evaluate(() => [...document.querySelectorAll('#panel .col-instrucciones .instruccion .instruccion-texto')].map((s) => s.textContent.replace(/^\d+\s+/, '').trim()));
    const capTrad = await shot(page, 'E2E-27-b-traductor');
    const reps = arbol.filter((n) => n.clase === 'repetir');
    const anidado = reps.length === 2 && reps[1].x > reps[0].x && arbol.find((n) => n.clase === 'avanzar').x > reps[1].x;
    const esp = ['CONTAR 2', 'CONTAR 3', 'MOVER 1', 'VOLVER 2', 'GIRAR DER', 'VOLVER 1'];
    const ok = anidado && JSON.stringify(trad) === JSON.stringify(esp) && e.robot.x === 3 && e.robot.y === 3 && e.fases.every((f) => f === 'aprobado');
    caso('E2E-27', ok ? 'PASA' : 'FALLA', [
      `Árbol: ${arbol.map((n) => `${n.titulo}@x=${n.x}`).join(' ; ')}. Repetir dentro de Repetir (segundo repetir en una columna más a la derecha, y Avanzar colgando del interior): ${anidado}`,
      `El Traductor genera (${trad.length}): ${trad.join(', ')}; esperado: ${esp.join(', ')}`,
      fmt(e), `Casillas: ${coords(e)}`,
    ], [capArbol, capTrad]);
    await page.close();
  }
  // ---------- E2E-28 ----------
  {
    const page = await nueva();
    await ponerModoAuto(page, true);
    await ponerVelocidad(page, 1);
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar');
    // esperar a que el robot esté dibujando y haya pintado algo
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) { const n = await page.evaluate(() => document.querySelectorAll('#tablero .celda.pintada').length); if (n >= 3) break; await esperar(100); }
    await esperar(400);
    const antes = await estado(page);
    const capAntes = await shot(page, 'E2E-28-a-a-mitad');
    await page.click('#btn-reiniciar');
    await esperar(300);
    const despues = await estado(page);
    const rot = await girado(page);
    await esperar(3000);
    const mas = await estado(page);
    const cap = await shot(page, 'E2E-28-b-reiniciado');
    const ok = antes.pintadas.length > 0 && antes.pintadas.length < 12 && despues.pintadas.length === 0 && mas.pintadas.length === 0 && mas.robot.x === 0 && mas.robot.y === 0 && /derecha/.test(mas.estadoRobot) && /rotate\(0deg\)/.test(rot);
    caso('E2E-28', ok ? 'PASA' : 'FALLA', [
      `Velocidad lenta (control en 1). Antes de Reiniciar, a mitad de la animación: ${resumenPintadas(antes)}; ${antes.estadoRobot}; fases ${antes.fases.join(', ')}`,
      `0,3 s después de Reiniciar: ${resumenPintadas(despues)}; ${despues.estadoRobot}; giro del dibujo del robot: ${rot}; fases ${despues.fases.join(', ')}`,
      `3 s más tarde (la animación no siguió): ${resumenPintadas(mas)}; ${mas.estadoRobot}`,
    ], [capAntes, cap]);
    await page.close();
  }
  // ---------- E2E-29 ----------
  {
    const page = await nueva();
    await ponerModoAuto(page, true);
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar');
    await esperarFin(page, 5);
    const cuad = await estado(page);
    await page.fill('#codigo', 'avanzar 2');
    await page.click('#btn-compilar');
    await esperarFin(page, 5);
    const e = await estado(page);
    const cap = await shot(page, 'E2E-29-avanzar2');
    const ok = cuad.pintadas.length === 12 && e.pintadas.length === 2 && e.pintadas.every((p) => p.y === 0 && (p.x === 1 || p.x === 2)) && e.robot.x === 2;
    // variante: compilar mientras el cuadrado todavía se dibuja
    await ponerVelocidad(page, 1);
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar');
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) { const n = await page.evaluate(() => document.querySelectorAll('#tablero .celda.pintada').length); if (n >= 4) break; await esperar(100); }
    const mid = await estado(page);
    await page.fill('#codigo', 'avanzar 2');
    await page.click('#btn-compilar');
    await ponerVelocidad(page, 3);
    await esperarFin(page, 5);
    await esperar(1500);
    const e2 = await estado(page);
    const cap2 = await shot(page, 'E2E-29-b-compilar-a-mitad');
    const ok2 = e2.pintadas.length === 2 && e2.robot.x === 2;
    caso('E2E-29', ok && ok2 ? 'PASA' : 'FALLA', [
      `Cuadrado ejecutado: ${resumenPintadas(cuad)}`,
      `Después de compilar y ejecutar "avanzar 2": ${fmt(e)}; casillas ${coords(e)}`,
      `Variante: se compiló "avanzar 2" cuando el cuadrado iba a mitad (${resumenPintadas(mid)}): resultado ${fmt(e2)}; casillas ${coords(e2)}`,
    ], [cap, cap2]);
    await page.close();
  }
  // ---------- E2E-30 ----------
  {
    const medir = async (v) => {
      const page = await nueva();
      await ponerModoAuto(page, true);
      await ponerVelocidad(page, v);
      await page.fill('#codigo', CUADRADO);
      await page.click('#btn-compilar');
      const t0 = Date.now();
      let tIni = null, tFin = null;
      while (Date.now() - t0 < 60000) {
        const s = await page.evaluate(() => { const t = document.querySelectorAll('#linea-personajes .personaje')[4]; return { fase: t.dataset.estado, trab: t.classList.contains('trabajando'), n: document.querySelectorAll('#tablero .celda.pintada').length }; });
        if (tIni === null && s.fase !== 'espera' && s.trab) tIni = Date.now();
        if (tIni !== null && !s.trab) { tFin = Date.now(); break; }
        await esperar(25);
      }
      const e = await estado(page);
      const cap = await shot(page, `E2E-30-velocidad${v}`);
      await page.close();
      return { duracion: tFin - tIni, total: tFin - t0, e, cap };
    };
    const lenta = await medir(1);
    const rapida = await medir(5);
    const ok = rapida.duracion * 3 < lenta.duracion && lenta.e.pintadas.length === 12 && rapida.e.pintadas.length === 12;
    caso('E2E-30', ok ? 'PASA' : 'FALLA', [
      `Velocidad más lenta (1): el robot dibujó el cuadrado en ${lenta.duracion} ms (desde que El Ejecutor se activa hasta que termina); desde Compilar hasta el final ${lenta.total} ms; resultado ${resumenPintadas(lenta.e)}`,
      `Velocidad más rápida (5): ${rapida.duracion} ms; desde Compilar ${rapida.total} ms; resultado ${resumenPintadas(rapida.e)}`,
      `La rápida fue ${(lenta.duracion / rapida.duracion).toFixed(1)} veces más veloz.`,
    ], [lenta.cap, rapida.cap]);
  }
});
