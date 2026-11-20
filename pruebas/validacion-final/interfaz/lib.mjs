// Utilidades propias de la validación final de la interfaz (solo pruebas).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const CAP = path.join(AQUI, 'capturas');
export const OUT = path.join(AQUI, 'out');
mkdirSync(CAP, { recursive: true });
mkdirSync(OUT, { recursive: true });
export const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
export const URL3000 = 'http://localhost:3000/web/';
export const CUADRADO = 'pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin';
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function correr(nombre, maxMs, fn, { ancho = 1470, alto = 800 } = {}) {
  const t0 = Date.now();
  const res = { nombre, notas: [], vig: { pageerrors: [], consola: [], dialogos: [], fallidas: [] } };
  let browser;
  const guardar = () => writeFileSync(path.join(OUT, `${nombre}.json`), JSON.stringify({ ...res, ms: Date.now() - t0 }, null, 2));
  const reloj = setTimeout(() => { console.error(`[${nombre}] TIEMPO MAXIMO`); res.notas.push('TIEMPO MAXIMO GLOBAL'); guardar(); process.exit(3); }, maxMs);
  const nota = (s) => { res.notas.push(s); console.log(s); };
  try {
    browser = await chromium.launch({ executablePath: BRAVE, headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], timeout: 60000 });
    const pagina = async (o = {}) => {
      const ctx = await browser.newContext({ viewport: { width: o.ancho ?? ancho, height: o.alto ?? alto } });
      const page = await ctx.newPage();
      page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) res.vig.consola.push({ tipo: m.type(), texto: m.text(), t: Date.now() - t0 }); });
      page.on('pageerror', (e) => res.vig.pageerrors.push({ texto: String(e), t: Date.now() - t0 }));
      page.on('dialog', (d) => { res.vig.dialogos.push(d.message()); d.dismiss(); });
      page.on('requestfailed', (r) => res.vig.fallidas.push({ url: r.url(), e: r.failure()?.errorText }));
      await page.goto(URL3000, { waitUntil: 'load' });
      await page.waitForSelector('#linea-personajes .personaje');
      // contador de pintadas (una vez por celda y por lote)
      await page.evaluate(() => {
        window.__p = { total: 0, porCelda: {} };
        const celdas = [...document.querySelectorAll('#tablero .celda')];
        const obs = new MutationObserver((recs) => {
          const vistos = new Set();
          for (const r of recs) if (r.target.classList?.contains('celda') && r.target.classList.contains('pintada')) vistos.add(r.target);
          for (const t of vistos) { window.__p.total++; const i = celdas.indexOf(t); window.__p.porCelda[i] = (window.__p.porCelda[i] || 0) + 1; }
        });
        celdas.forEach((c) => obs.observe(c, { attributes: true, attributeFilter: ['class'] }));
      });
      return page;
    };
    await fn({ pagina, nota, res, t0 });
  } catch (e) {
    console.error(`[${nombre}] ERROR DEL SCRIPT`, e);
    res.notas.push('ERROR DEL SCRIPT: ' + String(e && e.stack || e));
    process.exitCode = 1;
  } finally {
    clearTimeout(reloj);
    try { await browser?.close(); } catch {}
    guardar();
    console.log(`[${nombre}] pageerrors=${res.vig.pageerrors.length} consola=${res.vig.consola.length} dialogos=${res.vig.dialogos.length} fallidas=${res.vig.fallidas.length}`);
    if (res.vig.pageerrors.length || res.vig.consola.length) console.log(JSON.stringify(res.vig, null, 1));
  }
}

export const shot = async (page, nombre) => { await page.screenshot({ path: path.join(CAP, nombre + '.png') }); return 'capturas/' + nombre + '.png'; };

export const modoAuto = async (page, si) => {
  const a = (await page.getAttribute('#modo', 'aria-checked')) === 'true';
  if (a !== si) await page.click('#modo');
};

