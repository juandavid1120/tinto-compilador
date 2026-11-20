import { correr, esperar, esperarFin } from './lib.mjs';
await correr('G-red', 120000, async ({ nuevaPagina, caso, vigilancia }) => {
  const { page } = await nuevaPagina();
  const urls = new Map();
  // La carga inicial ya pasó; recargar con vigilancia de URLs completas
  page.on('request', (r) => urls.set(r.url(), (urls.get(r.url()) || 0) + 1));
  await page.reload({ waitUntil: 'load' });
  await esperar(1500);
  await page.click('#lista-ejemplos .ejemplo >> nth=0');
  await esperar(1500);
  await page.fill('#texto-chat', 'dibuja un cuadrado rojo');
  await page.press('#texto-chat', 'Enter');
  await page.waitForResponse((r) => r.url().includes('/api/traducir'), { timeout: 40000 });
  await esperar(3000);
  const lista = [...urls.entries()].map(([u, n]) => `${u} x${n}`);
  const noLocal = lista.filter((u) => !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u));
  // Recursos que la página referencia en HTML/CSS
  const refs = await page.evaluate(() => ({
    links: [...document.querySelectorAll('link[href]')].map((l) => l.href.slice(0, 80)),
    scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src),
    imgs: [...document.querySelectorAll('img[src]')].map((s) => s.src.slice(0, 80)),
    fuentes: [...document.fonts].map((f) => f.family + ' ' + f.status),
  }));
  caso('E2E-37-detalle', noLocal.length === 0 ? 'PASA' : 'FALLA', [`URLs pedidas tras recargar, hacer clic en un ejemplo y enviar un mensaje al chat (${lista.length}): ${lista.join(' ; ')}`, `No locales: ${noLocal.length}`, `Referencias del documento: ${JSON.stringify(refs)}`]);
});
