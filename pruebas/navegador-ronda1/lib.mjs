// Utilidades compartidas de los scripts E2E en Brave (solo pruebas; no toca la aplicación).
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, '..', '..');
export const EVID = path.join(RAIZ, 'evidencias', 'brave');
export const OUT = path.join(AQUI, 'out');
mkdirSync(EVID, { recursive: true });
mkdirSync(OUT, { recursive: true });

export const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
export const URL3000 = 'http://localhost:3000/web/';
export const CUADRADO = 'pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin';
export const NOMBRES = ['El Lector', 'El Gramático', 'El Juez', 'El Traductor', 'El Ejecutor'];

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Arranca script con tiempo máximo global; ejecuta fn({ctx,...}) y cierra Brave en finally.
export async function correr(nombre, maxMs, fn, { ancho = 1470, alto = 800, url = URL3000 } = {}) {
  const t0 = Date.now();
  const resultados = [];
  const vigilancia = { consola: [], pageerrors: [], peticionesExternas: [], fallidas: [], totalPeticiones: 0, hosts: {} };
  let browser;
  const reloj = setTimeout(() => {
    console.error(`[${nombre}] TIEMPO MÁXIMO GLOBAL (${maxMs} ms) AGOTADO`);
    guardar();
    process.exit(3);
  }, maxMs);
  function guardar() {
    writeFileSync(path.join(OUT, `${nombre}.json`), JSON.stringify({ nombre, resultados, vigilancia, ms: Date.now() - t0 }, null, 2));
  }
  const caso = (id, veredicto, observaciones, capturas = []) => {
    const r = { id, veredicto, observaciones: [].concat(observaciones), capturas };
    resultados.push(r);
    console.log(`\n== ${id}: ${veredicto}`);
    for (const o of r.observaciones) console.log('   - ' + o);
    guardar();
  };
  try {
    browser = await chromium.launch({ executablePath: BRAVE, headless: true, timeout: 60000 });
    const version = browser.version();
    console.log(`[${nombre}] navegador: ${version}`);
    vigilancia.navegador = version;
    const nuevaPagina = async (opts = {}) => {
      const context = await browser.newContext({ viewport: { width: opts.ancho ?? ancho, height: opts.alto ?? alto } });
      const page = await context.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') vigilancia.consola.push({ tipo: m.type(), texto: m.text(), url: page.url(), ts: Date.now() - t0 });
      });
      page.on('pageerror', (e) => vigilancia.pageerrors.push({ texto: String(e), ts: Date.now() - t0 }));
      page.on('request', (r) => {
        let u;
        try { u = new URL(r.url()); } catch { return; }
        if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return;
        vigilancia.totalPeticiones++;
        vigilancia.hosts[u.host] = (vigilancia.hosts[u.host] || 0) + 1;
        if (!['localhost', '127.0.0.1'].includes(u.hostname)) vigilancia.peticionesExternas.push(r.url());
      });
      page.on('requestfailed', (r) => vigilancia.fallidas.push({ url: r.url(), error: r.failure()?.errorText, ts: Date.now() - t0 }));
      await page.goto(opts.url ?? url, { waitUntil: 'load' });
      await page.waitForSelector('#linea-personajes .personaje');
      return { page, context };
    };
    await fn({ browser, nuevaPagina, caso, vigilancia, t0 });
  } catch (e) {
    console.error(`[${nombre}] ERROR DEL SCRIPT:`, e);
    resultados.push({ id: 'SCRIPT', veredicto: 'ERROR-SCRIPT', observaciones: [String(e && e.stack || e)], capturas: [] });
    process.exitCode = 1;
  } finally {
    clearTimeout(reloj);
    try { await browser?.close(); } catch {}
    guardar();
  }
}

export async function shot(page, nombre) {
  const f = `${nombre}.png`;
  await page.screenshot({ path: path.join(EVID, f) });
  return `evidencias/brave/${f}`;
}

