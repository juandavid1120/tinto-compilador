// Tarea 3: guion de la demo (sección 9 del plan) dos veces seguidas, sin recargar. IA real.
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, siguientes, compilar, velocidad, queParo, CUADRADO } from './lib.mjs';

const R = (s) => `fases=${s.fases.join(',')} pint=${s.pintadas} robot="${s.robot.replace('Robot en ', '')}" panel=${s.panelTit ?? '-'}/${s.panelEst ?? '-'}${s.vacio ? ` vacio="${s.vacio}"` : ''} sig=${s.sig.dis ? 'off' : 'on:' + s.sig.n} banda=${s.banda} retos=${s.retos}`;
async function enviar(page, texto) { await page.fill('#texto-chat', texto); await page.press('#texto-chat', 'Enter'); }
async function esperarRespuesta(page, max = 30000) { await page.waitForFunction(() => !document.querySelector('#historial .mensaje.cargando') && !document.getElementById('texto-chat').disabled, null, { timeout: max }); }
const ej = (page, n) => page.click(`#lista-ejemplos .ejemplo:nth-child(${n})`);

await correr('t3f-guion', 420000, async ({ pagina, nota }) => {
  const page = await pagina();
  let fallos = 0;
  const veo = (id, cond, extra) => { if (!cond) fallos++; nota(`${cond ? 'OK  ' : 'FALLA'} ${id} ${extra}`); };
  for (const vuelta of [1, 2]) {
    nota(`\n===== VUELTA ${vuelta} =====`);
    // 1. Gancho (automático, velocidad por defecto 3)
    await modoAuto(page, true);
    const t = Date.now();
    await enviar(page, 'dibuja un cuadrado rojo'); await esperarRespuesta(page); const tIA = Date.now() - t;
    await esperarQuieto(page, { max: 30000 });
    let s = await snap(page);
    veo(`v${vuelta}-1 gancho (IA ${tIA} ms)`, s.pintadas === 12 && s.fases.every((f) => f === 'aprobado') && s.pint.every((p) => p.endsWith('rojo')), R(s));
    if (vuelta === 2) await shot(page, 't3f-vuelta2-gancho');
    // 2. Las fases: mismo ejemplo en paso a paso
    await modoAuto(page, false);
    await enviar(page, 'dibuja un cuadrado rojo'); await esperarRespuesta(page);
    s = await snap(page);
    veo(`v${vuelta}-2a listo para compilar (paso a paso)`, s.vacio === 'Listo para compilar' && s.pintadas === 0 && s.fases.every((f) => f === 'espera') && !s.sig.dis && s.sig.n === 'El Lector', R(s));
    const textos = [];
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-siguiente'); await esperar(200);
      const q = await queParo(page, i); textos.push(q.txt);
    }
    await esperarQuieto(page, { max: 30000 });
    s = await snap(page);
    veo(`v${vuelta}-2b cinco fases y dibujo`, s.pintadas === 12 && s.fases.every((f) => f === 'aprobado') && s.sig.dis, R(s));
    nota('   textos de ¿Qué pasó aquí?: ' + JSON.stringify(textos.map((x) => x.slice(0, 80))));
    // 3. Los tres errores
    for (const [n, f] of [[3, 'léxico'], [4, 'sintáctico'], [5, 'semántico']]) {
      await ej(page, n); await siguientes(page, 5); await esperarQuieto(page);
      s = await snap(page);
      const esp = { 3: 'error,espera,espera,espera,espera', 4: 'aprobado,error,espera,espera,espera', 5: 'aprobado,aprobado,error,espera,espera' }[n];
      veo(`v${vuelta}-3 error ${f}`, s.fases.join() === esp && s.pintadas === 0 && s.banda && s.panelEst === 'Error', R(s));
      const q = await queParo(page, esp.split(',').indexOf('error'));
      nota(`   "¿Qué pasó aquí?" del que falló: ${q.txt}`);
    }
    // 4. La IA solo tradujo: el aviso del chat
    const aviso = await page.textContent('.aviso-ia');
    nota(`   aviso fijo del chat: ${aviso.trim()}`);
    // 5. Reto: escalera con la pista, a mano
    await page.click('#lista-retos .reto:nth-child(1) .reto-titulo');
    await modoAuto(page, true);
    await compilar(page, 'pintar verde\nrepetir 3 veces:\n  avanzar 1\n  girar derecha\n  avanzar 1\n  girar izquierda\nfin');
    await esperarQuieto(page, { max: 30000 });
    s = await snap(page);
    veo(`v${vuelta}-5 reto escalera`, s.pintadas === 6 && s.fases.every((f) => f === 'aprobado'), R(s));
    const marcado = (await page.getAttribute('#lista-retos .reto:nth-child(1) .reto-marca', 'aria-pressed')) === 'true';
    if (!marcado) await page.click('#lista-retos .reto:nth-child(1) .reto-marca');
    await page.click('#lista-retos .reto:nth-child(1) .reto-titulo');
    nota(`   reto 1 marcado antes de pulsar: ${marcado}; ahora retos=${(await snap(page)).retos}`);
    await modoAuto(page, false);
  }
  // Al final: cuadrado sigue saliendo
  await ej(page, 1); await siguientes(page, 5); await esperarQuieto(page);
  const f = await snap(page);
  veo('final cuadrado', f.pintadas === 12, R(f));
  nota(`fallos totales: ${fallos}`);
});
