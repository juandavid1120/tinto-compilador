// Pruebas del Gramático (análisis sintáctico): casos TC-S01 a TC-S09.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarLexico } from '../../compilador/lexer.js';
import { analizarSintactico } from '../../compilador/parser.js';
import { ErrorTinto } from '../../compilador/errores.js';

// Ayuda: pasa el código por el lexer y luego por el parser.
function parsear(codigo) {
  return analizarSintactico(analizarLexico(codigo));
}

// Ayuda: verifica que el parser lance un error sintáctico en la línea
// y columna esperadas. Devuelve el error para más revisiones.
function esperarErrorSintactico(codigo, linea, columna) {
  let error = null;
  try {
    parsear(codigo);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof ErrorTinto, `se esperaba un ErrorTinto para: ${JSON.stringify(codigo)}`);
  assert.equal(error.fase, 'sintactico');
  assert.equal(error.linea, linea);
  assert.equal(error.columna, columna);
  assert.ok(error.explicacion.length > 0);
  return error;
}

test('TC-S01: cada instrucción válida, sola, genera su nodo en el árbol', () => {
  assert.deepEqual(parsear('avanzar 3'), {
    tipo: 'Programa',
    cuerpo: [{ tipo: 'Avanzar', pasos: 3, linea: 1 }],
  });
  assert.deepEqual(parsear('girar derecha'), {
    tipo: 'Programa',
    cuerpo: [{ tipo: 'Girar', direccion: 'derecha', linea: 1 }],
  });
  assert.deepEqual(parsear('girar izquierda'), {
    tipo: 'Programa',
    cuerpo: [{ tipo: 'Girar', direccion: 'izquierda', linea: 1 }],
  });
  assert.deepEqual(parsear('pintar rojo'), {
    tipo: 'Programa',
    cuerpo: [{ tipo: 'Pintar', color: 'rojo', linea: 1 }],
  });
  assert.deepEqual(parsear('repetir 2 veces:\n  avanzar 1\nfin'), {
    tipo: 'Programa',
    cuerpo: [
      {
        tipo: 'Repetir',
        veces: 2,
        cuerpo: [{ tipo: 'Avanzar', pasos: 1, linea: 2 }],
        linea: 1,
      },
    ],
  });
});

test('TC-S01: el programa de ejemplo del plan genera el árbol esperado', () => {
  const ast = parsear('pintar rojo\nrepetir 4 veces:\n  avanzar 3\n  girar derecha\nfin\n');
  assert.deepEqual(ast, {
    tipo: 'Programa',
    cuerpo: [
      { tipo: 'Pintar', color: 'rojo', linea: 1 },
      {
        tipo: 'Repetir',
        veces: 4,
        linea: 2,
        cuerpo: [
          { tipo: 'Avanzar', pasos: 3, linea: 3 },
          { tipo: 'Girar', direccion: 'derecha', linea: 4 },
        ],
      },
    ],
  });
});

test('TC-S01: las líneas vacías se saltan y cada nodo guarda su línea real', () => {
  const ast = parsear('\n\navanzar 2\n\n  girar izquierda\n');
  assert.deepEqual(ast.cuerpo, [
    { tipo: 'Avanzar', pasos: 2, linea: 3 },
    { tipo: 'Girar', direccion: 'izquierda', linea: 5 },
  ]);
});

test('TC-S02: avanzar sin número da error ("falta el número")', () => {
  // "avanzar" ocupa las columnas 1 a 7, así que el final de la línea está en la 8.
  const error = esperarErrorSintactico('avanzar', 1, 8);
  assert.match(error.mensaje, /después de "avanzar" se esperaba un número/);
  assert.match(error.mensaje, /el final del programa/);
  assert.equal(error.explicacion, 'Le dijiste al robot que avance, pero no cuántas casillas.');
});

test('TC-S02: avanzar sin número seguido de otra línea reporta el final de la línea', () => {
  const error = esperarErrorSintactico('avanzar\ngirar derecha', 1, 8);
  assert.match(error.mensaje, /se encontró el final de la línea/);
});

