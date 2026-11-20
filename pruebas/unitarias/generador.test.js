// Pruebas de la generación de código (El Traductor): TC-G01 a TC-G03.
// Los AST se arman a mano, sin pasar por el lexer ni el parser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarCodigo, instruccionesATexto } from '../../compilador/generador.js';

const programa = (...cuerpo) => ({ tipo: 'Programa', cuerpo });
const pintar = (color, linea) => ({ tipo: 'Pintar', color, linea });
const avanzar = (pasos, linea) => ({ tipo: 'Avanzar', pasos, linea });
const girar = (direccion, linea) => ({ tipo: 'Girar', direccion, linea });
const repetir = (veces, cuerpo, linea) => ({ tipo: 'Repetir', veces, cuerpo, linea });

test('TC-G01: un programa sin ciclos genera una instrucción por línea', () => {
  const ast = programa(pintar('rojo', 1), avanzar(3, 2), girar('derecha', 3), girar('izquierda', 4));
  const instrucciones = generarCodigo(ast);
  assert.deepEqual(instrucciones, [
    { op: 'COLOR', arg: 'rojo', linea: 1 },
    { op: 'MOVER', arg: 3, linea: 2 },
    { op: 'GIRAR', arg: 'DER', linea: 3 },
    { op: 'GIRAR', arg: 'IZQ', linea: 4 },
  ]);
  assert.deepEqual(instruccionesATexto(instrucciones), [
    '0  COLOR rojo',
    '1  MOVER 3',
    '2  GIRAR DER',
    '3  GIRAR IZQ',
  ]);
});

test('TC-G02: un repetir genera CONTAR y VOLVER, y VOLVER apunta al inicio del bloque', () => {
  // El cuadrado rojo.
  const ast = programa(
    pintar('rojo', 1),
    repetir(4, [avanzar(3, 3), girar('derecha', 4)], 2)
  );
  const instrucciones = generarCodigo(ast);
  assert.deepEqual(instrucciones, [
    { op: 'COLOR', arg: 'rojo', linea: 1 },
    { op: 'CONTAR', arg: 4, linea: 2 },
    { op: 'MOVER', arg: 3, linea: 3 },
    { op: 'GIRAR', arg: 'DER', linea: 4 },
    { op: 'VOLVER', arg: 2, linea: 2 },
  ]);
  assert.deepEqual(instruccionesATexto(instrucciones), [
    '0  COLOR rojo',
    '1  CONTAR 4',
    '2  MOVER 3',
    '3  GIRAR DER',
    '4  VOLVER 2',
  ]);
});

test('TC-G03: un repetir anidado genera dos pares CONTAR/VOLVER con los saltos correctos', () => {
  // repetir 2: / avanzar 1 / repetir 3: / girar derecha / fin / fin
  const ast = programa(
    repetir(2, [avanzar(1, 2), repetir(3, [girar('derecha', 4)], 3)], 1)
  );
  const instrucciones = generarCodigo(ast);
  assert.deepEqual(instruccionesATexto(instrucciones), [
    '0  CONTAR 2',
    '1  MOVER 1',
    '2  CONTAR 3',
    '3  GIRAR DER',
    '4  VOLVER 3',
    '5  VOLVER 1',
  ]);
  // El VOLVER de adentro y el de afuera llevan la línea de su propio repetir.
  assert.equal(instrucciones[4].linea, 3);
  assert.equal(instrucciones[5].linea, 1);
});
