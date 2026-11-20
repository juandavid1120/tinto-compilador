// R2-20: guion de la demo completo, sin recargar
import { correr, esperar, casillas, fases, pint, resetPint, ponerCodigo, esperarQuieto, esperarIA, estadoRobot } from './lib.mjs';
import { compilar } from '../../compilador/compilar.js';

await correr('g6', 290000, async ({ pagina, res, foto }) => {
  const page = await pagina({ etiqueta: 'R2-20' });
  const pasos = [];
  const esperadoDe = (codigo) => {
    const x = compilar(codigo);
    if (x.error) return { error: x.error.fase };
    const s = new Set();
    // reconstruye las casillas pintadas simulando los pasos 'mover'
    for (const p of x.pasos) if (p.accion === 'mover') s.add(`${p.x},${p.y}:${p.color}`);
    return { casillas: [...s].sort() };
  };
  const snap = async (nombre, extra = {}) => {
    const s = await page.evaluate(() => ({
      fases: [...document.querySelectorAll('.personaje')].map((p) => p.dataset.estado),
      trabajando: document.querySelectorAll('.personaje.trabajando').length,
      panel: (document.querySelector('#panel .panel-titulo h2')?.textContent || document.querySelector('#panel .panel-vacio-titulo')?.textContent || '').trim(),
      panelEstado: document.querySelector('#panel .panel-estado')?.textContent || '',
      codigo: document.querySelector('#codigo').value,
      bandaVisible: !document.querySelector('#banda').hidden,
      aviso: !document.querySelector('#aviso').hidden ? document.querySelector('#aviso').textContent : '',
      enviar: document.querySelector('#btn-enviar').textContent,
      enviarDisabled: document.querySelector('#btn-enviar').disabled,
      cargando: document.querySelectorAll('#historial .cargando').length,
      mensajes: document.querySelectorAll('#historial .mensaje').length,
      modo: document.querySelector('#modo').getAttribute('aria-checked') === 'true' ? 'auto' : 'paso',
      siguiente: document.querySelector('#btn-siguiente').disabled ? 'desactivado' : document.querySelector('#btn-siguiente small').textContent,
      retosHechos: [...document.querySelectorAll('.reto.hecho strong')].map((e) => e.textContent),
      robot: document.querySelector('#estado-robot').textContent,
      titulo: document.title,
    }));
    const cs = await casillas(page);
    const p = { nombre, ...s, casillas: cs, nCasillas: cs.length, ...extra };
    pasos.push(p);
    return p;
  };
  const clic = (sel) => page.click(sel);
  const siguiente = async (n) => { for (let i = 0; i < n; i++) { await page.click('#btn-siguiente'); await esperar(250); } };
  await page.evaluate(() => {}); // pagina lista

  // ===== Paso 1: gancho: cuadrado rojo por chat en automatico =====
  await clic('#modo'); // automatico
  await page.fill('#texto-chat', 'dibuja un cuadrado rojo');
  const t1 = Date.now();
  await page.press('#texto-chat', 'Enter');
  let ia1 = true; try { await esperarIA(page, 32000); } catch { ia1 = false; }
  const msIA1 = Date.now() - t1;
  await esperarQuieto(page, { quieto: 2500, max: 30000 });
  const s1 = await snap('1-gancho-chat-automatico', { msIA: msIA1, iaRespondio: ia1 });
  s1.esperadoPorCompilador = esperadoDe(s1.codigo);
  await foto(page, 'R2-20-1-gancho-automatico');

  // ===== Paso 2: lo mismo en paso a paso =====
  await clic('#modo'); // paso a paso (todo terminado; no debe haber aviso)
  await snap('2a-tras-cambiar-a-paso-a-paso');
  await page.fill('#texto-chat', 'dibuja un cuadrado rojo');
  const t2 = Date.now();
  await page.press('#texto-chat', 'Enter');
  let ia2 = true; try { await esperarIA(page, 32000); } catch { ia2 = false; }
  await esperar(500);
  const s2 = await snap('2b-tras-chat-en-paso-a-paso', { msIA: Date.now() - t2, iaRespondio: ia2 });
  s2.esperadoPorCompilador = esperadoDe(s2.codigo);
  await foto(page, 'R2-20-2b-listo-paso-a-paso');
  for (let i = 1; i <= 5; i++) {
    await siguiente(1);
    if (i < 5) await esperar(200);
    // pulsar "¿Qué pasó aquí?" en la fase 1 y en la 5
    let burbuja = null;
    if (i === 1 || i === 5) {
      await page.click('#panel button:has-text("¿Qué pasó aquí?")');
      await esperar(400);
      burbuja = await page.evaluate(() => document.querySelector('#panel .burbuja')?.innerText.replace(/\n/g, ' ').slice(0, 160) ?? null);
    }
    if (i === 5) await esperarQuieto(page, { quieto: 2200, max: 30000 });
    const s = await snap(`2-fase-${i}`, { burbuja });
    await foto(page, `R2-20-2-fase-${i}`);
  }

  // ===== Paso 3: los tres errores (paso a paso) =====
  const errores = [['3a-lexico', 3, 1, 'lexico'], ['3b-sintactico', 4, 2, 'sintactico'], ['3c-semantico', 5, 3, 'semantico']];
  for (const [n, idx, veces, fase] of errores) {
    await clic(`.ejemplo:nth-child(${idx})`);
    await esperar(400);
    const antes = await snap(`${n}-recien-cargado`);
    await siguiente(veces);
    const despues = await snap(`${n}-error`, { siguienteTrasError: undefined });
    despues.faseEsperada = fase;
    // intentar seguir: no debe avanzar
    const dis = await page.isDisabled('#btn-siguiente');
    despues.siguienteDesactivadoTrasError = dis;
    despues.explicacion = await page.evaluate(() => document.querySelector('#panel .error-explicacion')?.textContent);
    despues.mensajeError = await page.evaluate(() => document.querySelector('#panel .error-mensaje')?.textContent);
    despues.numerosConError = await page.evaluate(() => [...document.querySelectorAll('#numeros .con-error')].map((e) => e.textContent));
    await foto(page, `R2-20-${n}`);
  }

  // ===== Paso 4: un reto =====
  await page.click('#lista-retos .reto:nth-child(1) .reto-titulo');
  await esperar(300);
  const retoTexto = await page.evaluate(() => document.querySelector('#lista-retos .reto:nth-child(1) .reto-detalle').innerText.replace(/\n/g, ' '));
  const escalera = 'pintar verde\nrepetir 3 veces:\n  avanzar 1\n  girar derecha\n  avanzar 1\n  girar izquierda\nfin';
  await ponerCodigo(page, escalera);
  await snap('4a-reto-codigo-escrito-sin-compilar', { retoTexto });
  await clic('#btn-compilar');
  await esperar(300);
  await snap('4b-compilado-paso-a-paso');
  await siguiente(5);
  await esperarQuieto(page, { quieto: 2200, max: 30000 });
  const s4 = await snap('4c-escalera-terminada');
  s4.esperadoPorCompilador = esperadoDe(escalera);
  await page.click('#lista-retos .reto:nth-child(1) .reto-marca');
  await esperar(200);
  const s4b = await snap('4d-reto-marcado', { aria: await page.getAttribute('#lista-retos .reto:nth-child(1) .reto-marca', 'aria-pressed') });
  await foto(page, 'R2-20-4-reto');

  res['R2-20'] = { pasos };
  await page.context().close();
});