// Foto del estado de la página
export const snap = (page) => page.evaluate(() => {
  const t = [...document.querySelectorAll('#linea-personajes .personaje')];
  const fases = t.map((x) => x.dataset.estado + (x.classList.contains('trabajando') ? '*' : ''));
  const pint = [...document.querySelectorAll('#tablero .celda.pintada')].map((c) => {
    const i = [...c.parentElement.children].indexOf(c);
    return `${i % 10},${Math.floor(i / 10)}${[...c.classList].find((k) => k.startsWith('c-'))?.slice(1) ?? ''}`;
  });
  const est = document.getElementById('estado-robot').textContent;
  const panelTit = document.querySelector('#panel .panel-titulo h2')?.textContent ?? null;
  const panelEst = document.querySelector('#panel .panel-estado')?.textContent ?? null;
  const vacio = document.querySelector('#panel .panel-vacio-titulo')?.textContent ?? null;
  const vacioT = document.querySelector('#panel .panel-vacio-texto')?.textContent ?? null;
  const banda = document.getElementById('banda');
  return {
    fases, pintadas: pint.length, pint, robot: est, panelTit, panelEst, vacio, vacioT,
    elegido: t.findIndex((x) => x.classList.contains('elegido')),
    sig: { dis: document.getElementById('btn-siguiente').disabled, n: document.getElementById('siguiente-nombre').textContent },
    banda: !banda.hidden, retos: [...document.querySelectorAll('#lista-retos .reto')].map((r) => r.classList.contains('hecho') ? 1 : 0).join(''),
    aviso: document.getElementById('aviso').hidden ? null : document.getElementById('aviso').textContent,
    p: window.__p?.total, mon: document.querySelector('.monitor-actual')?.textContent ?? null,
    monDet: document.querySelector('.monitor-detalle')?.textContent ?? null,
    monPaso: document.querySelector('.monitor-paso')?.textContent ?? null,
  };
});

export const compilar = async (page, c) => { if (c !== undefined) await page.fill('#codigo', c); await page.click('#btn-compilar'); };

// Espera a que no haya personajes palpitando ni cambios en el tablero durante 'quieto' ms
export async function esperarQuieto(page, { max = 40000, quieto = 700 } = {}) {
  const t = Date.now(); let previo = null; let desde = Date.now();
  while (Date.now() - t < max) {
    const s = await page.evaluate(() => ({
      trab: document.querySelectorAll('#linea-personajes .personaje.trabajando').length,
      firma: document.getElementById('estado-robot').textContent + document.querySelectorAll('#tablero .celda.pintada').length + [...document.querySelectorAll('#linea-personajes .personaje')].map((x) => x.dataset.estado).join(''),
    }));
    const f = s.trab + '|' + s.firma;
    if (s.trab === 0 && f === previo) { if (Date.now() - desde >= quieto) return Date.now() - t; } else { previo = f; desde = Date.now(); }
    await esperar(100);
  }
  throw new Error('esperarQuieto: tiempo agotado');
}

export const velocidad = (page, v) => page.evaluate((v) => { const r = document.getElementById('velocidad'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }, v);

// Pulsa Siguiente fase n veces (esperando un poco)
export async function siguientes(page, n) { for (let i = 0; i < n; i++) { if (await page.$eval('#btn-siguiente', (b) => b.disabled)) break; await page.click('#btn-siguiente'); await esperar(150); } }

// Pulsa el personaje i, abre "¿Qué pasó aquí?" y devuelve lo que se ve
export async function queParo(page, i) {
  const tarjetas = await page.$$('#linea-personajes .personaje');
  await tarjetas[i].click();
  await esperar(120);
  const titulo = await page.textContent('#panel .panel-titulo h2');
  const estadoP = await page.textContent('#panel .panel-estado');
  const abierta = await page.$eval('#panel .burbuja', (x) => !x.hidden);
  if (!abierta) await (await page.$('#panel .panel-cab button')).click();
  await esperar(80);
  const txt = await page.$eval('#panel .burbuja', (x) => x.textContent);
  const html = await page.$eval('#panel .burbuja p', (x) => x.innerHTML);
  return { titulo, estadoP, txt, html };
}
