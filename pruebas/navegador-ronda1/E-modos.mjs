import { correr, estado, shot, esperar, esperarFin, ponerModoAuto, resumenPintadas, coords, CUADRADO } from './lib.mjs';

async function pasoAPaso(page) {
  let n = 0;
  while (!(await page.isDisabled('#btn-siguiente')) && n < 8) { await page.click('#btn-siguiente'); await esperar(200); n++; }
  return n;
}
const fmt = (e) => `fases ${e.fases.join(', ')}; ${resumenPintadas(e)}; ${e.estadoRobot}`;
const retos = (e) => e.retosHechos.filter((r) => r[1]).map((r) => r[0]);

await correr('E-modos', 400000, async ({ nuevaPagina, caso, vigilancia }) => {
  const nueva = async () => (await nuevaPagina()).page;
  // ---------- E2E-31 ----------
  {
    const page = await nueva();
    await ponerModoAuto(page, true);
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar');
    const t0 = Date.now();
    const linea = [];
    let clicsHechos = 0; // no se pulsa Siguiente fase nunca
    let previo = '';
    let siguienteAlgunaVezHabilitado = false;
    while (Date.now() - t0 < 30000) {
      const s = await page.evaluate(() => ({ f: [...document.querySelectorAll('#linea-personajes .personaje')].map((t) => t.dataset.estado).join(','), n: document.querySelectorAll('#tablero .celda.pintada').length, dis: document.getElementById('btn-siguiente').disabled }));
      if (!s.dis) siguienteAlgunaVezHabilitado = true;
      const firma = `${s.f}|${s.n}`;
      if (firma !== previo && !(s.n > 0 && previo.split('|')[0] === s.f && linea.length > 5)) linea.push(`${Date.now() - t0} ms: ${s.f.replace(/aprobado/g, 'ok').replace(/espera/g, '-')} casillas=${s.n}`);
      previo = firma;
      const fin = s.f.split(',').every((x) => x === 'aprobado') && s.n === 12;
      if (fin) break;
      await esperar(100);
    }
    await esperarFin(page, 5);
    const e = await estado(page);
    const cap = await shot(page, 'E2E-31-automatico');
    const ok = e.fases.every((f) => f === 'aprobado') && e.pintadas.length === 12 && !siguienteAlgunaVezHabilitado && e.robot.x === 0 && e.robot.y === 0;
    const resumen = linea.filter((l) => !/casillas=\d+$/.test(l) || /ok,ok,ok,ok,ok|^[\d]+ ms: (ok|-)/.test(l));
    caso('E2E-31', ok ? 'PASA' : 'FALLA', [
      'Modo automático (interruptor en "Automático"), sin pulsar nunca "Siguiente fase".',
      `Línea de tiempo (cada cambio observado): ${linea.slice(0, 12).join(' | ')} ...`,
      `Botón "Siguiente fase" habilitado en algún momento: ${siguienteAlgunaVezHabilitado}`,
      `Final: ${fmt(e)}; casillas ${coords(e)}`,
    ], [cap]);
    await page.close();
  }
  // ---------- E2E-32 ----------
  {
    const page = await nueva();
    await ponerModoAuto(page, true);
    await page.fill('#codigo', CUADRADO);
    await page.click('#btn-compilar');
    // esperar a que haya exactamente 2 fases reveladas
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) { const n = await page.evaluate(() => [...document.querySelectorAll('#linea-personajes .personaje')].filter((t) => t.dataset.estado !== 'espera').length); if (n >= 2) break; await esperar(30); }
    const errsAntes = vigilancia.pageerrors.length;
    await page.click('#modo'); // a paso a paso
    await esperar(150);
    const justo = await estado(page);
    const avisoTxt = await page.evaluate(() => { const a = document.getElementById('aviso'); return a.hidden ? null : a.textContent; });
    const capAviso = await shot(page, 'E2E-32-a-aviso');
    await esperar(3000);
    const quieto = await estado(page);
    const modo = await page.getAttribute('#modo', 'aria-checked');
    // seguir con Siguiente fase
    const n = await pasoAPaso(page);
    await esperarFin(page, 5);
    const fin = await estado(page);
    const cap = await shot(page, 'E2E-32-b-continuado');
    const sigueAprobadas = quieto.fases.filter((f) => f.startsWith('aprobado')).length;
    const ok = modo === 'false' && JSON.stringify(justo.fases) === JSON.stringify(quieto.fases) && sigueAprobadas >= 2 && sigueAprobadas < 5 && !quieto.siguienteDeshab && fin.fases.every((f) => f === 'aprobado') && fin.pintadas.length === 12 && vigilancia.pageerrors.length === errsAntes;
    caso('E2E-32', ok ? 'PASA' : 'FALLA', [
      `Se cambió a "Paso a paso" (aria-checked=${modo}) con 2 personajes ya aprobados: ${justo.fases.join(', ')}`,
      `Aviso en pantalla: ${JSON.stringify(avisoTxt)}`,
      `3 s después la corrida seguía detenida: ${quieto.fases.join(', ')}; "Siguiente fase" habilitado con "${quieto.siguienteNombre}"`,
      `Errores de JavaScript durante el cambio: ${vigilancia.pageerrors.length - errsAntes}`,
      `Se continuó con ${n} clics en "Siguiente fase": ${fmt(fin)}`,
    ], [capAviso, cap]);
    // variante: cambiar durante el dibujo del robot
    await page.fill('#codigo', CUADRADO);
    await ponerModoAuto(page, true);
    await page.click('#btn-compilar');
    const t1 = Date.now();
    while (Date.now() - t1 < 15000) { const n = await page.evaluate(() => document.querySelectorAll('#tablero .celda.pintada').length); if (n >= 4) break; await esperar(40); }
    await page.click('#modo');
    await esperar(200);
    const v1 = await estado(page);
    const avisoV = await page.evaluate(() => { const a = document.getElementById('aviso'); return a.hidden ? null : a.textContent; });
    await esperar(2500);
    const v2 = await estado(page);
    const capV = await shot(page, 'E2E-32-c-variante-robot');
    caso('E2E-32-variante', 'INFO', [
      `Variante (no exigida por el caso): cambiar a paso a paso mientras el robot ya dibuja. Al cambiar: ${resumenPintadas(v1)}; 2,5 s después: ${resumenPintadas(v2)} (${v1.pintadas.length === v2.pintadas.length ? 'el robot se detuvo donde iba' : 'el robot siguió'}); aviso: ${JSON.stringify(avisoV)}; fases ${v2.fases.join(', ')}`,
    ], [capV]);
    await page.close();
  }
  // ---------- E2E-33 ----------
  {
    const page = await nueva();
    const obs = [];
    const e0 = await estado(page);
    obs.push(`Retos marcados al inicio: ${retos(e0).length === 0 ? 'ninguno' : retos(e0).join(', ')}`);
    const casos = [['léxico', 'avanzar @'], ['sintáctico', 'repetir 2 veces:\n  avanzar 1'], ['semántico', 'avanzar 99']];
    const caps = [];
    let ultimo;
    for (const [nombre, codigo] of casos) {
      await page.fill('#codigo', codigo);
      await page.click('#btn-compilar'); await esperar(150);
      await pasoAPaso(page);
      ultimo = await estado(page);
      obs.push(`Tras el error ${nombre} (${JSON.stringify(codigo)}): fases ${ultimo.fases.join(', ')}; retos marcados: ${retos(ultimo).join(' | ') || 'ninguno'}`);
    }
    const marcas = await page.evaluate(() => [...document.querySelectorAll('#lista-retos .reto-marca')].map((b) => b.getAttribute('aria-pressed')));
    obs.push(`aria-pressed de las 5 tarjetas de reto (en orden): ${marcas.join(', ')}`);
    caps.push(await shot(page, 'E2E-33-retos'));
    const ok = ['Haz que El Lector falle', 'Haz que El Gramático falle', 'Haz que El Juez falle'].every((t) => retos(ultimo).includes(t)) && retos(ultimo).length === 3;
    caso('E2E-33', ok ? 'PASA' : 'FALLA', obs, caps);
    await page.close();
  }
  // ---------- E2E-34 ----------
  {
    const page = await nueva();
    const nombres = await page.evaluate(() => [...document.querySelectorAll('#lista-ejemplos .ejemplo')].map((b) => b.textContent));
    const esperadoFase = [null, null, 0, 1, 2];
    const obs = [`Botones de ejemplo (${nombres.length}): ${nombres.join(' | ')}`];
    const caps = [];
    let todoOk = nombres.length === 5;
    for (let i = 0; i < 5; i++) {
      await page.click(`#lista-ejemplos .ejemplo >> nth=${i}`);
      await esperar(200);
      await pasoAPaso(page);
      await esperarFin(page, esperadoFase[i] === null ? 5 : esperadoFase[i] + 1);
      await esperar(300);
      const e = await estado(page);
      let ok;
      if (esperadoFase[i] === null) ok = e.fases.every((f) => f === 'aprobado') && e.pintadas.length > 0;
      else ok = e.fases[esperadoFase[i]] === 'error' && e.fases.slice(0, esperadoFase[i]).every((f) => f === 'aprobado') && e.fases.slice(esperadoFase[i] + 1).every((f) => f === 'espera') && e.pintadas.length === 0;
      todoOk = todoOk && ok;
      obs.push(`Ejemplo ${i + 1} "${nombres[i].split('\n')[0]}": ${fmt(e)}${esperadoFase[i] === null ? `; casillas ${coords(e)}` : ''} -> ${ok ? 'como se esperaba' : 'DISTINTO DE LO ESPERADO'}`);
      caps.push(await shot(page, `E2E-34-ejemplo${i + 1}`));
    }
    caso('E2E-34', todoOk ? 'PASA' : 'FALLA', obs, caps);
    await page.close();
  }
});
