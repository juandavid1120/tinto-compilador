// Pruebas de integración del compilador completo: TC-G04 y otras.
// Aquí se llama a compilar() con código real (texto), así que corren las cinco fases de verdad:
// lexer, parser, semántico, generador y ejecutor, sin armar nada a mano.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../compilador/compilar.js';

test('el cuadrado rojo compila: 5 instrucciones, 12 casillas pintadas y el robot vuelve a (0, 0)', () => {
  const codigo = ['pintar rojo', 'repetir 4 veces:', '  avanzar 3', '  girar derecha', 'fin'].join('\n');
  const r = compilar(codigo);

  assert.equal(r.error, null);
  assert.equal(r.vacio, false);
  assert.equal(r.instrucciones.length, 5); // COLOR, CONTAR, MOVER, GIRAR, VOLVER
  assert.equal(Object.keys(r.casillasPintadas).length, 12);
  assert.equal(r.estadoFinal.x, 0);
  assert.equal(r.estadoFinal.y, 0);
  // Los pasos que anima la interfaz: 17 del robot (1 color, 12 mover, 4 girar) más 5 del repetir (1 contar y 4 volver).
  assert.equal(r.pasos.length, 22);
  assert.equal(r.pasos.filter((p) => p.accion === 'contar' || p.accion === 'volver').length, 5);
});

// Tres programas, cada uno con un error de una fase distinta.
// Se anota qué campos deben quedar llenos (fases que sí pasaron) y cuáles en null.
const casosDeError = [
  {
    nombre: 'error léxico',
    codigo: 'avanzar @3',
    fase: 'lexico',
    llenos: [],
    nulos: ['tokens', 'ast', 'revisiones'],
  },
  {
    nombre: 'error sintáctico',
    codigo: 'repetir 4 veces:\n  avanzar 1',
    fase: 'sintactico',
    llenos: ['tokens'],
    nulos: ['ast', 'revisiones'],
  },
  {
    nombre: 'error semántico',
    codigo: 'avanzar 99',
    fase: 'semantico',
    llenos: ['tokens', 'ast'],
    nulos: ['revisiones'],
  },
];

for (const caso of casosDeError) {
  test(`TC-G04: con un ${caso.nombre} no se genera código ni se ejecuta`, () => {
    const r = compilar(caso.codigo);

    // Hay error y es de la fase correcta.
    assert.notEqual(r.error, null);
    assert.equal(r.error.fase, caso.fase);

    // Las fases siguientes al error no corrieron: sin código generado y sin pasos.
    assert.equal(r.instrucciones, null);
    assert.equal(r.pasos, null);
    assert.equal(r.estadoFinal, null);
    assert.equal(r.casillasPintadas, null);

    // Las fases anteriores sí dejaron su resultado, y la que falló y las siguientes, no.
    for (const campo of caso.llenos) {
      assert.notEqual(r[campo], null, `${campo} debería estar lleno`);
    }
    for (const campo of caso.nulos) {
      assert.equal(r[campo], null, `${campo} debería ser null`);
    }
  });
}

test('un programa vacío no es un error: vacio es true y error es null', () => {
  const r = compilar('');
  assert.equal(r.vacio, true);
  assert.equal(r.error, null);

  // Un programa con solo espacios y líneas en blanco también está vacío.
  const soloBlancos = compilar('  \n\n   \n');
  assert.equal(soloBlancos.vacio, true);
  assert.equal(soloBlancos.error, null);
});

test('TC-L04: las mayúsculas no importan, AVANZAR 3 compila', () => {
  const r = compilar('AVANZAR 3');
  assert.equal(r.error, null);
  assert.equal(r.vacio, false);
  assert.equal(r.estadoFinal.x, 3);
  assert.equal(r.estadoFinal.y, 0);
});