test('TC-S03: "avanzar girar" da error por token inesperado', () => {
  const error = esperarErrorSintactico('avanzar girar', 1, 9);
  assert.equal(
    error.mensaje,
    'Error sintáctico en línea 1, columna 9: después de "avanzar" se esperaba un número y se encontró "girar"'
  );
});

test('TC-S03: "girar 3" da error por token inesperado', () => {
  const error = esperarErrorSintactico('girar 3', 1, 7);
  assert.match(error.mensaje, /después de "girar" se esperaba una dirección/);
  assert.match(error.mensaje, /se encontró "3"/);
});

test('TC-S03: "girar" y "pintar" sin argumento también dan error', () => {
  esperarErrorSintactico('girar', 1, 6);
  esperarErrorSintactico('pintar', 1, 7);
  const error = esperarErrorSintactico('pintar 5', 1, 8);
  assert.match(error.mensaje, /después de "pintar" se esperaba un color/);
});

test('TC-S03: una línea que empieza con algo que no es instrucción da error', () => {
  // un número, un color y la palabra "veces"
  const conNumero = esperarErrorSintactico('pintar rojo\n3 avanzar', 2, 1);
  assert.match(conNumero.mensaje, /se esperaba una instrucción/);
  esperarErrorSintactico('rojo', 1, 1);
  esperarErrorSintactico('veces', 1, 1);
  esperarErrorSintactico(':', 1, 1);
});

test('TC-S04: repetir sin fin da error y menciona la línea donde empezó', () => {
  const error = esperarErrorSintactico('pintar rojo\nrepetir 2 veces:\n  avanzar 1\n', 2, 1);
  assert.match(error.mensaje, /línea 2/);
  assert.match(error.mensaje, /"fin"/);
  assert.match(error.explicacion, /línea 2/);
});

test('TC-S04: repetir sin fin al final del programa (sin salto de línea) da error', () => {
  esperarErrorSintactico('repetir 2 veces:', 1, 1);
});

test('TC-S04: en repetires anidados, el que falta cerrar es el que se reporta', () => {
  // El "fin" de la línea 4 cierra el repetir interno; el externo (línea 1) queda abierto.
  const error = esperarErrorSintactico(
    'repetir 2 veces:\n  repetir 3 veces:\n    avanzar 1\n  fin\n',
    1,
    1
  );
  assert.match(error.mensaje, /línea 1/);
});

test('TC-S05: fin sin repetir da error', () => {
  const error = esperarErrorSintactico('avanzar 1\nfin', 2, 1);
  assert.match(error.mensaje, /"fin"/);
  assert.match(error.mensaje, /ningún "repetir" abierto/);
});

test('TC-S05: un fin de más después de cerrar un repetir da error', () => {
  esperarErrorSintactico('repetir 2 veces:\n  avanzar 1\nfin\nfin', 4, 1);
});

test('TC-S06: "repetir 4:" (sin veces) da error', () => {
  const error = esperarErrorSintactico('repetir 4:\n  avanzar 1\nfin', 1, 10);
  assert.match(error.mensaje, /se esperaba "veces"/);
});

test('TC-S06: "repetir 4 veces" (sin dos puntos) da error', () => {
  // "repetir 4 veces" mide 15 caracteres, así que el final de la línea está en la columna 16.
  const error = esperarErrorSintactico('repetir 4 veces\n  avanzar 1\nfin', 1, 16);
  assert.match(error.mensaje, /se esperaba ":"/);
});

test('TC-S06: "repetir" sin número da error', () => {
  const error = esperarErrorSintactico('repetir veces:\nfin', 1, 9);
  assert.match(error.mensaje, /después de "repetir" se esperaba un número/);
});

test('TC-S06: después de "repetir N veces:" debe venir el final de la línea', () => {
  const error = esperarErrorSintactico('repetir 2 veces: avanzar 1\nfin', 1, 18);
  assert.match(error.mensaje, /se esperaba el final de la línea/);
});

