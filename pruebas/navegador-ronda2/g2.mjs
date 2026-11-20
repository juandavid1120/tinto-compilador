// Grupo 2: R2-06 a R2-10
import { correr, esperar, casillas, fases, pint, resetPint, ponerCodigo, modoAuto, esperarQuieto, velocidad, estadoRobot, scrollPagina, panelTexto, CUADRADO } from './lib.mjs';
import { compilar } from '../../compilador/compilar.js';

// Medidas de lo que se corta dentro del panel
const medirPanel = (page) =>
  page.evaluate(() => {
    const out = { desbordan: [] };
    const panel = document.querySelector('#panel');
    const pr = panel.getBoundingClientRect();
    out.panelRect = [Math.round(pr.width), Math.round(pr.height)];
    out.panelScroll = [panel.scrollWidth, panel.scrollHeight, panel.clientWidth, panel.clientHeight];
    panel.querySelectorAll('*').forEach((e) => {
      const cs = getComputedStyle(e);
      if ((e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(cs.overflowY)) || (e.scrollWidth > e.clientWidth + 1 && /auto|scroll/.test(cs.overflowX))) {
        out.desbordan.push({ clase: e.className.toString().slice(0, 40), scroll: [e.scrollWidth, e.scrollHeight], visible: [e.clientWidth, e.clientHeight], overflowY: cs.overflowY, overflowX: cs.overflowX });
      }
    });
    return out;
  });

