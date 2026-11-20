// semantico.js (El Juez)
// Fase 3 del compilador: revisa que el programa tenga sentido.
// Entrada: el AST. Salida: la lista de revisiones aprobadas, o un error semántico.

import { ErrorTinto } from './errores.js';
import { escribirNumero } from './lexer.js';

// Tamaño del tablero: 10 columnas (x de 0 a 9) y 10 filas (y de 0 a 9).
const TAMANO_TABLERO = 10;

// Máximo de vueltas que admite un "repetir".
const MAXIMO_VECES = 100;

// Máximo de instrucciones que se simulan antes de decir que el programa es demasiado largo.
const MAXIMO_INSTRUCCIONES = 10000;

// Las cuatro orientaciones, en el orden en que se llega girando a la derecha.
const ORIENTACIONES = ['derecha', 'abajo', 'izquierda', 'arriba'];

// Cuánto cambia (x, y) por cada casilla que se avanza en cada orientación.
// Recordar: y crece hacia abajo.
const MOVIMIENTO = {
  derecha: { dx: 1, dy: 0 },
  abajo: { dx: 0, dy: 1 },
  izquierda: { dx: -1, dy: 0 },
  arriba: { dx: 0, dy: -1 },
};

// Nombre del borde por el que el robot se saldría, según hacia dónde mira.
const BORDE = {
  derecha: 'derecho',
  abajo: 'inferior',
  izquierda: 'izquierdo',
  arriba: 'superior',
};

// Crea un error semántico. La columna siempre es null porque el AST no guarda columnas.
function crearError(linea, mensaje, explicacion) {
  return new ErrorTinto({
    fase: 'semantico',
    mensaje: `Error semántico en línea ${linea}: ${mensaje}`,
    explicacion,
    linea,
    columna: null,
  });
}

// Revisión 1: ni "avanzar 0" ni "repetir 0 veces" tienen sentido.
// Recorre todo el árbol, incluso lo que está dentro de los "repetir".
function revisarNumeros(nodos) {
  for (const nodo of nodos) {
    if (nodo.tipo === 'Avanzar' && nodo.pasos === 0) {
      throw crearError(
        nodo.linea,
        '"avanzar 0" no tiene sentido',
        'Le pediste al robot que avance 0 casillas, o sea que se quede quieto. Usa un número mayor que cero.'
      );
    }
    if (nodo.tipo === 'Repetir') {
      if (nodo.veces === 0) {
        throw crearError(
          nodo.linea,
          '"repetir 0 veces" no tiene sentido',
          'Le pediste al robot que repita algo 0 veces, o sea que nunca lo haga. Usa un número mayor que cero.'
        );
      }
      revisarNumeros(nodo.cuerpo);
    }
  }
}

// Revisión 2: un "repetir" no puede pasar de 100 veces.
function revisarLimiteRepeticiones(nodos) {
  for (const nodo of nodos) {
    if (nodo.tipo === 'Repetir') {
      if (nodo.veces > MAXIMO_VECES) {
        throw crearError(
          nodo.linea,
          `"repetir ${escribirNumero(nodo.veces)} veces" supera el límite de ${MAXIMO_VECES} repeticiones`,
          `El robot solo puede repetir un bloque hasta ${MAXIMO_VECES} veces y tú pediste ${escribirNumero(nodo.veces)}.`
        );
      }
      revisarLimiteRepeticiones(nodo.cuerpo);
    }
  }
}

// Arma el texto que dice en qué vuelta de cada "repetir" ocurrió el problema.
// "vueltas" es una lista de { linea, vuelta }, del repetir de afuera al de adentro.
function describirVueltas(vueltas) {
  const partes = vueltas.map(
    (v) => `en la vuelta ${v.vuelta} del "repetir" de la línea ${v.linea}`
  );
  return partes.join(' y ');
}

