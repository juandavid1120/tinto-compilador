// Tarea 3: Reiniciar, editar tras un error, programas mínimos, velocidades (sin IA).
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, siguientes, queParo, compilar, velocidad, CUADRADO } from './lib.mjs';

const R = (s) => `fases=${s.fases.join(',')} pint=${s.pintadas} robot="${s.robot.replace('Robot en ', '').replace(' · mira ', ' | ').replace(' · pincel ', ' | ')}" panel=${s.panelTit ?? '-'}/${s.panelEst ?? '-'}${s.vacio ? ` vacio="${s.vacio}"` : ''} sig=${s.sig.dis ? 'off' : 'on:' + s.sig.n} banda=${s.banda} aviso=${s.aviso ? 'SI' : 'no'} mon="${s.mon ?? ''}|${s.monPaso ?? ''}"`;
const ERRORES = { lexico: 'pintar rojo\navanzar @3', sintactico: 'pintar rojo\nrepetir 4 veces:\n  avanzar 3', semantico: 'pintar rojo\navanzar 99' };

await correr('t3c-estados', 420000, async ({ pagina, nota }) => {
  const page = await pagina();
  await velocidad(page, 5);

  nota('## REINICIAR tras corrida completa (paso a paso)');
  await compilar(page, CUADRADO); await siguientes(page, 5); await esperarQuieto(page);
  nota('antes: ' + R(await snap(page)));
  await page.click('#btn-reiniciar'); await esperar(300);
  nota('tras Reiniciar: ' + R(await snap(page)));
  await shot(page, 't3c-reiniciar-tras-corrida');
  for (let i = 0; i < 5; i++) {
    const tarjetas = await page.$$('#linea-personajes .personaje'); await tarjetas[i].click(); await esperar(100);
    const s = await snap(page);
    nota(`   clic personaje ${i + 1}: panel=${s.panelTit}/${s.panelEst} mon="${s.mon}|${s.monPaso}" pint=${s.pintadas}`);
  }
  await page.click('#panel button:has-text("Ejecutar otra vez")').catch((e) => nota('   (no hay botón Ejecutar otra vez)'));
  await esperarQuieto(page);
  nota('   tras "Ejecutar otra vez" desde el panel: ' + R(await snap(page)));
  await page.click('#btn-compilar'); await esperar(200);
  nota('   recompilar tras reiniciar: ' + R(await snap(page)));

  nota('\n## REINICIAR tras corrida completa (automático)');
  await modoAuto(page, true);
  await compilar(page, CUADRADO); await esperarQuieto(page, { max: 30000 });
  await page.click('#btn-reiniciar'); await esperar(300);
  nota('tras Reiniciar (auto): ' + R(await snap(page)));
  // El mismo panel de El Ejecutor
  nota('   ¿se puede ver el dibujo de nuevo? clic en Ejecutor y "Ejecutar otra vez"');
  const tj = await page.$$('#linea-personajes .personaje'); await tj[4].click(); await esperar(100);
  await page.click('#panel button:has-text("Ejecutar otra vez")'); await esperarQuieto(page);
  nota('   -> ' + R(await snap(page)));

  nota('\n## REINICIAR tras un error, en cada fase');
  for (const [f, cod] of Object.entries(ERRORES)) {
    await compilar(page, cod); await esperarQuieto(page, { max: 20000 });
    const a = await snap(page);
    await page.click('#btn-reiniciar'); await esperar(300);
    const b = await snap(page);
    nota(`[${f}] antes: ${R(a)}`); nota(`[${f}] tras Reiniciar: ${R(b)}`);
    if (f === 'semantico') await shot(page, 't3c-reiniciar-tras-error-semantico');
  }

  nota('\n## REINICIAR a mitad de una corrida automática (velocidad lenta)');
  await velocidad(page, 1);
  await compilar(page, CUADRADO);
  await esperar(1000); // El Lector y puede que El Gramático
  nota('antes (fase 1-2): ' + R(await snap(page)));
  await page.click('#btn-reiniciar'); await esperar(2500);
  let s = await snap(page);
  nota('2,5 s después de Reiniciar: ' + R(s));
  await shot(page, 't3c-reiniciar-mitad-auto');
  nota('   ¿"Siguiente fase" disponible? ' + (s.sig.dis ? 'NO (modo auto)' : 'si'));
  await page.click('#modo-paso'); await esperar(200);
  s = await snap(page);
  nota('   cambiar a paso a paso: ' + R(s));
  if (!s.sig.dis) { await siguientes(page, 5); await esperarQuieto(page); nota('   siguiendo con Siguiente fase: ' + R(await snap(page))); }
  await velocidad(page, 5);

  nota('\n## REINICIAR a mitad de la animación del robot (auto, lenta)');
  await modoAuto(page, true); await velocidad(page, 1);
  await compilar(page, CUADRADO);
  await page.waitForFunction(() => document.querySelectorAll('#tablero .celda.pintada').length >= 3, null, { timeout: 20000 });
  nota('antes: ' + R(await snap(page)));
  await page.click('#btn-reiniciar'); await esperar(2000);
  s = await snap(page);
  nota('2 s tras Reiniciar: ' + R(s) + ` (¿pintó más? p=${s.p})`);
  await modoAuto(page, false); await velocidad(page, 5);

  nota('\n## EDITAR el código tras un error, sin compilar');
  for (const [f, cod] of Object.entries(ERRORES)) {
    await compilar(page, cod); await siguientes(page, 5); await esperarQuieto(page);
    const a = await snap(page);
    await page.fill('#codigo', cod.replace(/@3|99|4 veces:/, (m) => (m === '4 veces:' ? '4 veces:\n  avanzar 1\nfin' : '2')));
    await esperar(150);
    const b = await snap(page);
    nota(`[${f}] error visible: ${R(a)}`); nota(`[${f}] tras editar sin compilar: ${R(b)}`);
    if (f === 'lexico') await shot(page, 't3c-editar-tras-error-lexico');
    const tj2 = await page.$$('#linea-personajes .personaje'); await tj2[0].click(); await esperar(100);
    const codPanel = await page.$$eval('#panel .fila-texto', (x) => x.map((e) => e.textContent).join(' / ')).catch(() => '?');
    nota(`   panel de El Lector (tras editar) muestra el código: ${codPanel}`);
    await page.click('#btn-compilar'); await esperar(150);
    nota(`   tras pulsar Compilar: ${R(await snap(page))}`);
  }

  nota('\n## EDITAR a mitad del paso a paso (2 fases reveladas), luego seguir con Siguiente fase');
  await compilar(page, CUADRADO); await siguientes(page, 2);
  await page.fill('#codigo', 'pintar azul\navanzar 2');
  await siguientes(page, 3); await esperarQuieto(page);
  s = await snap(page);
  nota('el editor dice "pintar azul/avanzar 2", pero El Ejecutor dibujó: ' + R(s));
  const tj3 = await page.$$('#linea-personajes .personaje'); await tj3[0].click(); await esperar(100);
  nota('   panel Lector muestra: ' + (await page.$$eval('#panel .fila-texto', (x) => x.map((e) => e.textContent).join(' / '))));
  await shot(page, 't3c-editar-a-mitad-paso');

  nota('\n## PROGRAMAS MÍNIMOS');
  for (const modo of ['paso', 'auto']) {
    await modoAuto(page, modo === 'auto');
    for (const [id, cod] of [['vacío', ''], ['solo líneas vacías', '\n\n\n\n'], ['solo espacios y tab', '   \n\t\n  '], ['una instrucción', 'avanzar 1'], ['solo pintar rojo', 'pintar rojo']]) {
      // antes: dibujar el cuadrado para ver si se limpia
      await compilar(page, CUADRADO); if (modo === 'paso') await siguientes(page, 5); await esperarQuieto(page, { max: 30000 });
      await compilar(page, cod); await esperar(modo === 'auto' ? 3500 : 300);
      if (modo === 'paso') { await siguientes(page, 5); await esperarQuieto(page); }
      const t = await snap(page);
      nota(`[${modo}] ${id} (${JSON.stringify(cod)}): ${R(t)}${t.vacioT ? ` texto="${t.vacioT}"` : ''}`);
      if (id === 'solo líneas vacías' && modo === 'paso') await shot(page, 't3c-solo-lineas-vacias');
      if (id === 'solo pintar rojo' && modo === 'paso') await shot(page, 't3c-solo-pintar-rojo');
    }
  }
  await modoAuto(page, false);
  nota('\n## ¿"Siguiente fase" pulsado tras vacío? (el botón debe estar desactivado) y Reiniciar con tablero vacío');
  await compilar(page, ''); nota(R(await snap(page)));
  await page.click('#btn-reiniciar'); nota('Reiniciar sin nada: ' + R(await snap(page)));

  nota('\n## CAMBIAR VELOCIDAD a mitad de animación: tiempos entre casillas pintadas');
  await modoAuto(page, true);
  const medir = async (cambios) => {
    await velocidad(page, cambios.inicio);
    await page.evaluate(() => { window.__t = []; const obs = new MutationObserver((r) => { for (const x of r) if (x.target.classList.contains('pintada')) window.__t.push(performance.now()); }); document.querySelectorAll('#tablero .celda').forEach((c) => obs.observe(c, { attributes: true, attributeFilter: ['class'] })); });
    await compilar(page, 'pintar rojo\nrepetir 3 veces:\n  avanzar 3\n  girar derecha\nfin');
    await page.waitForFunction(() => window.__t.length >= cambios.en, cambios, { timeout: 30000 }).catch(() => {});
    await velocidad(page, cambios.fin);
    await esperarQuieto(page, { max: 40000 });
    const t = await page.evaluate(() => window.__t);
    const dif = t.slice(1).map((x, i) => Math.round(x - t[i]));
    return { n: t.length, dif };
  };
  nota('1 -> 5 tras 3 casillas: ' + JSON.stringify(await medir({ inicio: 1, en: 3, fin: 5 })));
  nota('5 -> 1 tras 3 casillas: ' + JSON.stringify(await medir({ inicio: 5, en: 3, fin: 1 })));
  s = await snap(page);
  nota('final tras cambios de velocidad: ' + R(s));
  await modoAuto(page, false);
  // velocidad 1: ¿cuánto tarda el cuadrado entero en el modo normal y lento? (informativo)
  await velocidad(page, 1);
  const t0 = Date.now(); await compilar(page, CUADRADO); await siguientes(page, 5); await esperarQuieto(page, { max: 60000 });
  nota(`cuadrado a velocidad 1 (lenta): ${Date.now() - t0} ms; pintadas=${(await snap(page)).pintadas}`);
  await velocidad(page, 5);
  const t1 = Date.now(); await compilar(page, CUADRADO); await siguientes(page, 5); await esperarQuieto(page, { max: 60000 });
  nota(`cuadrado a velocidad 5 (rápida): ${Date.now() - t1} ms; pintadas=${(await snap(page)).pintadas}`);
});
