// compilar.js
// Une las cinco fases del compilador en una sola función.
// Siempre devuelve el mismo tipo de objeto. Si una fase falla con un ErrorTinto,
// el error queda en "error", las fases anteriores quedan llenas y las siguientes en null.

import { ErrorTinto } from './errores.js';
import { analizarLexico } from './lexer.js';
import { analizarSintactico } from './parser.js';
import { analizarSemantico } from './semantico.js';
import { generarCodigo } from './generador.js';
import { ejecutar } from './ejecutor.js';

export function compilar(codigo) {
  // Resultado inicial: todo vacío.
  const resultado = {
    tokens: null,
    ast: null,
    revisiones: null,
    instrucciones: null,
    pasos: null,
    estadoFinal: null,
    casillasPintadas: null,
    vacio: false,
    error: null,
  };

  try {
    // Fase 1: léxico
    resultado.tokens = analizarLexico(codigo);

    // Fase 2: sintáctico
    resultado.ast = analizarSintactico(resultado.tokens);

    // Si no hay ninguna instrucción, no hay nada que compilar.
    if (resultado.ast.cuerpo.length === 0) {
      resultado.vacio = true;
      return resultado;
    }

    // Fase 3: semántico
    resultado.revisiones = analizarSemantico(resultado.ast);

    // Fase 4: generación de código
    resultado.instrucciones = generarCodigo(resultado.ast);

    // Fase 5: ejecución
    const ejecucion = ejecutar(resultado.instrucciones);
    resultado.pasos = ejecucion.pasos;
    resultado.estadoFinal = ejecucion.estadoFinal;
    resultado.casillasPintadas = ejecucion.casillasPintadas;
  } catch (e) {
    // Solo atrapamos los errores del lenguaje Tinto; cualquier otro error se deja pasar.
    if (e instanceof ErrorTinto) {
      resultado.error = e.aObjeto();
    } else {
      throw e;
    }
  }

  return resultado;
}
