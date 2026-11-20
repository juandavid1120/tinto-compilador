// Grupo 1: R2-01 a R2-05
import { correr, esperar, casillas, fases, pint, resetPint, ponerCodigo, modoAuto, esperarQuieto, esperarIA, CUADRADO, estadoRobot } from './lib.mjs';

await correr('g1', 300000, async ({ pagina, res, foto }) => {
  // ---------- R2-01 ----------
  {
    const page = await pagina({ etiqueta: 'R2-01' });
    const tituloAntes = await page.title();
    const r = { tituloAntes, envios: [] };
    for (const frase of ['<img src=x onerror="document.title=\'HACK\'">', '<b>hola</b>']) {
      const t0 = Date.now();
      await page.fill('#texto-chat', frase);
      await page.press('#texto-chat', 'Enter');
      await page.waitForSelector('#historial .cargando', { timeout: 3000 }).catch(() => {});
      let timeout = false;
      try { await esperarIA(page, 35000); } catch { timeout = true; }
      await esperar(1500);
      const info = await page.evaluate((frase) => {
        const h = document.querySelector('#historial');
        const us = [...h.querySelectorAll('.mensaje.usuario')];
        const ultimo = us[us.length - 1];
        const ms = [...h.querySelectorAll('.mensaje')];
        const ia = ms[ms.length - 1];
        return {
          textoUsuarioExacto: ultimo?.querySelector('p')?.textContent === frase,
          textoUsuario: ultimo?.querySelector('p')?.textContent,
          innerHTMLUsuario: ultimo?.innerHTML,
          imgOBEnHistorial: h.querySelectorAll('img, b, script').length,
          tagsEnHistorial: [...new Set([...h.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()))],
          titulo: document.title,
          ultimoMensaje: { clase: ia?.className, texto: ia?.innerText?.slice(0, 300) },
        };
      }, frase);
      r.envios.push({ frase, ms: Date.now() - t0, timeoutIA: timeout, ...info });
      await foto(page, `R2-01-${r.envios.length}`);
    }
    r.tituloFinal = await page.title();
    res['R2-01'] = r;
    await page.context().close();
  }

  // ---------- R2-03 ----------
  {
    const page = await pagina({ etiqueta: 'R2-03' });
    const r = {};
    // a) un envio real y, antes de la respuesta, intentos de enviar otro
    await page.fill('#texto-chat', 'dibuja un cuadrado azul');
    await page.press('#texto-chat', 'Enter');
    await esperar(150);
    r.durante = await page.evaluate(() => ({
      textareaDisabled: document.querySelector('#texto-chat').disabled,
      botonDisabled: document.querySelector('#btn-enviar').disabled,
      botonTexto: document.querySelector('#btn-enviar').textContent,
      cargando: document.querySelectorAll('#historial .cargando').length,
      placeholder: document.querySelector('#texto-chat').placeholder,
    }));
    await foto(page, 'R2-03-a-esperando');
    // intento 1: escribir con el teclado (la caja esta desactivada)
    await page.keyboard.type('dibuja una linea verde');
    await page.keyboard.press('Enter');
    // intento 2: clic forzado en el boton
    await page.click('#btn-enviar', { force: true, timeout: 2000, noWaitAfter: true }).catch((e) => (r.clicForzado = 'error: ' + e.message.split('\n')[0]));
    // intento 3: dos submit sincronos por codigo (la guarda interna)
    await page.evaluate(() => {
      const f = document.querySelector('#form-chat');
      const t = document.querySelector('#texto-chat');
      t.disabled = false; // se fuerza para probar la guarda interna esperandoIA
      t.value = 'dibuja una linea verde';
      f.requestSubmit();
      f.requestSubmit();
    });
    await esperar(300);
    r.despuesIntentos = await page.evaluate(() => ({
      usuarios: [...document.querySelectorAll('#historial .mensaje.usuario p')].map((p) => p.textContent),
      cargando: document.querySelectorAll('#historial .cargando').length,
      valorCaja: document.querySelector('#texto-chat').value,
    }));
    let timeout = false;
    try { await esperarIA(page, 35000); } catch { timeout = true; }
    await esperar(800);
    r.timeoutIA = timeout;
    r.final = await page.evaluate(() => ({
      mensajes: [...document.querySelectorAll('#historial .mensaje')].map((m) => `${m.className} :: ${m.innerText.replace(/\n/g, ' / ').slice(0, 120)}`),
      cargando: document.querySelectorAll('#historial .cargando').length,
      botonTexto: document.querySelector('#btn-enviar').textContent,
      botonDisabled: document.querySelector('#btn-enviar').disabled,
      textareaDisabled: document.querySelector('#texto-chat').disabled,
      placeholder: document.querySelector('#texto-chat').placeholder,
      codigoEditor: document.querySelector('#codigo').value,
      valorCaja: document.querySelector('#texto-chat').value,
    }));
    await foto(page, 'R2-03-b-final');
    // b) tras la respuesta se puede enviar otra frase y la respuesta es la de esa frase
    await ponerCodigo(page, '');
    await page.fill('#texto-chat', 'dibuja una linea verde');
    await page.press('#texto-chat', 'Enter');
    try { await esperarIA(page, 35000); r.segundoTimeout = false; } catch { r.segundoTimeout = true; }
    await esperar(600);
    r.segundo = await page.evaluate(() => ({
      codigoEditor: document.querySelector('#codigo').value,
      mensajes: [...document.querySelectorAll('#historial .mensaje')].length,
      cargando: document.querySelectorAll('#historial .cargando').length,
      botonTexto: document.querySelector('#btn-enviar').textContent,
    }));
    await foto(page, 'R2-03-c-segundo');
    res['R2-03'] = r;
    await page.context().close();
  }

  // ---------- R2-04 ----------
  {
    const page = await pagina({ etiqueta: 'R2-04' });
    await modoAuto(page, true);
    await ponerCodigo(page, CUADRADO);
    await resetPint(page);
    const t0 = Date.now();
    // 10 clics reales y seguidos con el raton
    for (let i = 0; i < 10; i++) await page.click('#btn-compilar', { noWaitAfter: true, delay: 0 });
    const msClics = Date.now() - t0;
    const ok = await esperarQuieto(page, { quieto: 2500, max: 30000 });
    const p = await pint(page);
    const r = { msClics, esperaOk: ok, pintadasEventos: p.total, porCelda: p.porCelda, casillas: await casillas(page), fases: await fases(page), estadoRobot: await estadoRobot(page) };
    await foto(page, 'R2-04-a-clics-reales');
    // 10 clics sincronos (mas rapidos, en un solo turno)
    await resetPint(page);
    await page.evaluate(() => { for (let i = 0; i < 10; i++) document.querySelector('#btn-compilar').click(); });
    const ok2 = await esperarQuieto(page, { quieto: 2500, max: 30000 });
    const p2 = await pint(page);
    r.sincronos = { esperaOk: ok2, pintadasEventos: p2.total, casillas: (await casillas(page)).length, fases: await fases(page), estadoRobot: await estadoRobot(page) };
    await foto(page, 'R2-04-b-clics-sincronos');
    res['R2-04'] = r;
    await page.context().close();
  }

  // ---------- R2-05 ----------
  {
    const page = await pagina({ etiqueta: 'R2-05' });
    await ponerCodigo(page, CUADRADO);
    await page.click('#btn-compilar');
    await resetPint(page);
    // 15 clics reales y forzados (el boton se desactiva tras la quinta fase)
    const t0 = Date.now();
    for (let i = 0; i < 15; i++) await page.click('#btn-siguiente', { force: true, noWaitAfter: true, delay: 0, timeout: 3000 }).catch(() => {});
    const msClics = Date.now() - t0;
    const ok = await esperarQuieto(page, { quieto: 2500, max: 30000 });
    const p = await pint(page);
    const r = { msClics, esperaOk: ok, fases: await fases(page), pintadasEventos: p.total, casillas: (await casillas(page)).length, siguienteDisabled: await page.isDisabled('#btn-siguiente'), estadoRobot: await estadoRobot(page), panel: (await page.evaluate(() => document.querySelector('#panel .panel-cab')?.innerText)) };
    await foto(page, 'R2-05-a-clics-reales');
    // 15 clics sincronos tras recompilar
    await page.click('#btn-compilar');
    await resetPint(page);
    await page.evaluate(() => { for (let i = 0; i < 15; i++) document.querySelector('#btn-siguiente').click(); });
    const ok2 = await esperarQuieto(page, { quieto: 2500, max: 30000 });
    const p2 = await pint(page);
    r.sincronos = { esperaOk: ok2, fases: await fases(page), pintadasEventos: p2.total, casillas: (await casillas(page)).length };
    await foto(page, 'R2-05-b-clics-sincronos');
    res['R2-05'] = r;
    await page.context().close();
  }
});
