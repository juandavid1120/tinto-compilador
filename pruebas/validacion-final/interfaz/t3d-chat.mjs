// Tarea 3: chat (IA real) en paralelo con animaciones y con ejemplos.
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, siguientes, compilar, velocidad, CUADRADO } from './lib.mjs';

const R = (s) => `fases=${s.fases.join(',')} pint=${s.pintadas} robot="${s.robot.replace('Robot en ', '')}" panel=${s.panelTit ?? '-'}/${s.panelEst ?? '-'}${s.vacio ? ` vacio="${s.vacio}"` : ''} sig=${s.sig.dis ? 'off' : 'on:' + s.sig.n} banda=${s.banda}`;
const chatTxt = (page) => page.$$eval('#historial .mensaje', (m) => m.map((x) => (x.classList.contains('usuario') ? 'U: ' : x.classList.contains('cargando') ? 'CARGANDO: ' : x.classList.contains('aviso') ? 'AVISO: ' : 'IA: ') + x.innerText.replace(/\n+/g, ' / ').slice(0, 90)));
async function enviar(page, texto) { await page.fill('#texto-chat', texto); await page.press('#texto-chat', 'Enter'); }
async function esperarRespuesta(page, max = 30000) { await page.waitForFunction(() => !document.querySelector('#historial .mensaje.cargando') && !document.getElementById('texto-chat').disabled, null, { timeout: max }); }

await correr('t3d-chat', 300000, async ({ pagina, nota }) => {
  const page = await pagina();

  nota('## 1. Chat mientras el robot dibuja (auto, lento): la respuesta llega a mitad de la animación');
  await modoAuto(page, true); await velocidad(page, 1);
  await compilar(page, CUADRADO);
  await page.waitForFunction(() => document.querySelectorAll('#tablero .celda.pintada').length >= 3, null, { timeout: 25000 });
  nota('antes de escribir: ' + R(await snap(page)));
  await enviar(page, 'dibuja una escalera azul de 3 escalones');
  const t0 = Date.now();
  // mientras la IA responde, ¿sigue animando?
  await esperar(1000);
  const mid = await snap(page);
  nota('1 s después de enviar (esperando a la IA): ' + R(mid));
  await esperarRespuesta(page);
  nota(`respuesta tras ${Date.now() - t0} ms. Justo al llegar: ` + R(await snap(page)));
  await velocidad(page, 5);
  await esperarQuieto(page, { max: 30000 });
  const fin = await snap(page);
  nota('fin: ' + R(fin) + ' código=' + JSON.stringify((await page.inputValue('#codigo'))));
  nota('celdas: ' + fin.pint.join(' ') + ' | colores distintos: ' + [...new Set(fin.pint.map((p) => p.replace(/^\d+,\d+/, '')))].join(','));
  await shot(page, 't3d-chat-durante-animacion');
  nota('chat: ' + JSON.stringify(await chatTxt(page)));

  nota('\n## 2. Frase que la IA rechaza mientras el robot dibuja (la animación no debe cortarse)');
  await velocidad(page, 2);
  await compilar(page, CUADRADO);
  await page.waitForFunction(() => document.querySelectorAll('#tablero .celda.pintada').length >= 2, null, { timeout: 25000 });
  await enviar(page, 'hazme una pizza');
  await esperarRespuesta(page);
  await esperarQuieto(page, { max: 40000 });
  const f2 = await snap(page);
  nota('fin: ' + R(f2) + ' (esperado: 12 casillas rojas del cuadrado)');
  nota('chat (últimos): ' + JSON.stringify((await chatTxt(page)).slice(-2)));

  nota('\n## 3. Pulsar un ejemplo mientras el chat espera la respuesta (auto, rápido)');
  await velocidad(page, 5);
  await enviar(page, 'dibuja un cuadrado verde pequeño');
  await esperar(250);
  const espera = await page.evaluate(() => ({ dis: document.getElementById('texto-chat').disabled, btn: document.getElementById('btn-enviar').textContent, cargando: !!document.querySelector('#historial .mensaje.cargando') }));
  nota('esperando la IA: ' + JSON.stringify(espera));
  await page.click('#lista-ejemplos .ejemplo:nth-child(3)'); // Error léxico
  await esperar(1500);
  nota('1,5 s tras pulsar el ejemplo léxico (la IA aún no responde): ' + R(await snap(page)) + ' editor=' + JSON.stringify(await page.inputValue('#codigo')));
  await shot(page, 't3d-ejemplo-mientras-chat-espera-a');
  await esperarRespuesta(page);
  await esperarQuieto(page, { max: 30000 });
  const f3 = await snap(page);
  nota('tras llegar la respuesta de la IA: ' + R(f3) + ' editor=' + JSON.stringify(await page.inputValue('#codigo')));
  await shot(page, 't3d-ejemplo-mientras-chat-espera-b');
  nota('chat (últimos 6): ' + JSON.stringify((await chatTxt(page)).slice(-6)));

  nota('\n## 4. Mismo caso, pero la IA rechaza (no debe tocar el ejemplo cargado)');
  await enviar(page, 'cuéntame un chiste');
  await esperar(250);
  await page.click('#lista-ejemplos .ejemplo:nth-child(5)'); // semántico
  await esperarRespuesta(page);
  await esperarQuieto(page, { max: 30000 });
  nota('tras la respuesta: ' + R(await snap(page)) + ' editor=' + JSON.stringify(await page.inputValue('#codigo')));
  nota('chat (últimos 5): ' + JSON.stringify((await chatTxt(page)).slice(-5)));

  nota('\n## 5. Mientras la IA responde: Compilar, cambiar de modo y Reiniciar');
  await compilar(page, CUADRADO); await esperarQuieto(page, { max: 30000 });
  await enviar(page, 'dibuja una línea amarilla de 4');
  await esperar(250);
  await page.click('#btn-reiniciar');
  await modoAuto(page, false);
  nota('durante la espera, tras Reiniciar y pasar a paso: ' + R(await snap(page)));
  await esperarRespuesta(page);
  await esperar(500);
  nota('tras la respuesta (modo paso): ' + R(await snap(page)) + ' editor=' + JSON.stringify(await page.inputValue('#codigo')));
  await siguientes(page, 5); await esperarQuieto(page);
  nota('tras 5 Siguientes: ' + R(await snap(page)));

  nota('\n## 6. Tres frases seguidas, cada una al llegar la respuesta anterior, en paso a paso sin tocar nada más');
  for (const f of ['dibuja un cuadrado azul', 'dibuja una escalera roja', 'dibuja una línea verde']) {
    const t = Date.now();
    await enviar(page, f); await esperarRespuesta(page);
    const s = await snap(page);
    nota(`"${f}" (${Date.now() - t} ms): ${R(s)} editor=${JSON.stringify((await page.inputValue('#codigo')).replace(/\n/g, ' / '))}`);
  }
});
