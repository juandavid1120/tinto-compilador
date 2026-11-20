// Tarea 2/3: "¿Qué pasó aquí?" en cada personaje, tras un error en cada fase, y textos con plurales.
import { correr, snap, shot, esperar, esperarQuieto, siguientes, queParo, compilar, velocidad } from './lib.mjs';

const ERR = [
  ['lex-@', 'avanzar @3'], ['lex-backtick', 'avanzar `'], ['lex-doble-backtick', 'pintar rojo\navanzar ``'], ['lex-palabra', 'avanzár 3'], ['lex-emoji', 'avanzar 🚀'], ['lex-pct', 'avanzar %'],
  ['sint-ejemplo', 'repetir 4 veces:\n  avanzar 3\n  girar derecha'], ['sint-sin-numero', 'avanzar'], ['sint-orden', 'rojo pintar'], ['sint-fin-sobra', 'avanzar 1\nfin'],
  ['sint-dos-por-linea', 'avanzar 1 avanzar 2'],
  ['sem-99', 'avanzar 99'], ['sem-0', 'avanzar 0'], ['sem-rep0', 'repetir 0 veces:\n  avanzar 1\nfin'], ['sem-rep101', 'repetir 101 veces:\n  avanzar 1\nfin'],
  ['sem-arriba', 'girar izquierda\navanzar 1'], ['sem-dentro-ciclo', 'repetir 5 veces:\n  avanzar 4\nfin'], ['sem-largo', 'repetir 100 veces:\n repetir 100 veces:\n  repetir 100 veces:\n   girar derecha\n  fin\n fin\nfin'],
];
const OK = [
  ['ok-pintar-solo', 'pintar rojo'], ['ok-una-instr', 'avanzar 1'], ['ok-girar', 'girar derecha'], ['ok-rep1', 'repetir 1 veces:\n  avanzar 1\nfin'],
  ['ok-rep-vacio', 'repetir 3 veces:\nfin'], ['ok-anidado', 'repetir 2 veces:\n  repetir 2 veces:\n    avanzar 1\n  fin\nfin'], ['ok-avanza2', 'avanzar 2'],
  ['ok-pintar-avanzar', 'pintar rojo\navanzar 1'], ['ok-dos-pintar', 'pintar rojo\npintar azul'], ['ok-rep-girar', 'repetir 2 veces:\n  girar derecha\nfin'],
];

await correr('t3b-quepaso', 420000, async ({ pagina, nota }) => {
  const page = await pagina();
  nota('## ERRORES: "¿Qué pasó aquí?" de cada personaje activado');
  for (const [id, cod] of ERR) {
    await compilar(page, cod);
    await siguientes(page, 5);
    const s = await snap(page);
    const n = s.fases.filter((f) => f !== 'espera').length;
    nota(`\n[${id}] código=${JSON.stringify(cod)} fases=${s.fases.join(',')} banda=${s.banda}`);
    for (let i = 0; i < n; i++) {
      const q = await queParo(page, i);
      nota(`   ${q.titulo} (${q.estadoP}): ${q.txt.replace(/^\S{1,3}/, (m) => m)}   || html=${q.html.replace(/\n/g, ' ')}`);
      if (id === 'sint-ejemplo' && i === 0) await shot(page, 't3b-sint-lector-quepaso');
      if (id === 'lex-backtick' && i === 0) await shot(page, 't3b-lex-backtick');
      if (id === 'sem-99' && i === 1) await shot(page, 't3b-sem-gramatico-quepaso');
    }
    // los personajes en espera: ¿qué pasa al pulsarlos?
    const tarjetas = await page.$$('#linea-personajes .personaje');
    if (n < 5) {
      const antes = await page.textContent('#panel .panel-titulo h2').catch(() => null);
      await tarjetas[4].click(); await esperar(100);
      const despues = await page.textContent('#panel .panel-titulo h2').catch(() => null);
      const sac = await tarjetas[4].evaluate((t) => t.classList.contains('sacudir'));
      nota(`   pulsar El Ejecutor en espera: panel antes=${antes} despues=${despues} sacude=${sac}`);
    }
  }

  nota('\n## PROGRAMAS CORRECTOS RAROS: textos de los 5 personajes y del monitor del Ejecutor');
  await velocidad(page, 5);
  for (const [id, cod] of OK) {
    await compilar(page, cod);
    // paso a paso: 4 clics, luego el 5.º y sondeamos el monitor
    await siguientes(page, 4);
    const sondeo = page.evaluate(async () => {
      const vistos = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        const d = document.querySelector('.monitor-detalle')?.textContent;
        const m = document.querySelector('.monitor-actual')?.textContent;
        const p = document.querySelector('.monitor-paso')?.textContent;
        const k = `${m} :: ${d} :: ${p}`;
        if (d && vistos[vistos.length - 1] !== k) vistos.push(k);
        await new Promise((r) => setTimeout(r, 15));
      }
      return vistos;
    });
    await esperar(50);
    await siguientes(page, 1);
    const vistos = await sondeo;
    const s = await snap(page);
    nota(`\n[${id}] ${JSON.stringify(cod)} fases=${s.fases.join(',')} pintadas=${s.pintadas} robot="${s.robot}"`);
    for (let i = 0; i < 5; i++) { const q = await queParo(page, i); nota(`   ${q.titulo}: ${q.txt}`); }
    const bruto = await page.$$eval('#panel .col-instrucciones .instruccion', () => []).catch(() => []);
    nota('   monitor (únicos): ' + JSON.stringify(vistos));
    // el texto fijo de aclaración del Ejecutor
    const t = await queParo(page, 4);
    const acl = await page.$eval('#panel .monitor-aclaracion', (x) => x.textContent);
    nota('   aclaración: ' + acl);
    if (id === 'ok-rep-vacio') await shot(page, 't3b-ok-rep-vacio-ejecutor');
  }
});
