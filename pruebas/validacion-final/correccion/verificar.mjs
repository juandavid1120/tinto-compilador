// Verificación de la corrección de "¿Qué pasó aquí?" y del reto de la letra (solo pruebas).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = process.argv[2] ?? 'despues';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const CASOS = [
  ['sintactico', 'repetir 4 veces:\n  avanzar 3\n  girar derecha'],
  ['semantico', 'avanzar 99'],
  ['lexico', 'avanzar @3'],
  ['cuadrado', 'pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin'],
  ['L', 'girar derecha\navanzar 5\ngirar izquierda\navanzar 3'],
];
const out = { casos: {}, vig: { pageerrors: [], consola: [] }, reto: null };
const reloj = setTimeout(() => { console.error('TIEMPO MAXIMO'); process.exit(3); }, 120000);
let browser;
try {
  browser = await chromium.launch({ executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true, timeout: 60000 });
  const ctx = await browser.newContext({ viewport: { width: 1470, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) out.vig.consola.push(m.text()); });
  page.on('pageerror', (e) => out.vig.pageerrors.push(String(e)));
  await page.goto('http://localhost:3000/web/', { waitUntil: 'load' });
  await page.waitForSelector('#linea-personajes .personaje');
  for (const [id, cod] of CASOS) {
    await page.fill('#codigo', cod);
    await page.click('#btn-compilar');
    for (let i = 0; i < 6; i++) { if (await page.$eval('#btn-siguiente', (b) => b.disabled)) break; await page.click('#btn-siguiente'); await esperar(200); }
    await esperar(400);
    const tarjetas = await page.$$('#linea-personajes .personaje');
    const estados = await Promise.all(tarjetas.map((t) => t.evaluate((x) => x.dataset.estado)));
    const pers = [];
    for (let i = 0; i < 5; i++) {
      if (estados[i] === 'espera') { pers.push({ estado: 'espera' }); continue; }
      await tarjetas[i].click(); await esperar(150);
      const titulo = await page.textContent('#panel .panel-titulo h2');
      const estadoP = await page.textContent('#panel .panel-estado');
      if (await page.$eval('#panel .burbuja', (x) => x.hidden)) await (await page.$('#panel .panel-cab button')).click();
      await esperar(100);
      const txt = (await page.$eval('#panel .burbuja p', (x) => x.textContent)).trim();
      pers.push({ titulo, estadoP, estado: estados[i], txt });
    }
    const pint = await page.$$eval('#tablero .celda.pintada', (cs) => cs.map((c) => { const k = [...c.parentElement.children].indexOf(c); return `${k % 10},${Math.floor(k / 10)}`; }));
    out.casos[id] = { pers, pintadas: pint };
  }
  // reto
  const retos = await page.$$('#lista-retos .reto');
  for (const r of retos) {
    const t = await r.$eval('.reto-titulo strong', (x) => x.textContent);
    if (!/letra|inicial/.test(t)) continue;
    await (await r.$('.reto-titulo')).click(); await esperar(200);
    const detalle = await r.$$eval('.reto-detalle p', (ps) => ps.map((p) => p.textContent));
    const cortes = await r.evaluate((el) => [...el.querySelectorAll('.reto-titulo, .reto-detalle p')].map((n) => ({ sw: n.scrollWidth, cw: n.clientWidth, sh: n.scrollHeight, ch: n.clientHeight })));
    const caja = await r.boundingBox();
    const zona = await page.$eval('.retos-zona', (z) => { const b = z.getBoundingClientRect(); return { bottom: b.bottom, h: innerHeight, sw: z.scrollWidth, cw: z.clientWidth }; });
    out.reto = { titulo: t, detalle, cortes, caja, zona };
    await r.screenshot({ path: path.join(AQUI, 'reto.png') });
    await page.screenshot({ path: path.join(AQUI, 'pagina-reto.png') });
  }
} catch (e) { console.error('ERROR', e); process.exitCode = 1; }
finally { clearTimeout(reloj); try { await browser?.close(); } catch {} writeFileSync(path.join(AQUI, `${SALIDA}.json`), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2)); }
