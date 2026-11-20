// Pruebas del Lector (análisis léxico): casos TC-L01 a TC-L06.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarLexico } from '../../compilador/lexer.js';
import { ErrorTinto } from '../../compilador/errores.js';

// Ayuda: ejecuta el lexer y verifica que lance un error léxico
// con la línea y columna esperadas. Devuelve el error para más revisiones.
function esperarErrorLexico(codigo, linea, columna) {
  let error = null;
  try {
    analizarLexico(codigo);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof ErrorTinto, `se esperaba un ErrorTinto para: ${JSON.stringify(codigo)}`);
  assert.equal(error.fase, 'lexico');
  assert.equal(error.linea, linea);
  assert.equal(error.columna, columna);
  return error;
}

test('TC-L01: un programa válido genera los tokens correctos, con tipo, lexema, línea y columna', () => {
  const tokens = analizarLexico('pintar rojo\nrepetir 4 veces:\n  avanzar 3\nfin');
  assert.deepEqual(tokens, [
    { tipo: 'PALABRA_RESERVADA', lexema: 'pintar', valor: 'pintar', linea: 1, columna: 1 },
    { tipo: 'COLOR', lexema: 'rojo', valor: 'rojo', linea: 1, columna: 8 },
    { tipo: 'NUEVA_LINEA', lexema: '\\n', valor: null, linea: 1, columna: 12 },
    { tipo: 'PALABRA_RESERVADA', lexema: 'repetir', valor: 'repetir', linea: 2, columna: 1 },
    { tipo: 'NUMERO', lexema: '4', valor: 4, linea: 2, columna: 9 },
    { tipo: 'PALABRA_RESERVADA', lexema: 'veces', valor: 'veces', linea: 2, columna: 11 },
    { tipo: 'DOS_PUNTOS', lexema: ':', valor: ':', linea: 2, columna: 16 },
    { tipo: 'NUEVA_LINEA', lexema: '\\n', valor: null, linea: 2, columna: 17 },
    { tipo: 'PALABRA_RESERVADA', lexema: 'avanzar', valor: 'avanzar', linea: 3, columna: 3 },
    { tipo: 'NUMERO', lexema: '3', valor: 3, linea: 3, columna: 11 },
    { tipo: 'NUEVA_LINEA', lexema: '\\n', valor: null, linea: 3, columna: 12 },
    { tipo: 'PALABRA_RESERVADA', lexema: 'fin', valor: 'fin', linea: 4, columna: 1 },
    { tipo: 'FIN_ARCHIVO', lexema: '', valor: null, linea: 4, columna: 4 },
  ]);
});

test('TC-L01: girar con dirección genera un token DIRECCION', () => {
  const tokens = analizarLexico('girar izquierda');
  assert.equal(tokens[1].tipo, 'DIRECCION');
  assert.equal(tokens[1].valor, 'izquierda');
});

test('TC-L02: símbolo inválido da error léxico con línea y columna', () => {
  const error = esperarErrorLexico('avanzar @3', 1, 9);
  assert.equal(error.mensaje, 'Error léxico en línea 1, columna 9: símbolo inválido "@"');
  assert.match(error.explicacion, /"@"/);
});

test('TC-L02: el error léxico reporta la línea correcta cuando está más abajo', () => {
  esperarErrorLexico('pintar rojo\n\n  avanzar #', 3, 11);
});

test('TC-L03: palabra desconocida (saltar) da error léxico', () => {
  const error = esperarErrorLexico('saltar 3', 1, 1);
  assert.match(error.mensaje, /palabra desconocida "saltar"/);
  // La explicación lista las palabras que sí existen.
  assert.match(error.explicacion, /avanzar/);
  assert.match(error.explicacion, /derecha/);
  assert.match(error.explicacion, /amarillo/);
});

test('TC-L03: palabra desconocida (morado) da error léxico', () => {
  const error = esperarErrorLexico('pintar morado', 1, 8);
  assert.match(error.mensaje, /palabra desconocida "morado"/);
});

