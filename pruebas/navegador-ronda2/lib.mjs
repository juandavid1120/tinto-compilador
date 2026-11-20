// Utilidades de los scripts de la ronda 2 en Brave (solo pruebas; no toca la aplicación).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, '..', '..');
export const EVID = path.join(RAIZ, 'evidencias', 'brave-r2');
export const OUT = path.join(AQUI, 'out');
mkdirSync(EVID, { recursive: true });
mkdirSync(OUT, { recursive: true });

export const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
export const URL3000 = 'http://localhost:3000/web/';
export const CUADRADO = 'pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin';
export const NOMBRES = ['El Lector', 'El Gramático', 'El Juez', 'El Traductor', 'El Ejecutor'];
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Cuenta pintadas: un MutationObserver anota cada vez que una celda queda "pintada" (una vez por lote).
const INIT = () => {
  window.__pint = { total: 0, porCelda: {}, log: [] };
  const obs = new MutationObserver((records) => {
    const vistos = new Set();
    for (const r of records) {
      const t = r.target;
      if (t.classList && t.classList.contains('celda') && t.classList.contains('pintada')) vistos.add(t);
    }
    for (const t of vistos) {
      const rej = t.parentElement;
      const idx = rej ? Array.prototype.indexOf.call(rej.children, t) : -1;
      const k = `${idx % 10},${Math.floor(idx / 10)}`;
      window.__pint.total++;
      window.__pint.porCelda[k] = (window.__pint.porCelda[k] || 0) + 1;
      window.__pint.log.push([Math.round(performance.now()), k]);
    }
  });
  obs.observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
};

// Ejecuta fn con un navegador Brave y cierra siempre. Tiempo máximo global.
export async function correr(nombre, maxMs, fn) {
  const t0 = Date.now();
  const res = {};
  const vig = { pageerrors: [], consola: [], dialogos: [], fallidas: [] };
  let browser;
  const guardar = () => writeFileSync(path.join(OUT, `${nombre}.json`), JSON.stringify({ res, vig, ms: Date.now() - t0 }, null, 2));
  const reloj = setTimeout(async () => {
    console.error(`[${nombre}] TIEMPO MAXIMO GLOBAL AGOTADO`);
    res.__timeout = true;
    guardar();
    try { await browser?.close(); } catch {}
    process.exit(3);
  }, maxMs);
  try {
    browser = await chromium.launch({
      executablePath: BRAVE,
      headless: true,
      args: ['--e2e-brave-r2-marca'],
      ignoreDefaultArgs: ['--hide-scrollbars'],
    });
    const helpers = {
      browser,
      res,
      vig,
      // Abre una página nueva con vigilancia.
      async pagina({ ancho = 1470, alto = 800, dsf = 1, etiqueta = '', url = URL3000, sinIr = false } = {}) {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: dsf });
        const page = await ctx.newPage();
        const mk = (t) => `${etiqueta ? etiqueta + ' | ' : ''}${t}`;
        page.on('pageerror', (e) => vig.pageerrors.push(mk(String(e.message || e))));
        page.on('console', (m) => {
          if (['error', 'warning'].includes(m.type())) vig.consola.push(mk(`${m.type()}: ${m.text()}`));
        });
        page.on('dialog', (d) => { vig.dialogos.push(mk(`${d.type()}: ${d.message()}`)); d.dismiss().catch(() => {}); });
        page.on('requestfailed', (r) => vig.fallidas.push(mk(`${r.method()} ${r.url()} ${r.failure()?.errorText}`)));
        await page.addInitScript(INIT);
        if (!sinIr) {
          await page.goto(url, { waitUntil: 'load' });
          await page.waitForSelector('#btn-compilar');
        }
        return page;
      },
      async foto(page, nombreArchivo, opciones = {}) {
        const ruta = path.join(EVID, `${nombreArchivo}.png`);
        await page.screenshot({ path: ruta, ...opciones });
        return ruta;
      },
    };
    await fn(helpers);
  } catch (e) {
    console.error(`[${nombre}] ERROR DEL SCRIPT:`, e);
    res.__errorScript = String(e.stack || e);
    process.exitCode = 1;
  } finally {
    clearTimeout(reloj);
    try { await browser?.close(); } catch {}
    guardar();
    console.log(JSON.stringify({ res, vig, ms: Date.now() - t0 }, null, 2));
  }
}

// ---- Lectura del estado de la página ----
export const casillas = (page) =>
  page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.rejilla .celda').forEach((c, i) => {
      if (c.classList.contains('pintada')) {
        const color = [...c.classList].find((k) => k.startsWith('c-'));
        out.push(`${i % 10},${Math.floor(i / 10)}:${color ? color.slice(2) : '?'}`);
      }
    });
    return out;
  });

export const fases = (page) => page.evaluate(() => [...document.querySelectorAll('.personaje')].map((p) => p.dataset.estado));
export const pint = (page) => page.evaluate(() => ({ total: window.__pint.total, porCelda: window.__pint.porCelda }));
export const resetPint = (page) => page.evaluate(() => { window.__pint.total = 0; window.__pint.porCelda = {}; window.__pint.log = []; });
export const estadoRobot = (page) => page.evaluate(() => document.querySelector('#estado-robot').textContent);
export const panelTexto = (page) => page.evaluate(() => document.querySelector('#panel').innerText);
export const ponerCodigo = (page, t) => page.fill('#codigo', t);
export const velocidad = (page, v) =>
  page.evaluate((v) => {
    const r = document.querySelector('#velocidad');
    r.value = String(v);
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
export const modoAuto = async (page, si = true) => {
  const actual = await page.getAttribute('#modo', 'aria-checked');
  if ((actual === 'true') !== si) await page.click('#modo');
};
export const scrollPagina = (page) =>
  page.evaluate(() => {
    const d = document.documentElement;
    const b = document.body;
    return {
      ventana: [innerWidth, innerHeight],
      docScroll: [d.scrollWidth, d.scrollHeight, d.clientWidth, d.clientHeight],
      bodyScroll: [b.scrollWidth, b.scrollHeight, b.clientWidth, b.clientHeight],
      hayScrollV: d.scrollHeight > d.clientHeight + 1 || b.scrollHeight > b.clientHeight + 1,
      hayScrollH: d.scrollWidth > d.clientWidth + 1 || b.scrollWidth > b.clientWidth + 1,
    };
  });

// Espera a que el robot termine: la cuenta de pintadas y la posición dejan de cambiar durante 'quieto' ms
export async function esperarQuieto(page, { quieto = 1200, max = 30000 } = {}) {
  const t0 = Date.now();
  let ultimo = '';
  let desde = Date.now();
  while (Date.now() - t0 < max) {
    const s = JSON.stringify([await page.evaluate(() => window.__pint.total), await estadoRobot(page), await fases(page)]);
    if (s !== ultimo) { ultimo = s; desde = Date.now(); }
    else if (Date.now() - desde >= quieto) return true;
    await esperar(150);
  }
  return false;
}

// Espera a que la IA termine (botón Enviar vuelve a "Enviar").
export async function esperarIA(page, max = 35000) {
  await page.waitForFunction(() => document.querySelector('#btn-enviar').textContent === 'Enviar' && !document.querySelector('#historial .cargando'), null, { timeout: max });
}
