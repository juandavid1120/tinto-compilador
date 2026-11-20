// Pruebas de la ejecución (El Ejecutor): TC-E01 a TC-E05.
// Las instrucciones se generan con generarCodigo a partir de AST armados a mano.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarCodigo } from '../../compilador/generador.js';
import { ejecutar } from '../../compilador/ejecutor.js';

const programa = (...cuerpo) => ({ tipo: 'Programa', cuerpo });
const pintar = (color, linea) => ({ tipo: 'Pintar', color, linea });
const avanzar = (pasos, linea) => ({ tipo: 'Avanzar', pasos, linea });
const girar = (direccion, linea) => ({ tipo: 'Girar', direccion, linea });
const repetir = (veces, cuerpo, linea) => ({ tipo: 'Repetir', veces, cuerpo, linea });

// Genera el código de un AST y lo ejecuta.
const correr = (ast) => ejecutar(generarCodigo(ast));

test('TC-E01: el cuadrado rojo de lado 3 pinta 12 casillas rojas y el robot vuelve al inicio', () => {
  const ast = programa(
    pintar('rojo', 1),
    repetir(4, [avanzar(3, 3), girar('derecha', 4)], 2)
  );
  const { pasos, estadoFinal, casillasPintadas } = correr(ast);

  const claves = Object.keys(casillasPintadas);
  assert.equal(claves.length, 12);
  assert.ok(claves.every((clave) => casillasPintadas[clave] === 'rojo'));
  assert.deepEqual(estadoFinal, { x: 0, y: 0, direccion: 'derecha', color: 'rojo' });

  // Hay un paso por casilla recorrida: 12 de mover.
  assert.equal(pasos.filter((p) => p.accion === 'mover').length, 12);
  // El primer paso es el cambio de color y viene de la instrucción 0.
  assert.deepEqual(pasos[0], { accion: 'color', color: 'rojo', pc: 0 });
  // El segundo paso es el CONTAR 4 (instrucción 1): empieza el repetir.
  assert.deepEqual(pasos[1], { accion: 'contar', vueltas: 4, pc: 1 });
  // El tercero es llegar a (1, 0), producido por la instrucción 2 (MOVER 3).
  assert.deepEqual(pasos[2], { accion: 'mover', x: 1, y: 0, color: 'rojo', pc: 2 });
  // En total: 1 color + 1 contar + 12 mover + 4 girar + 4 volver = 22 pasos.
  assert.equal(pasos.length, 22);
});

test('TC-E02: girar a la derecha 4 veces deja la orientación inicial', () => {
  const ast = programa(girar('derecha', 1), girar('derecha', 2), girar('derecha', 3), girar('derecha', 4));
  const { pasos, estadoFinal } = correr(ast);
  assert.equal(estadoFinal.direccion, 'derecha');
  assert.deepEqual(
    pasos.map((p) => p.direccion),
    ['abajo', 'izquierda', 'arriba', 'derecha']
  );
});

test('TC-E03: sin pintar, el trazo sale negro', () => {
  const { pasos, estadoFinal, casillasPintadas } = correr(programa(avanzar(2, 1)));
  assert.deepEqual(casillasPintadas, { '1,0': 'negro', '2,0': 'negro' });
  assert.equal(estadoFinal.color, 'negro');
  assert.ok(pasos.every((p) => p.color === 'negro'));
});

test('TC-E04: al cambiar de color a mitad del programa, cada tramo queda con su color', () => {
  const ast = programa(
    avanzar(2, 1),
    pintar('azul', 2),
    girar('derecha', 3),
    avanzar(2, 4)
  );
  const { casillasPintadas, estadoFinal } = correr(ast);
  assert.deepEqual(casillasPintadas, {
    '1,0': 'negro',
    '2,0': 'negro',
    '2,1': 'azul',
    '2,2': 'azul',
  });
  assert.deepEqual(estadoFinal, { x: 2, y: 2, direccion: 'abajo', color: 'azul' });
});

test('TC-E05: un repetir anidado da el número correcto de movimientos', () => {
  // repetir 2: / repetir 3: / avanzar 1 / fin / girar derecha / fin  -> 2 x 3 = 6 movimientos
  const ast = programa(
    repetir(2, [repetir(3, [avanzar(1, 3)], 2), girar('derecha', 4)], 1)
  );
  const { pasos, estadoFinal } = correr(ast);
  assert.equal(pasos.filter((p) => p.accion === 'mover').length, 6);
  assert.equal(pasos.filter((p) => p.accion === 'girar').length, 2);
  // Primero 3 casillas a la derecha, y después 3 hacia abajo.
  assert.deepEqual(estadoFinal, { x: 3, y: 3, direccion: 'izquierda', color: 'negro' });
});

test('TC-E06: CONTAR y VOLVER también dejan un paso, con las vueltas que quedan y si salta', () => {
  // repetir 3: / avanzar 1 / fin  ->  COLOR no hay; instrucciones: 0 CONTAR 3, 1 MOVER 1, 2 VOLVER 1
  const { pasos } = correr(programa(repetir(3, [avanzar(1, 2)], 1)));
  assert.deepEqual(
    pasos.map((p) => p.accion),
    ['contar', 'mover', 'volver', 'mover', 'volver', 'mover', 'volver']
  );
  assert.deepEqual(pasos[0], { accion: 'contar', vueltas: 3, pc: 0 });
  // Después de la 1.ª vuelta quedan 2 y salta; después de la 2.ª queda 1 y salta; en la 3.ª ya no queda ninguna.
  assert.deepEqual(pasos[2], { accion: 'volver', quedan: 2, salta: true, pc: 2 });
  assert.deepEqual(pasos[4], { accion: 'volver', quedan: 1, salta: true, pc: 2 });
  assert.deepEqual(pasos[6], { accion: 'volver', quedan: 0, salta: false, pc: 2 });
  // Los pasos de contar y volver no mueven al robot: no traen casilla ni color.
  assert.ok(pasos.filter((p) => p.accion === 'contar' || p.accion === 'volver').every((p) => p.x === undefined && p.color === undefined));
});

test('TC-E07: en repetir anidados, cada CONTAR interno vuelve a empezar y hay un VOLVER por vuelta', () => {
  // repetir 2: / repetir 3: / avanzar 1 / fin / girar derecha / fin
  const ast = programa(repetir(2, [repetir(3, [avanzar(1, 3)], 2), girar('derecha', 4)], 1));
  const { pasos } = correr(ast);
  assert.equal(pasos.filter((p) => p.accion === 'contar').length, 1 + 2); // el externo una vez y el interno una por cada vuelta externa
  assert.equal(pasos.filter((p) => p.accion === 'volver').length, 3 * 2 + 2); // 6 del interno y 2 del externo
  // Un programa sin repetir no produce pasos de contar ni de volver.
  const sin = correr(programa(avanzar(2, 1))).pasos;
  assert.ok(sin.every((p) => p.accion === 'mover'));
});

test('Extra: si el robot se sale del tablero, el ejecutor lanza un Error normal', () => {
  const instrucciones = generarCodigo(programa(avanzar(10, 1)));
  assert.throws(() => ejecutar(instrucciones), /se salió del tablero/);
});