test('TC-S07: un repetir dentro de otro es válido y el árbol queda anidado', () => {
  const ast = parsear(
    [
      'repetir 2 veces:',
      '  repetir 3 veces:',
      '    avanzar 1',
      '  fin',
      '  girar derecha',
      'fin',
    ].join('\n')
  );
  assert.deepEqual(ast, {
    tipo: 'Programa',
    cuerpo: [
      {
        tipo: 'Repetir',
        veces: 2,
        linea: 1,
        cuerpo: [
          {
            tipo: 'Repetir',
            veces: 3,
            linea: 2,
            cuerpo: [{ tipo: 'Avanzar', pasos: 1, linea: 3 }],
          },
          { tipo: 'Girar', direccion: 'derecha', linea: 5 },
        ],
      },
    ],
  });
});

test('TC-S07: un repetir vacío (solo líneas en blanco antes del fin) es válido', () => {
  const ast = parsear('repetir 2 veces:\n\nfin');
  assert.deepEqual(ast.cuerpo[0].cuerpo, []);
});

test('TC-S08: "avanzar 3 girar derecha" en una misma línea da error', () => {
  const error = esperarErrorSintactico('avanzar 3 girar derecha', 1, 11);
  assert.match(error.mensaje, /se esperaba el final de la línea/);
  assert.match(error.mensaje, /se encontró "girar"/);
});

test('TC-S08: texto después del "fin" en la misma línea también da error', () => {
  esperarErrorSintactico('repetir 2 veces:\n  avanzar 1\nfin avanzar 2', 3, 5);
});

test('TC-S09: un programa vacío no da error y devuelve el cuerpo vacío', () => {
  // El mensaje "no hay nada que compilar" lo pone compilar.js, no el parser.
  assert.deepEqual(parsear(''), { tipo: 'Programa', cuerpo: [] });
});

test('TC-S09: un programa con solo líneas vacías tampoco da error', () => {
  assert.deepEqual(parsear('\n\n   \n\t\n'), { tipo: 'Programa', cuerpo: [] });
});

// Arma un programa con "n" repetir anidados (cada uno en su línea) y un avanzar adentro.
function anidados(n) {
  return 'repetir 1 veces:\n'.repeat(n) + 'avanzar 1\n' + 'fin\n'.repeat(n);
}

test('Corrección: 50 repetir anidados son válidos', () => {
  let nodo = parsear(anidados(50)).cuerpo[0];
  let niveles = 1;
  while (nodo.cuerpo[0].tipo === 'Repetir') {
    nodo = nodo.cuerpo[0];
    niveles++;
  }
  assert.equal(niveles, 50);
});

test('Corrección: el repetir número 51 da un error sintáctico en su línea, no una excepción', () => {
  const error = esperarErrorSintactico(anidados(51), 51, 1);
  assert.match(error.mensaje, /demasiados "repetir" uno dentro de otro \(el máximo es 50\)/);
});

test('Corrección: 3.000 y 10.000 repetir anidados dan el mismo error en vez de RangeError', () => {
  esperarErrorSintactico(anidados(3000), 51, 1);
  esperarErrorSintactico('repetir 1 veces:\n'.repeat(10000), 51, 1);
});

test('Corrección: varios repetir seguidos (no anidados) no suman profundidad', () => {
  const codigo = 'repetir 2 veces:\n  avanzar 1\nfin\n'.repeat(200);
  assert.equal(parsear(codigo).cuerpo.length, 200);
});

test('Corrección: un número enorme en un mensaje del parser se escribe legible', () => {
  const error = esperarErrorSintactico(`repetir ${'9'.repeat(400)} avanzar 1`, 1, 8 + 400 + 2);
  assert.doesNotMatch(error.mensaje + error.explicacion, /Infinity|e\+/);
  assert.match(error.explicacion, /repetir más de 9007199254740991 veces:/);
});
