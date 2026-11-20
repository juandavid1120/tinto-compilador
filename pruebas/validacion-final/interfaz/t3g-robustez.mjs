// Tarea 2/3: respuestas raras del chat (simuladas en el navegador, sin tocar el servidor),
// tormentas de clics, HTML en las burbujas y programas enormes.
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, siguientes, compilar, velocidad, queParo, CUADRADO } from './lib.mjs';

const R = (s) => `fases=${s.fases.join(',')} pint=${s.pintadas} robot="${s.robot.replace('Robot en ', '')}" panel=${s.panelTit ?? '-'}/${s.panelEst ?? '-'}${s.vacio ? ` vacio="${s.vacio}"` : ''} sig=${s.sig.dis ? 'off' : 'on:' + s.sig.n} banda=${s.banda}`;
const chatUlt = (page, n = 2) => page.$$eval('#historial .mensaje', (m, n) => m.slice(-n).map((x) => (x.classList.contains('aviso') ? 'AVISO: ' : x.classList.contains('cargando') ? 'CARGANDO: ' : x.classList.contains('usuario') ? 'U: ' : 'IA: ') + x.innerText.replace(/\n+/g, ' / ').slice(0, 140)), n);
async function enviar(page, texto) { await page.fill('#texto-chat', texto); await page.press('#texto-chat', 'Enter'); }
const ui = (page) => page.evaluate(() => ({ dis: document.getElementById('texto-chat').disabled, btn: document.getElementById('btn-enviar').textContent, cargando: !!document.querySelector('#historial .mensaje.cargando'), foco: document.activeElement?.id }));

