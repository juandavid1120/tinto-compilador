// Pruebas de la fase semántica (El Juez): TC-M01 a TC-M06.
// Los AST se arman a mano, sin pasar por el lexer ni el parser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarSemantico } from '../../compilador/semantico.js';
import { ErrorTinto } from '../../compilador/errores.js';

// Atajos para armar nodos del AST.
const programa = (...cuerpo) => ({ tipo: 'Programa', cuerpo });
const avanzar = (pasos, linea) => ({ tipo: 'Avanzar', pasos, linea });
const girar = (direccion, linea) => ({ tipo: 'Girar', direccion, linea });
const repetir = (veces, cuerpo, linea) => ({ tipo: 'Repetir', veces, cuerpo, linea });

// Ejecuta el análisis y devuelve el ErrorTinto que lanza (falla si no lanza nada).
function errorDe(ast) {
  try {
    analizarSemantico(ast);
  } catch (e) {
    assert.ok(e instanceof ErrorTinto, 'debe lanzar un ErrorTinto');
    return e;
  }
  assert.fail('se esperaba un error semántico y no hubo ninguno');
}

test('TC-M01: avanzar 99 se sale del tablero', () => {
  const e = errorDe(programa(avanzar(99, 1)));
  assert.equal(e.fase, 'semantico');
  assert.equal(e.linea, 1);
  assert.equal(e.columna, null);
  assert.match(e.mensaje, /se sale del tablero/);
  assert.match(e.explicacion, /borde derecho/);
});

test('TC-M02: avanzar 9 llega justo al borde y es válido', () => {
  const revisiones = analizarSemantico(programa(avanzar(9, 1)));
  assert.ok(Array.isArray(revisiones));
  assert.ok(revisiones.length > 0);
  assert.ok(revisiones.every((r) => typeof r === 'string'));
});

test('TC-M03: avanzar 10 se sale una casilla de más', () => {
  const e = errorDe(programa(avanzar(10, 1)));
  assert.equal(e.fase, 'semantico');
  assert.match(e.mensaje, /se sale del tablero/);
});

test('TC-M04: repetir 0 veces y avanzar 0 no tienen sentido', () => {
  const e1 = errorDe(programa(repetir(0, [avanzar(1, 2)], 1)));
  assert.equal(e1.fase, 'semantico');
  assert.equal(e1.linea, 1);
  assert.match(e1.mensaje, /no tiene sentido/);

  const e2 = errorDe(programa(avanzar(0, 1)));
  assert.equal(e2.fase, 'semantico');
  assert.equal(e2.linea, 1);
  assert.match(e2.mensaje, /no tiene sentido/);
});

test('TC-M05: si se sale en la tercera vuelta de un repetir, dice la vuelta', () => {
  // repetir 5 veces: avanzar 4. Posiciones: 4, 8 y a la tercera vuelta 12 (fuera).
  const e = errorDe(programa(repetir(5, [avanzar(4, 2)], 1)));
  assert.equal(e.fase, 'semantico');
  assert.equal(e.linea, 2);
  assert.match(e.mensaje, /vuelta 3/);
  assert.match(e.mensaje, /línea 1/);
  assert.equal(
    e.mensaje,
    'Error semántico en línea 2: en la vuelta 3 del "repetir" de la línea 1, el robot se sale del tablero'
  );
});

test('TC-M06: repetir 101 veces supera el límite', () => {
  const e = errorDe(programa(repetir(101, [girar('derecha', 2)], 1)));
  assert.equal(e.fase, 'semantico');
  assert.equal(e.linea, 1);
  assert.match(e.mensaje, /límite/);

  // 100 veces sí es válido.
  analizarSemantico(programa(repetir(100, [girar('derecha', 2)], 1)));
});

test('Extra: con ciclos anidados el mensaje menciona la vuelta de cada nivel', () => {
  // repetir 3: repetir 5: avanzar 2 -> en la vuelta 1 de afuera llega a 10 en la vuelta 5 de adentro.
  const e = errorDe(programa(repetir(3, [repetir(5, [avanzar(2, 3)], 2)], 1)));
  assert.match(e.mensaje, /vuelta 1 del "repetir" de la línea 1/);
  assert.match(e.mensaje, /vuelta 5 del "repetir" de la línea 2/);
});

test('Extra: un avanzar gigante no cuelga y el borde depende de la orientación', () => {
  const e = errorDe(programa(girar('derecha', 1), avanzar(1000000000, 2)));
  assert.match(e.explicacion, /borde inferior/);
  const e2 = errorDe(programa(girar('izquierda', 1), avanzar(1, 2)));
  assert.match(e2.explicacion, /borde superior/);
});

test('Extra: un programa enorme por ciclos anidados da error de "demasiado largo"', () => {
  // 100 x 100 x 100 vueltas de solo girar: nunca se sale del tablero, pero son un millón de instrucciones.
  const ast = programa(
    repetir(100, [repetir(100, [repetir(100, [girar('derecha', 4)], 3)], 2)], 1)
  );
  const e = errorDe(ast);
  assert.equal(e.fase, 'semantico');
  assert.match(e.mensaje, /demasiado largo/);
});

test('Corrección: "demasiado largo" indica la línea del repetir más externo (ya no es null)', () => {
  // El repetir de la línea 1 es el que provoca el exceso: multiplica todo lo de adentro.
  const ast = programa(
    repetir(100, [repetir(100, [repetir(100, [girar('derecha', 4)], 3)], 2)], 1)
  );
  const e = errorDe(ast);
  assert.equal(e.linea, 1);
  assert.equal(e.columna, null);
  assert.match(e.mensaje, /^Error semántico en línea 1: el programa es demasiado largo/);
  assert.match(e.explicacion, /línea 1/);
});

test('Corrección: "demasiado largo" por un repetir que no es el primero señala ese repetir', () => {
  // Las dos primeras líneas son inofensivas; el repetir de la línea 3 es el que se pasa.
  const ast = programa(
    girar('derecha', 1),
    girar('izquierda', 2),
    repetir(100, [repetir(100, [girar('derecha', 5)], 4)], 3)
  );
  assert.equal(errorDe(ast).linea, 3);
});

test('Corrección: "demasiado largo" sin ningún repetir señala la instrucción que se pasa del límite', () => {
  const lineas = [];
  for (let i = 1; i <= 10001; i++) lineas.push(girar('derecha', i));
  const e = errorDe(programa(...lineas));
  assert.equal(e.linea, 10001);
});

test('Corrección: los números enormes se escriben legibles en el mensaje (sin Infinity ni 1e+23)', () => {
  for (const veces of [1e23, Infinity, 9007199254740993]) {
    const e = errorDe(programa(repetir(veces, [girar('derecha', 2)], 1)));
    assert.equal(e.linea, 1);
    assert.doesNotMatch(e.mensaje + e.explicacion, /Infinity|e\+/);
    assert.match(e.mensaje, /repetir más de 9007199254740991 veces/);
  }
  // Un número normal se sigue escribiendo tal cual.
  const e = errorDe(programa(repetir(101, [girar('derecha', 2)], 1)));
  assert.match(e.mensaje, /"repetir 101 veces" supera el límite de 100 repeticiones/);
});
