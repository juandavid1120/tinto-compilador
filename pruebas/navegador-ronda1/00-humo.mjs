import { correr, estado, shot } from './lib.mjs';
await correr('humo', 90000, async ({ nuevaPagina, caso }) => {
  const { page } = await nuevaPagina();
  const e = await estado(page);
  console.log(JSON.stringify(e.fases), await page.title());
  await shot(page, 'humo');
  caso('HUMO', 'PASA', ['abrió']);
});