// Foto del estado de la página.
export async function estado(page) {
  return page.evaluate(() => {
    const fases = [...document.querySelectorAll('#linea-personajes .personaje')].map((t) => t.dataset.estado + (t.classList.contains('trabajando') ? '*' : ''));
    const pintadas = [...document.querySelectorAll('#tablero .celda.pintada')].map((c) => {
      const i = [...c.parentElement.children].indexOf(c);
      const color = [...c.classList].find((k) => k.startsWith('c-'))?.slice(2);
      return { x: i % 10, y: Math.floor(i / 10), color };
    });
    const robot = document.querySelector('#tablero .robot');
    const est = document.getElementById('estado-robot').textContent;
    const m = est.match(/\((\d+), (\d+)\)/);
    const banda = document.getElementById('banda');
    const panelTit = document.querySelector('#panel .panel-titulo h2')?.textContent ?? null;
    const panelEstado = document.querySelector('#panel .panel-estado')?.textContent ?? null;
    const vacio = document.querySelector('#panel .panel-vacio-titulo')?.textContent ?? null;
    return {
      fases,
      pintadas,
      robot: m ? { x: +m[1], y: +m[2] } : null,
      estadoRobot: est,
      robotLeftTop: robot ? [robot.style.left, robot.style.top] : null,
      retosHechos: [...document.querySelectorAll('#lista-retos .reto')].map((r) => [r.querySelector('strong').textContent, r.classList.contains('hecho')]),
      panelTit, panelEstado, vacio,
      editor: document.getElementById('codigo').value,
      banda: banda.hidden ? null : { top: banda.style.top, h: banda.style.height },
      numerosError: [...document.querySelectorAll('#numeros .numero')].map((n, i) => (n.classList.contains('con-error') ? i + 1 : 0)).filter(Boolean),
      siguienteDeshab: document.getElementById('btn-siguiente').disabled,
      siguienteNombre: document.getElementById('siguiente-nombre').textContent,
      chat: [...document.querySelectorAll('#historial .mensaje')].map((m) => ({ cls: m.className, texto: m.innerText })),
    };
  });
}

export const resumenPintadas = (e) => {
  const por = {};
  for (const p of e.pintadas) por[p.color] = (por[p.color] || 0) + 1;
  return `${e.pintadas.length} casillas pintadas ${JSON.stringify(por)}`;
};
export const coords = (e) => e.pintadas.map((p) => `(${p.x},${p.y})${p.color}`).join(' ');

// Escribe código en el editor (como si se escribiera) y pulsa Compilar.
export async function escribirYCompilar(page, codigo) {
  await page.fill('#codigo', codigo);
  await page.click('#btn-compilar');
}

// Espera a que termine el recorrido (modo automático o tras el último clic): sin personaje
// "trabajando", con "esperadas" fases reveladas, y el tablero estable un rato.
export async function esperarFin(page, esperadas, { max = 40000 } = {}) {
  const t = Date.now();
  let estable = 0, previo = '';
  while (Date.now() - t < max) {
    const s = await page.evaluate(() => {
      const t = [...document.querySelectorAll('#linea-personajes .personaje')];
      return {
        reveladas: t.filter((x) => x.dataset.estado !== 'espera').length,
        trabajando: t.filter((x) => x.classList.contains('trabajando')).length,
        firma: document.getElementById('estado-robot').textContent + document.querySelectorAll('#tablero .celda.pintada').length,
      };
    });
    if (s.reveladas >= esperadas && s.trabajando === 0) {
      if (s.firma === previo) estable += 1; else estable = 0;
      previo = s.firma;
      if (estable >= 4) return Date.now() - t;
    } else { estable = 0; previo = s.firma; }
    await esperar(150);
  }
  throw new Error('esperarFin: tiempo agotado');
}

// Modo paso a paso: pulsa Siguiente fase n veces.
export async function siguientes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.click('#btn-siguiente');
    await esperar(120);
  }
}

export async function ponerModoAuto(page, si) {
  const actual = (await page.getAttribute('#modo', 'aria-checked')) === 'true';
  if (actual !== si) await page.click('#modo');
}

// Revisa overflow y texto cortado de la página.
export async function medirLayout(page) {
  return page.evaluate(() => {
    const de = document.documentElement, b = document.body;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cortados = [];
    // Elementos con desborde interno oculto/scroll que cortan contenido
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const ox = cs.overflowX, oy = cs.overflowY;
      if ((oy === 'hidden' || oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
        cortados.push({ tipo: 'scrollY-interno', el: el.id || el.className || el.tagName, sh: el.scrollHeight, ch: el.clientHeight, oy });
      }
      if ((ox === 'hidden' || ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2) {
        cortados.push({ tipo: 'scrollX-interno', el: el.id || el.className || el.tagName, sw: el.scrollWidth, cw: el.clientWidth, ox });
      }
      // ellipsis
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) cortados.push({ tipo: 'ellipsis', el: el.className, texto: el.textContent.slice(0, 40) });
    }
    // Elementos de texto que se salen de la ventana
    const fuera = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.hidden || cs.visibility === 'hidden') continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1) fuera.push({ el: el.id || el.className || el.tagName, texto: el.textContent.trim().slice(0, 40), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
    }
    return {
      vw, vh,
      docScroll: [de.scrollWidth - de.clientWidth, de.scrollHeight - de.clientHeight],
      bodyScroll: [b.scrollWidth - b.clientWidth, b.scrollHeight - b.clientHeight],
      cortados, fuera,
    };
  });
}
