import { spawn, execSync } from 'node:child_process';
import { correr, estado, shot, esperar, esperarFin, ponerModoAuto, resumenPintadas, coords, RAIZ } from './lib.mjs';

let servidor = null;
async function http(url) { try { const r = await fetch(url); return r.status; } catch (e) { return `sin respuesta (${e.cause?.code ?? e.message})`; } }

await correr('A7-servidor-caido', 180000, async ({ nuevaPagina, caso }) => {
  const obs = [];
  servidor = spawn('node', ['servidor.js'], { cwd: RAIZ, env: { ...process.env, PUERTO: '3100' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let salida = '';
  servidor.stdout.on('data', (d) => (salida += d));
  servidor.stderr.on('data', (d) => (salida += d));
  for (let i = 0; i < 50; i++) { if ((await http('http://localhost:3100/web/')) === 200) break; await esperar(200); }
  obs.push(`Servidor propio en el puerto 3100: GET /web/ -> ${await http('http://localhost:3100/web/')} (pid ${servidor.pid}); salida: ${salida.trim()}`);
  const { page } = await nuevaPagina({ url: 'http://localhost:3100/web/' });
  await ponerModoAuto(page, true);
  // Apagar el servidor 3100
  const muerto = new Promise((r) => servidor.once('exit', r));
  servidor.kill('SIGKILL');
  await muerto;
  await esperar(300);
  obs.push(`Servidor 3100 apagado (SIGKILL); GET /web/ -> ${await http('http://localhost:3100/web/')}`);
  obs.push(`El servidor principal del puerto 3000 no se tocó (GET /web/ -> ${await http('http://localhost:3000/web/')})`);

  // Enviar el mensaje
  await page.fill('#texto-chat', 'dibuja un cuadrado rojo');
  const t0 = Date.now();
  await page.press('#texto-chat', 'Enter');
  await page.waitForSelector('#historial .mensaje.aviso', { timeout: 30000 });
  const tAviso = Date.now() - t0;
  const aviso = await page.innerText('#historial .mensaje.aviso');
  await esperar(300);
  const cargandoPegado = await page.evaluate(() => !!document.querySelector('#historial .mensaje.cargando'));
  const hab = await page.evaluate(() => ({ boton: !document.getElementById('btn-enviar').disabled, caja: !document.getElementById('texto-chat').disabled, texto: document.getElementById('btn-enviar').textContent }));
  const capA = await shot(page, 'E2E-07-a-sin-ia');
  obs.push(`El aviso apareció a los ${tAviso} ms: ${JSON.stringify(aviso)}`);
  obs.push(`Indicador de carga pegado: ${cargandoPegado}; botón Enviar habilitado: ${hab.boton} ("${hab.texto}"); caja habilitada: ${hab.caja}`);
  const sugiereEjemplos = /ejemplos guardados/i.test(aviso) && /no está disponible/i.test(aviso);

  // Ejemplo guardado sin servidor
  await page.click('#lista-ejemplos .ejemplo >> nth=0');
  await esperarFin(page, 5);
  const e = await estado(page);
  const capB = await shot(page, 'E2E-07-b-ejemplo-sin-servidor');
  obs.push(`Ejemplo "Dibuja un cuadrado rojo" sin servidor: fases ${e.fases.join(', ')}; ${resumenPintadas(e)}; ${e.estadoRobot}`);
  const ok = sugiereEjemplos && !cargandoPegado && hab.boton && e.fases.every((f) => f === 'aprobado') && e.pintadas.length === 12 && e.pintadas.every((p) => p.color === 'rojo');
  obs.push(`Servidor 3100 sigue apagado al terminar: GET -> ${await http('http://localhost:3100/web/')} (no hace falta reencenderlo: era el mío; el de 3000 nunca se apagó).`);
  caso('E2E-07', ok ? 'PASA' : 'FALLA', obs, [capA, capB]);
}).finally(() => { try { servidor?.kill('SIGKILL'); } catch {} });