function espiral() {
  const segs = [9, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
  const colores = ['rojo', 'azul', 'verde', 'amarillo'];
  const l = [];
  segs.forEach((n, i) => {
    l.push(`pintar ${colores[i % 4]}`);
    l.push(`avanzar ${n}`);
    l.push('girar derecha');
  });
  // 57 lineas; se agregan tres mas al inicio para llegar a 60
  return ['pintar negro', 'pintar rojo', 'pintar azul', ...l].join('\n');
}

await correr('g2', 300000, async ({ pagina, res, foto }) => {
  // ---------- R2-06 ----------
  {
    const page = await pagina({ etiqueta: 'R2-06' });
    const r = {};
    await velocidad(page, 1);
    await modoAuto(page, true);
    r.velocidadValor = await page.inputValue('#velocidad');
    await ponerCodigo(page, CUADRADO);
    await resetPint(page);
    await page.click('#btn-compilar');
    // espera a que el robot haya pintado al menos 3 casillas del cuadrado
    await page.waitForFunction(() => window.__pint.total >= 3, null, { timeout: 25000 });
    r.pintadasAntesDeCambiar = (await casillas(page));
    await foto(page, 'R2-06-a-dibujando-cuadrado');
    // se edita el codigo sin compilar: la animacion sigue
    await ponerCodigo(page, 'pintar verde\navanzar 2\ngirar derecha\navanzar 2');
    const antes = (await pint(page)).total;
    const robotAntes = await estadoRobot(page);
    await esperar(2600);
    r.sigueTrasEditar = { eventosAntes: antes, eventosDespues: (await pint(page)).total, robotAntes, robotDespues: await estadoRobot(page) };
    // ahora se compila otra cosa
    await resetPint(page);
    await page.click('#btn-compilar');
    r.justoDespues = { casillas: await casillas(page), estadoRobot: await estadoRobot(page), fases: await fases(page) };
    await esperarQuieto(page, { quieto: 3000, max: 40000 });
    const p = await pint(page);
    r.final = { casillas: await casillas(page), eventosPintar: p.total, porCelda: p.porCelda, fases: await fases(page), estadoRobot: await estadoRobot(page) };
    await foto(page, 'R2-06-b-final');
    res['R2-06'] = r;
    await page.context().close();
  }

  // ---------- R2-07 ----------
  {
    const page = await pagina({ etiqueta: 'R2-07' });
    const r = {};
    const codigo = espiral();
    r.lineas = codigo.split('\n').length;
    const esp = compilar(codigo);
    r.esperadoCompilador = { error: esp.error ? esp.error.mensaje : null, casillas: esp.casillasPintadas?.length, pasos: esp.pasos?.length };
    await velocidad(page, 5);
    await modoAuto(page, true);
    await ponerCodigo(page, codigo);
    await resetPint(page);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 2500, max: 60000 });
    r.fases = await fases(page);
    r.casillasPintadas = (await casillas(page)).length;
    r.eventosPintar = (await pint(page)).total;
    r.estadoRobot = await estadoRobot(page);
    r.numerosEditor = await page.evaluate(() => document.querySelectorAll('#numeros .numero').length);
    r.editorScroll = await page.evaluate(() => { const e = document.querySelector('#codigo'); return { scrollH: e.scrollHeight, clientH: e.clientHeight }; });
    r.scrollPagina = await scrollPagina(page);
    await foto(page, 'R2-07-a-final');
    r.paneles = [];
    for (let i = 0; i < 5; i++) {
      await page.evaluate((i) => document.querySelectorAll('.personaje')[i].click(), i);
      await esperar(900);
      const m = await medirPanel(page);
      const sp = await scrollPagina(page);
      r.paneles.push({ i, ...m, hayScrollPagina: sp.hayScrollV || sp.hayScrollH });
      await foto(page, `R2-07-panel${i}`);
    }
    // El Traductor: ultima instruccion alcanzable con scroll interno?
    r.traductor = await page.evaluate(() => {
      document.querySelectorAll('.personaje')[3].click();
      const filas = document.querySelectorAll('#panel .instruccion');
      return { filas: filas.length };
    });
    r.errorDeJS = 'ver vigilancia';
    res['R2-07'] = r;
    await page.context().close();
  }

  // ---------- R2-08 ----------
  {
    const page = await pagina({ etiqueta: 'R2-08' });
    const r = {};
    const codigo = [
      'repetir 2 veces:',
      '  repetir 2 veces:',
      '    repetir 2 veces:',
      '      repetir 2 veces:',
      '        repetir 2 veces:',
      '          girar derecha',
      '        fin',
      '      fin',
      '    fin',
      '  fin',
      'fin',
    ].join('\n');
    await velocidad(page, 5);
    await modoAuto(page, true);
    await ponerCodigo(page, codigo);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 2500, max: 40000 });
    r.fases = await fases(page);
    await page.evaluate(() => document.querySelectorAll('.personaje')[1].click());
    await esperar(1800); // animacion del arbol
    r.arbol = await page.evaluate(() => {
      const caja = document.querySelector('.caja-arbol');
      const svg = caja?.querySelector('svg');
      const cr = caja.getBoundingClientRect();
      const nodos = [...caja.querySelectorAll('.arbol-nodo')].map((n) => {
        const b = n.getBoundingClientRect();
        return { t: n.textContent.trim().slice(0, 24), izq: Math.round(b.left), der: Math.round(b.right), arr: Math.round(b.top), aba: Math.round(b.bottom) };
      });
      const fuera = nodos.filter((n) => n.der > cr.right + 1 || n.izq < cr.left - 1 || n.aba > cr.bottom + 1 || n.arr < cr.top - 1);
      let solapes = 0;
      for (let i = 0; i < nodos.length; i++) for (let j = i + 1; j < nodos.length; j++) {
        const a = nodos[i], b = nodos[j];
        if (a.izq < b.der && b.izq < a.der && a.arr < b.aba && b.arr < a.aba) solapes++;
      }
      const cs = getComputedStyle(caja);
      return {
        caja: { visible: [caja.clientWidth, caja.clientHeight], scroll: [caja.scrollWidth, caja.scrollHeight], overflow: [cs.overflowX, cs.overflowY], rect: [Math.round(cr.left), Math.round(cr.right), Math.round(cr.top), Math.round(cr.bottom)] },
        svg: svg ? { attrW: svg.getAttribute('width'), attrH: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), rectW: Math.round(svg.getBoundingClientRect().width) } : null,
        nodos: nodos.length,
        textosNodos: nodos.map((n) => n.t),
        nodosFueraDeLaVista: fuera.map((n) => n.t + ` (der=${n.der}, limite=${Math.round(cr.right)})`),
        solapes,
        barraScrollVisibleX: caja.offsetHeight - caja.clientHeight,
      };
    });
    r.scrollPagina = await scrollPagina(page);
    r.panelDesborda = await medirPanel(page);
    await foto(page, 'R2-08-a-arbol');
    // con scroll al maximo
    await page.evaluate(() => { const c = document.querySelector('.caja-arbol'); c.scrollLeft = c.scrollWidth; });
    await esperar(300);
    await foto(page, 'R2-08-b-arbol-scroll-derecha');
    // el panel del Ejecutor tras 5 ciclos
    await page.evaluate(() => document.querySelectorAll('.personaje')[4].click());
    await esperar(500);
    r.ejecutor = await panelTexto(page).then((t) => t.slice(0, 300));
    r.casillas = (await casillas(page)).length;
    res['R2-08'] = r;
    await page.context().close();
  }

  // ---------- R2-09 ----------
  {
    const page = await pagina({ etiqueta: 'R2-09' });
    const r = {};
    const codigo = 'repetir 100 veces:\n  repetir 100 veces:\n    repetir 100 veces:\n      girar derecha\n    fin\n  fin\nfin';
    await modoAuto(page, true);
    await ponerCodigo(page, codigo);
    // Mide cuanto se queda congelado el hilo principal al compilar
    r.medidaCompilar = await page.evaluate(() => {
      const t0 = performance.now();
      document.querySelector('#btn-compilar').click();
      return { msBloqueado: Math.round(performance.now() - t0) };
    });
    // La pagina sigue respondiendo?
    const t1 = Date.now();
    await page.evaluate(() => 1);
    r.respuestaPaginaMs = Date.now() - t1;
    await esperarQuieto(page, { quieto: 2000, max: 30000 });
    r.fases = await fases(page);
    r.panel = await panelTexto(page);
    r.lineaMarcada = await page.evaluate(() => ({ bandaVisible: !document.querySelector('#banda').hidden, numerosConError: [...document.querySelectorAll('#numeros .con-error')].map((n) => n.textContent) }));
    r.casillas = (await casillas(page)).length;
    r.retoMarcado = await page.evaluate(() => [...document.querySelectorAll('.reto.hecho strong')].map((s) => s.textContent));
    await foto(page, 'R2-09-a');
    // sigue usable: se puede compilar el cuadrado despues
    await ponerCodigo(page, CUADRADO);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 2500, max: 30000 });
    r.despues = { fases: await fases(page), casillas: (await casillas(page)).length };
    await foto(page, 'R2-09-b-despues');
    res['R2-09'] = r;
    await page.context().close();
  }

  // ---------- R2-10 ----------
  {
    const page = await pagina({ etiqueta: 'R2-10' });
    const r = {};
    const codigo = 'avanzar 99999999999999999999999';
    r.compiladorDirecto = (() => { const x = compilar(codigo); return x.error ? { fase: x.error.fase, linea: x.error.linea, mensaje: x.error.mensaje } : 'sin error'; })();
    await modoAuto(page, true);
    await ponerCodigo(page, codigo);
    r.medida = await page.evaluate(() => { const t0 = performance.now(); document.querySelector('#btn-compilar').click(); return Math.round(performance.now() - t0); });
    await esperarQuieto(page, { quieto: 2000, max: 20000 });
    r.fases = await fases(page);
    r.panel = await panelTexto(page);
    r.casillas = (await casillas(page)).length;
    r.respondeTrasCompilar = await page.evaluate(() => 1);
    await foto(page, 'R2-10');
    res['R2-10'] = r;
    await page.context().close();
  }
});