await correr('t3g-robustez', 400000, async ({ pagina, nota, res }) => {
  const page = await pagina();
  await velocidad(page, 5);

  nota('## A. Respuestas raras de /api/traducir (simuladas)');
  const casos = [
    ['HTTP 500', (r) => r.fulfill({ status: 500, body: 'boom' })],
    ['JSON roto', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo": "pint' })],
    ['null', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' })],
    ['arreglo []', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })],
    ['{} vacío', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })],
    ['{error:"x"}', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"error":"x"}' })],
    ['codigo vacío', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo":"  "}' })],
    ['noPuedo vacío', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"noPuedo":""}' })],
    ['noPuedo con HTML', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"noPuedo":"<img src=x onerror=\\"document.title=\'HACK\'\\"> no"}' })],
    ['codigo con HTML', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo":"avanzar <img src=x onerror=\\"document.title=\'HACK\'\\">"}' })],
    ['codigo numérico', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo":42}' })],
    ['codigo y noPuedo', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo":"avanzar 2","noPuedo":"no"}' })],
    ['conexión abortada', (r) => r.abort('failed')],
  ];
  for (const [nombre, h] of casos) {
    await page.route('**/api/traducir', h);
    await enviar(page, 'prueba ' + nombre);
    await page.waitForFunction(() => !document.querySelector('#historial .mensaje.cargando'), null, { timeout: 8000 }).catch(() => {});
    await esperar(150);
    const u = await ui(page);
    const s = await snap(page);
    const titulo = await page.title();
    nota(`[${nombre}] ui=${JSON.stringify(u)} título="${titulo.slice(0, 30)}" editor=${JSON.stringify((await page.inputValue('#codigo')).slice(0, 60))} fases=${s.fases.join(',')} chat=${JSON.stringify(await chatUlt(page, 1))}`);
    await page.unroute('**/api/traducir');
  }
  await shot(page, 't3g-respuestas-raras');

  nota('\n## B. La IA tarda más de 20 s (el cliente debe abandonar) y luego responde');
  await page.route('**/api/traducir', async (r) => { await new Promise((x) => setTimeout(x, 23000)); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"codigo":"avanzar 2"}' }).catch(() => {}); });
  await compilar(page, CUADRADO); await esperarQuieto(page, { max: 30000 });
  const antesTxt = await page.inputValue('#codigo');
  await enviar(page, 'frase lenta');
  const t0 = Date.now();
  await page.waitForFunction(() => !document.querySelector('#historial .mensaje.cargando'), null, { timeout: 30000 });
  const dt = Date.now() - t0;
  await esperar(300);
  nota(`indicador de carga desapareció a los ${dt} ms; ui=${JSON.stringify(await ui(page))}; chat=${JSON.stringify(await chatUlt(page, 1))}`);
  await esperar(4000); // llega la respuesta tardía del servidor falso
  nota(`4 s después (llegó la respuesta tardía): editor intacto=${(await page.inputValue('#codigo')) === antesTxt}; ${R(await snap(page))}`);
  await page.unroute('**/api/traducir');

  nota('\n## C. Tormenta de clics en el interruptor de modo durante una corrida');
  for (const vel of [3]) {
    await velocidad(page, vel);
    await modoAuto(page, false);
    await compilar(page, CUADRADO);
    await page.evaluate(() => { for (const k of Object.keys(window.__p.porCelda)) delete window.__p.porCelda[k]; window.__p.total = 0; });
    await modoAuto(page, true);
    for (let i = 0; i < 9; i++) { await page.click('#modo'); await esperar(180); }
    await modoAuto(page, true);
    await esperarQuieto(page, { max: 40000 });
    const s = await snap(page);
    const dup = await page.evaluate(() => Object.values(window.__p.porCelda).filter((v) => v > 1).length);
    nota(`tras 9 alternancias paso/auto: ${R(s)} duplicados=${dup} total eventos=${s.p}`);
  }
  nota('   Automático pulsado cinco veces seguidas durante la corrida:');
  await modoAuto(page, true); await compilar(page, CUADRADO);
  await page.evaluate(() => { for (const k of Object.keys(window.__p.porCelda)) delete window.__p.porCelda[k]; window.__p.total = 0; });
  for (let i = 0; i < 5; i++) { await page.click('#modo-auto'); await esperar(300); }
  await esperarQuieto(page, { max: 40000 });
  const s2 = await snap(page);
  nota(`   ${R(s2)} duplicados=${await page.evaluate(() => Object.values(window.__p.porCelda).filter((v) => v > 1).length)}`);

  nota('\n## D. Ejemplos pulsados muy rápido (auto)');
  await page.evaluate(() => { for (const k of Object.keys(window.__p.porCelda)) delete window.__p.porCelda[k]; window.__p.total = 0; });
  for (const n of [1, 2, 3, 4, 5, 1, 2, 1]) { await page.click(`#lista-ejemplos .ejemplo:nth-child(${n})`, { noWaitAfter: true }); await esperar(60); }
  await esperarQuieto(page, { max: 40000 });
  const s3 = await snap(page);
  nota(`último fue "cuadrado": ${R(s3)} eventos=${s3.p} duplicados=${await page.evaluate(() => Object.values(window.__p.porCelda).filter((v) => v > 1).length)}`);
  await modoAuto(page, false);

  nota('\n## E. HTML y texto raro en las burbujas de "¿Qué pasó aquí?" y en los paneles');
  await compilar(page, 'avanzar <img src=x onerror="document.title=\'HACK\'">'); await siguientes(page, 5);
  let q = await queParo(page, 0);
  nota(`lex html: txt=${q.txt} || html=${q.html} || título="${(await page.title()).slice(0, 25)}" imgs en la página=${await page.$$eval('img', (i) => i.length)}`);
  const largo = 'a'.repeat(600);
  await compilar(page, `pintar rojo\n${largo}`); await siguientes(page, 5);
  const m = await page.evaluate(() => { const d = document.documentElement; return { sx: d.scrollWidth - d.clientWidth, sy: d.scrollHeight - d.clientHeight, panelW: document.getElementById('panel').getBoundingClientRect().width }; });
  q = await queParo(page, 0);
  nota(`palabra de 600 letras: scroll de página=${m.sx},${m.sy} panel ancho=${Math.round(m.panelW)} burbuja="${q.txt.slice(0, 100)}…(${q.txt.length} car.)"`);
  await shot(page, 't3g-palabra-larga');

  nota('\n## F. Programas enormes');
  for (const [nombre, cod] of [
    ['1500 líneas "girar derecha"', Array(1500).fill('girar derecha').join('\n')],
    ['1500 líneas intercaladas avanzar 1/girar (se sale)', Array(750).fill('avanzar 1\ngirar derecha').join('\n')],
    ['repetir 100 x repetir 90: girar (9000 pasos)', 'repetir 100 veces:\n  repetir 90 veces:\n    girar derecha\n  fin\nfin'],
    ['50 ciclos anidados', Array.from({ length: 50 }, () => 'repetir 1 veces:').join('\n') + '\navanzar 1\n' + Array(50).fill('fin').join('\n')],
    ['51 ciclos anidados', Array.from({ length: 51 }, () => 'repetir 1 veces:').join('\n') + '\navanzar 1\n' + Array(51).fill('fin').join('\n')],
  ]) {
    await modoAuto(page, false); await velocidad(page, 5);
    const t = Date.now();
    await page.fill('#codigo', cod);
    const tf = Date.now() - t;
    const t1 = Date.now();
    await page.click('#btn-compilar');
    const tc = Date.now() - t1;
    await siguientes(page, 5);
    const s = await snap(page);
    nota(`[${nombre}] fill=${tf} ms, clic Compilar=${tc} ms, ${R(s)}`);
    await page.click('#btn-reiniciar');
  }
});
