// R2-16: recargar la pagina a mitad de una animacion
import { correr, esperar, casillas, fases, pint, ponerCodigo, modoAuto, velocidad, estadoRobot, CUADRADO } from './lib.mjs';
await correr('g4', 120000, async ({ pagina, res, foto }) => {
  const r = { pruebas: [] };
  const page = await pagina({ etiqueta: 'R2-16' });
  // Prueba A: recargar con el robot dibujando (velocidad lenta, automatico)
  for (const variante of ['A-robot-dibujando', 'B-personajes-trabajando', 'C-paso-a-paso-a-medias']) {
    await velocidad(page, 1);
    if (variante === 'C-paso-a-paso-a-medias') {
      await modoAuto(page, false);
      await page.click('.ejemplo:nth-child(1)');
      await page.click('#btn-siguiente'); await page.click('#btn-siguiente');
    } else {
      await modoAuto(page, true);
      await page.click('.ejemplo:nth-child(1)');
      if (variante === 'A-robot-dibujando') await page.waitForFunction(() => window.__pint.total >= 4, null, { timeout: 30000 });
      else await esperar(1000);
    }
    const antes = { casillas: (await casillas(page)).length, fases: await fases(page), robot: await estadoRobot(page) };
    await foto(page, `R2-16-${variante}-antes`);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#btn-compilar');
    const t = await page.evaluate(() => ({
      tablero: document.querySelectorAll('.rejilla .celda.pintada').length,
      robot: document.querySelector('#estado-robot').textContent,
      fases: [...document.querySelectorAll('.personaje')].map((p) => p.dataset.estado),
      trabajando: document.querySelectorAll('.personaje.trabajando').length,
      codigo: document.querySelector('#codigo').value,
      mensajesChat: document.querySelectorAll('#historial .mensaje').length,
      panel: document.querySelector('#panel').innerText.replace(/\n/g, ' | ').slice(0, 100),
      modoAuto: document.querySelector('#modo').getAttribute('aria-checked'),
      siguienteDisabled: document.querySelector('#btn-siguiente').disabled,
      aviso: !document.querySelector('#aviso').hidden,
      velocidad: document.querySelector('#velocidad').value,
      reto: document.querySelectorAll('.reto.hecho').length,
    }));
    await esperar(5000); // si quedara algo vivo de la animacion anterior, pintaria aqui
    const despues = await page.evaluate(() => ({ pintadas: document.querySelectorAll('.rejilla .celda.pintada').length, eventos: window.__pint.total }));
    r.pruebas.push({ variante, antes, trasRecargar: t, cincoSegundosDespues: despues });
    await foto(page, `R2-16-${variante}-despues`);
    // la pagina recargada funciona: se compila y se dibuja completo
    await modoAuto(page, true); await velocidad(page, 5);
    await ponerCodigo(page, CUADRADO);
    await page.click('#btn-compilar');
    await page.waitForFunction(() => document.querySelectorAll('.rejilla .celda.pintada').length === 12, null, { timeout: 30000 }).then(() => (r.pruebas.at(-1).funcionaDespues = '12 casillas')).catch(async () => (r.pruebas.at(-1).funcionaDespues = 'NO llego a 12: ' + (await casillas(page)).length));
    await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#btn-compilar');
  }
  res['R2-16'] = r;
  await page.context().close();
});