test('TC-L04: AVANZAR 3 y Avanzar 3 se aceptan', () => {
  for (const codigo of ['AVANZAR 3', 'Avanzar 3']) {
    const tokens = analizarLexico(codigo);
    assert.equal(tokens[0].tipo, 'PALABRA_RESERVADA');
    assert.equal(tokens[0].valor, 'avanzar'); // el valor siempre va en minúsculas
    assert.equal(tokens[0].lexema, codigo.split(' ')[0]); // el lexema queda como se escribió
    assert.equal(tokens[1].valor, 3);
  }
});

test('TC-L04: los colores y direcciones también ignoran mayúsculas', () => {
  const tokens = analizarLexico('PINTAR Rojo\nGIRAR DERECHA');
  assert.equal(tokens[1].tipo, 'COLOR');
  assert.equal(tokens[1].valor, 'rojo');
  assert.equal(tokens[4].tipo, 'DIRECCION');
  assert.equal(tokens[4].valor, 'derecha');
});

test('TC-L05: los espacios de sobra y las líneas vacías se ignoran', () => {
  const tokens = analizarLexico('   avanzar \t  3  \r\n\n\n  girar   derecha  ');
  const tipos = tokens.map((t) => t.tipo);
  assert.deepEqual(tipos, [
    'PALABRA_RESERVADA', 'NUMERO', 'NUEVA_LINEA', // el \r se ignora
    'NUEVA_LINEA',
    'NUEVA_LINEA',
    'PALABRA_RESERVADA', 'DIRECCION',
    'FIN_ARCHIVO',
  ]);
  // Las posiciones cuentan los espacios de sobra.
  assert.equal(tokens[0].columna, 4);
  assert.equal(tokens[1].columna, 15);
  assert.equal(tokens[5].linea, 4);
  assert.equal(tokens[5].columna, 3);
});

test('TC-L05: un texto vacío solo genera FIN_ARCHIVO', () => {
  const tokens = analizarLexico('');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].tipo, 'FIN_ARCHIVO');
  assert.equal(tokens[0].lexema, '');
  assert.equal(tokens[0].valor, null);
});

test('TC-L06: avanzar3 es una sola palabra desconocida', () => {
  const error = esperarErrorLexico('avanzar3', 1, 1);
  assert.match(error.mensaje, /palabra desconocida "avanzar3"/);
});

test('TC-L06: en "avanzar 2.5" falla el punto', () => {
  const error = esperarErrorLexico('avanzar 2.5', 1, 10);
  assert.match(error.mensaje, /símbolo inválido "\."/);
});

test('TC-L06: en "avanzar -1" falla el guion', () => {
  const error = esperarErrorLexico('avanzar -1', 1, 9);
  assert.match(error.mensaje, /símbolo inválido "-"/);
});

test('TC-L01: las palabras con tilde o ñ cuentan como letras (la palabra es desconocida, no un símbolo inválido)', () => {
  const error = esperarErrorLexico('añadir 3', 1, 1);
  assert.match(error.mensaje, /palabra desconocida "añadir"/);
});

test('Corrección: un \\r suelto (salto de línea de Mac antiguo) cuenta como salto de línea', () => {
  const tokens = analizarLexico('avanzar 3\rgirar derecha');
  assert.deepEqual(
    tokens.map((t) => [t.tipo, t.linea, t.columna]),
    [
      ['PALABRA_RESERVADA', 1, 1],
      ['NUMERO', 1, 9],
      ['NUEVA_LINEA', 1, 10],
      ['PALABRA_RESERVADA', 2, 1],
      ['DIRECCION', 2, 7],
      ['FIN_ARCHIVO', 2, 14],
    ]
  );
});

test('Corrección: \\r\\n (Windows) sigue siendo un solo salto de línea y \\r y \\n mezclados cuentan bien', () => {
  const windows = analizarLexico('avanzar 3\r\ngirar derecha');
  assert.equal(windows.filter((t) => t.tipo === 'NUEVA_LINEA').length, 1);
  assert.equal(windows.find((t) => t.valor === 'girar').linea, 2);
  // \r, \r\n y \n seguidos son tres saltos distintos: "fin" queda en la línea 4.
  const mezcla = analizarLexico('avanzar 1\ravanzar 2\r\navanzar 3\nfin');
  assert.equal(mezcla.find((t) => t.valor === 'fin').linea, 4);
  // Un error después de un \r suelto se reporta en la línea correcta.
  esperarErrorLexico('avanzar 1\r@', 2, 1);
});