// Revisiones 3 y 4: simula el recorrido del robot sin dibujar.
// "estado" lleva la posición, la orientación y cuántas instrucciones se han simulado.
// "vueltas" lleva en qué vuelta va cada "repetir" que está abierto.
function simularBloque(nodos, estado, vueltas) {
  for (const nodo of nodos) {
    if (nodo.tipo === 'Avanzar') {
      contarInstruccion(estado, nodo, vueltas);
      simularAvanzar(nodo, estado, vueltas);
    } else if (nodo.tipo === 'Girar') {
      contarInstruccion(estado, nodo, vueltas);
      // Girar a la derecha suma 1 en la lista de orientaciones; a la izquierda resta 1 (o sea suma 3).
      const posicion = ORIENTACIONES.indexOf(estado.direccion);
      const salto = nodo.direccion === 'derecha' ? 1 : 3;
      estado.direccion = ORIENTACIONES[(posicion + salto) % 4];
    } else if (nodo.tipo === 'Pintar') {
      // Pintar no mueve al robot, solo cuenta como una instrucción.
      contarInstruccion(estado, nodo, vueltas);
    } else if (nodo.tipo === 'Repetir') {
      for (let vuelta = 1; vuelta <= nodo.veces; vuelta++) {
        // Cada vuelta también cuenta como instrucción (es el VOLVER del código generado).
        contarInstruccion(estado, nodo, vueltas);
        vueltas.push({ linea: nodo.linea, vuelta });
        simularBloque(nodo.cuerpo, estado, vueltas);
        vueltas.pop();
      }
    }
  }
}

// Suma una instrucción simulada y avisa si el programa ya es demasiado largo.
// La línea del error es la del "repetir" más externo que está abierto: es el que provoca el
// exceso, porque multiplica todo lo que lleva adentro. Si no hay ningún "repetir" abierto
// (por ejemplo, miles de líneas sueltas), es la línea de la instrucción que pasó el límite.
function contarInstruccion(estado, nodo, vueltas) {
  estado.instrucciones++;
  if (estado.instrucciones > MAXIMO_INSTRUCCIONES) {
    const linea = vueltas.length > 0 ? vueltas[0].linea : nodo.linea;
    throw crearError(
      linea,
      `el programa es demasiado largo (pasa de ${MAXIMO_INSTRUCCIONES} instrucciones ejecutadas)`,
      vueltas.length > 0
        ? `El "repetir" de la línea ${linea} hace que el robot tenga que dar demasiados pasos. Usa menos repeticiones.`
        : 'El programa tiene demasiadas instrucciones. Escribe menos líneas o usa un "repetir".'
    );
  }
}

// Simula un "avanzar N": calcula el destino con una suma, sin recorrer casilla por casilla.
function simularAvanzar(nodo, estado, vueltas) {
  const mov = MOVIMIENTO[estado.direccion];
  const destinoX = estado.x + mov.dx * nodo.pasos;
  const destinoY = estado.y + mov.dy * nodo.pasos;

  const dentro =
    destinoX >= 0 && destinoX < TAMANO_TABLERO && destinoY >= 0 && destinoY < TAMANO_TABLERO;

  if (!dentro) {
    // Si está dentro de uno o más "repetir", el mensaje dice en qué vuelta pasó.
    let detalle = '';
    if (vueltas.length > 0) {
      detalle = `${describirVueltas(vueltas)}, `;
    }
    throw crearError(
      nodo.linea,
      `${detalle}el robot se sale del tablero`,
      `El tablero mide ${TAMANO_TABLERO}×${TAMANO_TABLERO} y con ese "avanzar" el robot se caería por el borde ${BORDE[estado.direccion]}.`
    );
  }

  estado.x = destinoX;
  estado.y = destinoY;
}

// Función principal de la fase. Devuelve las revisiones aprobadas o lanza un ErrorTinto.
export function analizarSemantico(ast) {
  const revisiones = [];

  revisarNumeros(ast.cuerpo);
  revisiones.push('Todos los números tienen sentido');

  revisarLimiteRepeticiones(ast.cuerpo);
  revisiones.push('Las repeticiones están dentro del límite');

  // El robot empieza en la esquina superior izquierda mirando a la derecha.
  const estado = { x: 0, y: 0, direccion: 'derecha', instrucciones: 0 };
  simularBloque(ast.cuerpo, estado, []);
  revisiones.push('El robot nunca se sale del tablero');
  revisiones.push('El programa no es demasiado largo');

  return revisiones;
}
