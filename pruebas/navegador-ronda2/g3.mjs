// Grupo 3: R2-11 a R2-15
import { correr, esperar, casillas, fases, pint, resetPint, ponerCodigo, modoAuto, esperarQuieto, velocidad, estadoRobot, panelTexto, scrollPagina, CUADRADO } from './lib.mjs';
import { compilar } from '../../compilador/compilar.js';

const CUAD_CASILLAS = ['0,0:rojo', '1,0:rojo', '2,0:rojo', '3,0:rojo', '0,1:rojo', '3,1:rojo', '0,2:rojo', '3,2:rojo', '0,3:rojo', '1,3:rojo', '2,3:rojo', '3,3:rojo'];
const mismas = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

await correr('g3', 300000, async ({ pagina, res, foto }) => {
  // ---------- R2-11 ----------
  {
    const page = await pagina({ etiqueta: 'R2-11' });
    await modoAuto(page, true);
    await velocidad(page, 5);
    const r = { casos: [] };
    for (const [n, codigo] of [['a', 'avanzár 3'], ['b', 'año 3'], ['c', 'avanzar 🚀']]) {
      await ponerCodigo(page, codigo);
      await page.click('#btn-compilar');
      await esperarQuieto(page, { quieto: 1800, max: 15000 });
      const info = await page.evaluate(() => ({
        panelCab: document.querySelector('#panel .panel-cab')?.innerText.replace(/\n/g, ' | '),
        explicacion: document.querySelector('#panel .error-explicacion')?.textContent,
        mensaje: document.querySelector('#panel .error-mensaje')?.textContent,
        banda: !document.querySelector('#banda').hidden,
        numerosConError: [...document.querySelectorAll('#numeros .con-error')].map((n) => n.textContent),
      }));
      const directo = compilar(codigo);
      r.casos.push({ codigo, fases: await fases(page), ...info, compiladorDirecto: directo.error ? { fase: directo.error.fase, mensaje: directo.error.mensaje } : null });
      await foto(page, `R2-11-${n}`);
    }
    res['R2-11'] = r;
    await page.context().close();
  }

  // ---------- R2-12 ----------
  {
    const page = await pagina({ etiqueta: 'R2-12' });
    await modoAuto(page, true);
    await velocidad(page, 5);
    const r = { variantes: [] };
    const variantes = [
      ['crlf-fill', 'fill', 'pintar rojo\r\nrepetir 4 veces:\r\n  avanzar 3\r\n  girar derecha\r\nfin'],
      ['crlf-insertText', 'insertText', 'pintar rojo\r\nrepetir 4 veces:\r\n  avanzar 3\r\n  girar derecha\r\nfin'],
      ['tabulaciones-fill', 'fill', 'pintar rojo\nrepetir 4 veces:\n\tavanzar 3\n\tgirar derecha\nfin'],
      ['tabulaciones-insertText', 'insertText', 'pintar rojo\nrepetir 4 veces:\n\tavanzar 3\n\tgirar derecha\nfin'],
      ['crlf-y-tabs-fill', 'fill', 'pintar rojo\r\nrepetir 4 veces:\r\n\tavanzar 3\r\n\tgirar derecha\r\nfin\r\n'],
    ];
    for (const [nombre, via, texto] of variantes) {
      await ponerCodigo(page, '');
      if (via === 'fill') await page.fill('#codigo', texto);
      else { await page.focus('#codigo'); await page.keyboard.insertText(texto); }
      const valor = await page.inputValue('#codigo');
      await page.click('#btn-compilar');
      await esperarQuieto(page, { quieto: 1800, max: 20000 });
      const cs = await casillas(page);
      r.variantes.push({
        nombre, via,
        valorTieneCR: valor.includes('\r'), valorTieneTab: valor.includes('\t'), valorJSON: JSON.stringify(valor),
        fases: await fases(page), casillas: cs.length, igualAlCuadrado: mismas(cs, CUAD_CASILLAS),
        panel: (await panelTexto(page)).slice(0, 80).replace(/\n/g, ' | '),
      });
      await foto(page, `R2-12-${nombre}`);
    }
    // Compilador con \r\n crudos (no se puede producir desde el textarea)
    const dentroPagina = await page.evaluate(async () => {
      const { compilar } = await import('/compilador/compilar.js');
      const a = compilar('pintar rojo\r\nrepetir 4 veces:\r\n  avanzar 3\r\n  girar derecha\r\nfin');
      const b = compilar('pintar rojo\nrepetir 4 veces:\n\tavanzar 3\n\tgirar derecha\nfin');
      const c = compilar('pintar rojo\rrepetir 4 veces:\r  avanzar 3\r  girar derecha\rfin');
      const f = (x) => (x.error ? `${x.error.fase}: ${x.error.mensaje}` : `ok, ${x.casillasPintadas.length} casillas`);
      return { crlfCrudo: f(a), tabs: f(b), soloCR: f(c) };
    });
    r.compiladorCrudo = dentroPagina;
    res['R2-12'] = r;
    await page.context().close();
  }

  // ---------- R2-13 ----------
  {
    const page = await pagina({ etiqueta: 'R2-13' });
    await modoAuto(page, true);
    await velocidad(page, 5);
    const r = {};
    const sucio = [
      '   pintar rojo   ',
      '', '', '', '', '',
      '  repetir 4 veces:  ',
      '     avanzar 3   ',
      '   girar derecha  ',
      '   ',
      '  fin   ',
    ].join('\n');
    await ponerCodigo(page, sucio);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 1800, max: 20000 });
    const cs = await casillas(page);
    r.a = { fases: await fases(page), casillas: cs.length, igualAlCuadrado: mismas(cs, CUAD_CASILLAS), panelCab: (await page.evaluate(() => document.querySelector('#panel .panel-cab')?.innerText.replace(/\n/g, ' | '))) };
    await foto(page, 'R2-13-a-compila');
    // Variante con 5 lineas vacias de verdad y espacios alrededor, y un error despues: la linea del error es la 11
    const conError = ['  pintar rojo  ', '', '', '', '', '', '  repetir 4 veces:  ', '    avanzar 3  ', '    girar derecha  ', '  fin  ', '  avanzar @3  '].join('\n');
    const lineaReal = conError.split('\n').findIndex((l) => l.includes('@')) + 1;
    await ponerCodigo(page, conError);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 1800, max: 20000 });
    r.b = await page.evaluate(() => ({
      mensaje: document.querySelector('#panel .error-mensaje')?.textContent,
      explicacion: document.querySelector('#panel .error-explicacion')?.textContent,
      numerosConError: [...document.querySelectorAll('#numeros .con-error')].map((n) => n.textContent),
      bandaVisible: !document.querySelector('#banda').hidden,
      bandaTop: document.querySelector('#banda').style.top,
      filaErrorEnPanel: [...document.querySelectorAll('#panel .fila.con-error, #panel .fila.error, #panel [class*="error"] .fila-numero')].map((e) => e.textContent.slice(0, 40)),
    }));
    r.b.lineaReal = lineaReal;
    r.b.fases = await fases(page);
    // Posicion de la banda respecto de la linea @3 en el textarea
    r.b.geometria = await page.evaluate((lineaReal) => {
      const ta = document.querySelector('#codigo');
      const cs = getComputedStyle(ta);
      const alto = parseFloat(cs.lineHeight);
      const arriba = parseFloat(cs.paddingTop);
      const esperadoTop = arriba + (lineaReal - 1) * alto - ta.scrollTop;
      return { bandaTopPx: parseFloat(document.querySelector('#banda').style.top), esperadoTopPx: esperadoTop, alto };
    }, lineaReal);
    await foto(page, 'R2-13-b-error-linea');
    // Variante con lineas "vacias" que solo tienen espacios y tabulaciones
    const conEspacios = ['pintar rojo', '   ', '\t', '  ', '', '     ', 'avanzar 3', '  girar @'].join('\n');
    const lineaReal2 = conEspacios.split('\n').findIndex((l) => l.includes('@')) + 1;
    await ponerCodigo(page, conEspacios);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 1800, max: 20000 });
    r.c = await page.evaluate(() => ({
      mensaje: document.querySelector('#panel .error-mensaje')?.textContent,
      numerosConError: [...document.querySelectorAll('#numeros .con-error')].map((n) => n.textContent),
    }));
    r.c.lineaReal = lineaReal2;
    r.c.fases = await fases(page);
    await foto(page, 'R2-13-c-error-linea-espacios');
    res['R2-13'] = r;
    await page.context().close();
  }

  // ---------- R2-14 ----------
  {
    const page = await pagina({ etiqueta: 'R2-14' });
    const r = { paneles: [] };
    await modoAuto(page, true);
    await ponerCodigo(page, CUADRADO);
    await resetPint(page);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 2500, max: 30000 });
    r.tras = { fases: await fases(page), casillas: (await casillas(page)).length, eventos: (await pint(page)).total };
    const nombres = ['El Lector', 'El Gramático', 'El Juez', 'El Traductor', 'El Ejecutor'];
    for (let i = 0; i < 5; i++) {
      await page.locator('.personaje').nth(i).click({ force: true });
      await esperar(700);
      const info = await page.evaluate(() => ({
        titulo: document.querySelector('#panel .panel-titulo h2')?.textContent,
        estado: document.querySelector('#panel .panel-estado')?.textContent,
        texto: document.querySelector('#panel .panel-cuerpo')?.innerText.replace(/\n+/g, ' | ').slice(0, 160),
        elegido: [...document.querySelectorAll('.personaje')].findIndex((p) => p.classList.contains('elegido')),
      }));
      r.paneles.push({ i, esperado: nombres[i], ...info, casillas: (await casillas(page)).length, eventos: (await pint(page)).total });
      await foto(page, `R2-14-panel${i}`);
    }
    // Volver a El Ejecutor desde otro y esperar: no debe repetir el dibujo
    await page.locator('.personaje').nth(0).click({ force: true });
    await esperar(400);
    await resetPint(page);
    await page.locator('.personaje').nth(4).click({ force: true });
    await esperar(3500);
    r.volverEjecutor = { eventosNuevos: (await pint(page)).total, casillas: (await casillas(page)).length, estadoRobot: await estadoRobot(page), panel: (await panelTexto(page)).slice(0, 120).replace(/\n/g, ' | ') };
    // Durante la animacion: velocidad lenta, ir y volver
    await velocidad(page, 1);
    // nueva compilacion lenta: se salta a otro panel y se vuelve a mitad
    await resetPint(page);
    await page.click('#btn-compilar');
    await page.waitForFunction(() => window.__pint.total >= 4, null, { timeout: 30000 });
    await page.locator('.personaje').nth(1).click({ force: true });
    await esperar(500);
    await page.locator('.personaje').nth(4).click({ force: true });
    await esperarQuieto(page, { quieto: 3500, max: 60000 });
    const p = await pint(page);
    r.idaYVueltaMidAnimacion = { eventosTotales: p.total, casillasFinal: (await casillas(page)).length, igualAlCuadrado: mismas(await casillas(page), CUAD_CASILLAS), porCelda: p.porCelda };
    await foto(page, 'R2-14-mid-animacion');
    res['R2-14'] = r;
    await page.context().close();
  }

  // ---------- R2-15 ----------
  {
    const page = await pagina({ etiqueta: 'R2-15' });
    const r = { corridas: [] };
    await modoAuto(page, true);
    await ponerCodigo(page, CUADRADO);
    await page.click('#btn-compilar');
    await esperarQuieto(page, { quieto: 2500, max: 30000 });
    await page.locator('.personaje').nth(4).click({ force: true });
    await esperar(500);
    r.botonVisible = await page.locator('button:has-text("Ejecutar otra vez")').count();
    for (let k = 1; k <= 3; k++) {
      await resetPint(page);
      await page.locator('button:has-text("Ejecutar otra vez")').click({ force: true });
      // justo tras el clic el tablero debe estar casi vacio (desde cero)
      await esperar(120);
      const temprano = (await casillas(page)).length;
      await esperarQuieto(page, { quieto: 2000, max: 30000 });
      const p = await pint(page);
      const cs = await casillas(page);
      r.corridas.push({ k, casillasAlPrincipio: temprano, eventos: p.total, maxVecesPorCelda: Math.max(...Object.values(p.porCelda)), casillasFinal: cs.length, igualAlCuadrado: mismas(cs, CUAD_CASILLAS), estadoRobot: await estadoRobot(page), fases: await fases(page) });
      await foto(page, `R2-15-corrida${k}`);
    }
    // Tres pulsaciones seguidas, una cada 400 ms, a mitad de la animacion (anteriores se deben cancelar)
    await resetPint(page);
    await page.evaluate(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Ejecutar otra vez'));
      b.click();
      await new Promise((r) => setTimeout(r, 450));
      b.click();
      await new Promise((r) => setTimeout(r, 450));
      window.__pint.total = 0; window.__pint.porCelda = {}; window.__pint.log = [];
      b.click(); // la tercera: desde aqui se cuentan los eventos
    });
    await esperarQuieto(page, { quieto: 2500, max: 30000 });
    const p = await pint(page);
    r.tresSeguidas = { eventosDesdeLaTercera: p.total, maxVecesPorCelda: Math.max(...Object.values(p.porCelda)), casillasFinal: (await casillas(page)).length, igualAlCuadrado: mismas(await casillas(page), CUAD_CASILLAS), estadoRobot: await estadoRobot(page), personajesPalpitando: await page.evaluate(() => document.querySelectorAll('.personaje.trabajando').length) };
    await foto(page, 'R2-15-tres-seguidas');
    res['R2-15'] = r;
    await page.context().close();
  }
});
