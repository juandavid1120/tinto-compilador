import { writeFileSync } from 'node:fs';
import { correr, estado, shot, esperar, esperarFin, ponerModoAuto, OUT } from './lib.mjs';

// Mide scroll de página, texto cortado y texto montado sobre otro.
async function medir(page) {
  return page.evaluate(() => {
    const de = document.documentElement, b = document.body;
    const vw = window.innerWidth, vh = window.innerHeight;
    window.scrollTo(0, 5000); window.scrollTo(5000, window.scrollY);
    const intentoScroll = [window.scrollX, window.scrollY];
    window.scrollTo(0, 0);
    const out = { vw, vh,
      docExceso: [de.scrollWidth - de.clientWidth, de.scrollHeight - de.clientHeight],
      bodyExceso: [b.scrollWidth - b.clientWidth, b.scrollHeight - b.clientHeight],
      intentoScroll, cortados: [], fuera: [], solapes: [] };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const items = [];
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || ['SCRIPT', 'STYLE', 'TITLE', 'OPTION'].includes(el.tagName)) continue;
      if (el.closest('[hidden]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      // ¿algún ancestro con opacidad 0?
      let oculto = false;
      for (let a = el; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || parseFloat(c.opacity) === 0) { oculto = true; break; } }
      if (oculto) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rect = r.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const nombre = (el.id ? '#' + el.id : '') + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);
      const texto = n.textContent.trim().slice(0, 45);
      // Parte visible: se recorta contra cada ancestro que corta (overflow distinto de visible) y la ventana.
      const area = (q) => Math.max(0, q.r - q.l) * Math.max(0, q.b - q.t);
      const lineas = [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0).map((q) => ({ l: q.left, t: q.top, r: q.right, b: q.bottom }));
      let contenedor = null;
      const visibles = lineas.map((q0) => {
        let q = { ...q0 };
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
          const c = getComputedStyle(a);
          if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
          const ar = a.getBoundingClientRect();
          const nq = { l: Math.max(q.l, ar.left), t: Math.max(q.t, ar.top), r: Math.min(q.r, ar.right), b: Math.min(q.b, ar.bottom) };
          if (area(nq) < area(q) - 1 && !contenedor) contenedor = (a.id ? '#' + a.id : '') + '.' + (typeof a.className === 'string' ? a.className.split(' ')[0] : a.tagName);
          q = nq;
        }
        q = { l: Math.max(q.l, 0), t: Math.max(q.t, 0), r: Math.min(q.r, vw), b: Math.min(q.b, vh) };
        return q;
      });
      const total = lineas.reduce((x, q) => x + area(q), 0);
      const vis = visibles.reduce((x, q) => x + area(q), 0);
      const frac = total ? vis / total : 1;
      if (frac < 0.02) out.cortados.push({ tipo: 'oculto-requiere-scroll-interno', nombre, texto, contenedor: contenedor ?? 'ventana' });
      else if (frac < 0.97) out.cortados.push({ tipo: 'cortado-parcial', nombre, texto, contenedor: contenedor ?? 'ventana', visible: Math.round(frac * 100) + '%', r: [rect.left, rect.top, rect.right, rect.bottom].map(Math.round) });
      if (frac >= 0.02) items.push({ el, rects: visibles.filter((q) => area(q) > 0), nombre, texto });
    }
    // solapes entre la parte visible de textos de elementos distintos
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      for (const ra of A.rects) for (const rb of B.rects) {
        const w = Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l);
        const h = Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t) - 3;
        if (w > 3 && h > 2) out.solapes.push({ a: `${A.nombre} "${A.texto}"`, b: `${B.nombre} "${B.texto}"`, w: Math.round(w), h: Math.round(h) });
      }
    }
    return out;
  });
}

const resultados = {};
await correr('F-presentacion', 900000, async ({ nuevaPagina, caso }) => {
  const tamanos = [[1440, 900], [1280, 720], [1470, 800]];
  const resumenCaso = [];
  const todasCaps = [];
  for (const [w, h] of tamanos) {
    const { page } = await nuevaPagina({ ancho: w, alto: h });
    const tag = `${w}x${h}`;
    const medidas = {};
    const estados = [];
    const tomar = async (nombre, nombreCaptura) => {
      await esperar(2800); // animaciones de aparición (árbol, revisiones)
      const m = await medir(page);
      medidas[nombre] = m;
      const cap = await shot(page, `E2E-35-${tag}-${nombreCaptura}`);
      todasCaps.push(cap);
      return m;
    };
    await tomar('inicial', 'inicial');
    // Cuadrado terminado (modo automático, ejemplo guardado) y sus paneles
    await ponerModoAuto(page, true);
    await page.click('#lista-ejemplos .ejemplo >> nth=0');
    await esperarFin(page, 5);
    await tomar('cuadrado/Ejecutor', 'cuadrado-ejecutor');
    for (const [i, nom] of [[0, 'Lector'], [1, 'Gramatico'], [2, 'Juez'], [3, 'Traductor']]) {
      await page.locator('#linea-personajes .personaje').nth(i).click();
      await tomar(`cuadrado/${nom}`, `cuadrado-${nom.toLowerCase()}`);
    }
    // Errores
    for (const [idx, nom, fase] of [[2, 'error-lexico', 1], [3, 'error-sintactico', 2], [4, 'error-semantico', 3]]) {
      await page.click(`#lista-ejemplos .ejemplo >> nth=${idx}`);
      await esperarFin(page, fase);
      await tomar(nom, nom);
    }
    // Un error en la línea 3 de un programa más largo (el editor con más líneas)
    await page.fill('#codigo', 'pintar rojo\nrepetir 5 veces:\n  avanzar 4\nfin');
    await page.click('#btn-compilar');
    await esperarFin(page, 3);
    await tomar('error-ciclo', 'error-ciclo');
    resultados[tag] = medidas;
    await page.close();
  }
  writeFileSync(`${OUT}/F-medidas.json`, JSON.stringify(resultados, null, 2));
  // resumen en consola
  for (const [tag, ms] of Object.entries(resultados)) {
    console.log(`\n##### ${tag}`);
    for (const [nom, m] of Object.entries(ms)) {
      const parcial = m.cortados.filter((c) => c.tipo === 'cortado-parcial');
      const oculto = m.cortados.filter((c) => c.tipo !== 'cortado-parcial');
      console.log(`${nom}: docExceso=${m.docExceso} bodyExceso=${m.bodyExceso} scrollIntento=${m.intentoScroll} | cortado-parcial=${parcial.length} oculto-scroll-interno=${oculto.length} fuera-ventana=${m.fuera.length} solapes=${m.solapes.length}`);
      for (const c of parcial) console.log(`    CORTADO ${c.nombre} "${c.texto}" en ${c.contenedor} visible=${c.visible} r=${c.r}`);
      for (const c of oculto.slice(0, 6)) console.log(`    oculto  ${c.nombre} "${c.texto}" en ${c.contenedor}`);
      for (const f of m.fuera.slice(0, 4)) console.log(`    FUERA   ${f.nombre} "${f.texto}" ${f.r}`);
      for (const s of m.solapes.slice(0, 5)) console.log(`    SOLAPE  ${s.a} x ${s.b} (${s.w}x${s.h})`);
    }
  }
  caso('E2E-35-medidas', 'INFO', ['Medidas guardadas en e2e-brave/out/F-medidas.json; el veredicto se emite tras revisar las capturas.'], todasCaps);
});
