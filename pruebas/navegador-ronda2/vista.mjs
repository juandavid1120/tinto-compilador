// R2-17 / R2-18: recorre estados de la app en un tamaño de ventana y mide lo que se corta o se monta.
// Uso: node vista.mjs <prefijo> <ancho> <alto> <dsf>
import { correr, esperar, esperarQuieto, velocidad, modoAuto, casillas, fases, scrollPagina } from './lib.mjs';
import { MEDIR } from './medir.mjs';

const [prefijo, anchoS, altoS, dsfS] = process.argv.slice(2);
const ancho = Number(anchoS), alto = Number(altoS), dsf = Number(dsfS || 1);

await correr(`vista-${prefijo}`, 280000, async ({ pagina, res, foto }) => {
  const page = await pagina({ ancho, alto, dsf, etiqueta: prefijo });
  const estados = {};
  const medir = async (nombre, extra = {}) => {
    estados[nombre] = { ...(await page.evaluate(MEDIR)), ...extra };
    await foto(page, `${prefijo}-${nombre}`);
  };

  await velocidad(page, 5);
  await modoAuto(page, true);
  await medir('1-inicial');

  // Cuadrado completo
  await page.click('.ejemplo:nth-child(1)');
  await esperarQuieto(page, { quieto: 2200, max: 30000 });
  const nombres = ['lector', 'gramatico', 'juez', 'traductor', 'ejecutor'];
  for (let i = 0; i < 5; i++) {
    await page.locator('.personaje').nth(i).click({ force: true });
    await esperar(1500); // deja que termine la animacion del arbol
    await medir(`2-cuadrado-${i + 1}-${nombres[i]}`, { fases: await fases(page), casillas: (await casillas(page)).length });
  }
  // Los tres errores
  for (const [n, sel] of [['3-error-lexico', '.ejemplo:nth-child(3)'], ['4-error-sintactico', '.ejemplo:nth-child(4)'], ['5-error-semantico', '.ejemplo:nth-child(5)']]) {
    await page.click(sel);
    await esperarQuieto(page, { quieto: 1800, max: 20000 });
    await esperar(800);
    await medir(n, { fases: await fases(page) });
  }
  // Reto abierto (el ultimo y el primero)
  await page.click('#lista-retos .reto:nth-child(5) .reto-titulo');
  await esperar(300);
  await medir('6-reto-abierto-juez');
  // Escalera (mas pasos en el Ejecutor)
  await page.click('.ejemplo:nth-child(2)');
  await esperarQuieto(page, { quieto: 2200, max: 30000 });
  await medir('7-escalera-ejecutor', { fases: await fases(page), casillas: (await casillas(page)).length });
  // Chat con mensajes largos
  await page.fill('#texto-chat', 'Esta es una frase bastante larga para ver como se acomoda dentro de la caja del chat cuando el estudiante escribe mucho texto seguido sin parar');
  await medir('8-chat-texto-largo');
  res.estados = estados;
  res.ventana = { ancho, alto, dsf };
  await page.context().close();
});
