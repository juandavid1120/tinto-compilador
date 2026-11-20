// Tarea 3: los cinco ejemplos guardados y los cinco retos.
import { correr, snap, shot, esperar, esperarQuieto, modoAuto, siguientes, queParo, compilar } from './lib.mjs';

await correr('t3a-ejemplos-retos', 300000, async ({ pagina, nota }) => {
  const page = await pagina();
  const EJ = [
    ['cuadrado', 5, 12, null], ['escalera', 5, 8, null], ['lexico', 1, 0, 'lexico'], ['sintactico', 2, 0, 'sintactico'], ['semantico', 3, 0, 'semantico'],
  ];
  nota('## EJEMPLOS en paso a paso');
  for (let k = 0; k < EJ.length; k++) {
    const [id, pasos, casillas, fase] = EJ[k];
    await page.click(`#lista-ejemplos .ejemplo:nth-child(${k + 1})`);
    await esperar(200);
    const a = await snap(page);
    const editor = await page.inputValue('#codigo');
    const chat = await page.$$eval('#historial .mensaje', (m) => m.slice(-2).map((x) => x.innerText.replace(/\n/g, ' / ')));
    nota(`ej ${id}: tras clic -> fases ${a.fases.join(',')} pintadas=${a.pintadas} panel="${a.vacio}" sig=${JSON.stringify(a.sig)} editor=${JSON.stringify(editor.slice(0, 40))} chat=${JSON.stringify(chat)}`);
    await siguientes(page, pasos);
    await esperarQuieto(page);
    const b = await snap(page);
    nota(`ej ${id}: tras ${pasos} Siguientes -> fases ${b.fases.join(',')} pintadas=${b.pintadas} robot="${b.robot}" banda=${b.banda} sig=${JSON.stringify(b.sig)} retos=${b.retos} esperado casillas=${casillas}`);
    await shot(page, `t3a-ejemplo-${id}-paso`);
    // ¿Qué pasó aquí? en cada personaje activado
    const n = fase ? { lexico: 1, sintactico: 2, semantico: 3 }[fase] : 5;
    for (let i = 0; i < n; i++) { const q = await queParo(page, i); nota(`   [${id}] ${q.titulo} (${q.estadoP}): ${q.txt}`); }
  }
  nota('## EJEMPLOS en automatico');
  await modoAuto(page, true);
  for (let k = 0; k < EJ.length; k++) {
    const [id, , casillas] = EJ[k];
    await page.click(`#lista-ejemplos .ejemplo:nth-child(${k + 1})`);
    await esperarQuieto(page, { max: 30000 });
    const b = await snap(page);
    nota(`ej ${id} (auto): fases ${b.fases.join(',')} pintadas=${b.pintadas} (esp ${casillas}) robot="${b.robot}" panel=${b.panelTit}/${b.panelEst} banda=${b.banda} sig=${JSON.stringify(b.sig)}`);
    await shot(page, `t3a-ejemplo-${id}-auto`);
  }
  await modoAuto(page, false);

  nota('## RETOS (pagina nueva, para ver el marcado solo)');
  const p2 = await pagina();
  const retos = await p2.$$eval('#lista-retos .reto', (r) => r.map((x) => x.innerText.replace(/\n/g, ' | ')));
  nota('retos visibles: ' + JSON.stringify(retos));
  const estadoRetos = async () => (await snap(p2)).retos;
  nota('retos inicial: ' + (await estadoRetos()));
  // abrir cada tarjeta y leer la pista
  const detalles = [];
  for (let i = 0; i < 5; i++) {
    await p2.click(`#lista-retos .reto:nth-child(${i + 1}) .reto-titulo`);
    detalles.push(await p2.$eval(`#lista-retos .reto:nth-child(${i + 1}) .reto-detalle`, (d) => d.innerText.replace(/\n/g, ' | ')));
    await p2.click(`#lista-retos .reto:nth-child(${i + 1}) .reto-titulo`);
  }
  nota('detalles: ' + JSON.stringify(detalles));

  // Reto 1: escalera (con la pista), a mano
  await p2.click('#modo-auto');
  await compilar(p2, 'pintar verde\nrepetir 3 veces:\n  avanzar 1\n  girar derecha\n  avanzar 1\n  girar izquierda\nfin');
  await esperarQuieto(p2, { max: 30000 });
  let s = await snap(p2);
  nota(`reto 1 escalera (pista): fases ${s.fases.join(',')} pintadas=${s.pintadas} ${s.pint.join(' ')} robot="${s.robot}" retos=${s.retos} (¿se marca solo? ${s.retos[0] === '1'})`);
  await shot(p2, 't3a-reto1-escalera');
  await p2.click('#lista-retos .reto:nth-child(1) .reto-marca');
  nota('reto 1 tras clic en la casilla: retos=' + (await estadoRetos()) + ' aria-pressed=' + (await p2.getAttribute('#lista-retos .reto:nth-child(1) .reto-marca', 'aria-pressed')));
  await p2.click('#lista-retos .reto:nth-child(1) .reto-marca');
  nota('reto 1 desmarcar: retos=' + (await estadoRetos()));
  await p2.click('#lista-retos .reto:nth-child(1) .reto-marca');

  // Reto 2: inicial. L tal como dice la pista (avanzar, girar, avanzar) y L real
  await compilar(p2, 'pintar rojo\navanzar 4\ngirar derecha\navanzar 3');
  await esperarQuieto(p2, { max: 30000 });
  s = await snap(p2);
  nota(`reto 2 inicial L segun la pista literal (avanzar 4, girar derecha, avanzar 3): pintadas=${s.pintadas} ${s.pint.join(' ')} retos=${s.retos}`);
  await shot(p2, 't3a-reto2-inicial-pista-literal');
  await compilar(p2, 'pintar rojo\ngirar derecha\navanzar 4\ngirar izquierda\navanzar 3');
  await esperarQuieto(p2, { max: 30000 });
  s = await snap(p2);
  nota(`reto 2 inicial L real (girar derecha, avanzar 4, girar izquierda, avanzar 3): pintadas=${s.pintadas} ${s.pint.join(' ')} retos=${s.retos}`);
  await shot(p2, 't3a-reto2-inicial-L-real');
  await p2.click('#lista-retos .reto:nth-child(2) .reto-marca');
  nota('reto 2 marcado a mano: retos=' + (await estadoRetos()));

  // Retos 3 a 5 con las pistas, paso a paso y automatico
  const casos = [
    ['reto 3 Lector (%)', 'avanzar %', 'lexico'],
    ['reto 3 Lector (palabra inventada)', 'hola', 'lexico'],
    ['reto 4 Gramatico (avanzar sin numero)', 'avanzar', 'sintactico'],
    ['reto 4 Gramatico (repetir sin fin)', 'repetir 3 veces:\n  avanzar 1', 'sintactico'],
    ['reto 4 Gramatico (palabras en mal orden)', 'rojo pintar', 'sintactico'],
    ['reto 5 Juez (avanzar enorme)', 'avanzar 50', 'semantico'],
  ];
  // Pagina limpia por caso para saber qué se marca
  for (const modo of ['paso', 'auto']) {
    for (const [titulo, codigo, fase] of casos) {
      const p3 = await pagina();
      if (modo === 'auto') await p3.click('#modo-auto');
      await compilar(p3, codigo);
      let antes;
      if (modo === 'paso') { antes = (await snap(p3)).retos; await siguientes(p3, 5); }
      else await esperarQuieto(p3, { max: 20000 });
      const q = await snap(p3);
      nota(`${titulo} [${modo}]: fases ${q.fases.join(',')} retos antes=${antes ?? '-'} despues=${q.retos} banda=${q.banda}`);
      if (modo === 'paso' && titulo.startsWith('reto 5')) await shot(p3, 't3a-reto5-juez');
      await p3.context().close();
    }
  }
  // Los tres retos "falle" en la misma pagina, en orden, sin recargar
  const p4 = await pagina();
  for (const [t, c] of [['lector', 'avanzar @3'], ['gramatico', 'avanzar'], ['juez', 'avanzar 99']]) {
    await compilar(p4, c); await siguientes(p4, 4);
    nota(`misma pagina, ${t}: retos=${(await snap(p4)).retos}`);
  }
  await shot(p4, 't3a-retos-tres-marcados');
  // Un reto marcado: ¿sobrevive a compilar algo correcto, a Reiniciar?
  await compilar(p4, 'avanzar 2'); await siguientes(p4, 5); await esperarQuieto(p4);
  nota('tras compilar algo correcto, retos=' + (await snap(p4)).retos);
  await p4.click('#btn-reiniciar');
  nota('tras reiniciar, retos=' + (await snap(p4)).retos);
});
