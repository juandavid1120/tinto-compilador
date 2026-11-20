// parser.js - El Gramático (análisis sintáctico)
// Recibe la lista de tokens y construye el árbol de sintaxis (AST).
// Técnica: descenso recursivo. Hay una función por cada regla de la gramática:
//
//   programa    ::= { linea }
//   linea       ::= [ instruccion ] NUEVA_LINEA
//   instruccion ::= avanzar | girar | pintar | repetir
//   avanzar     ::= "avanzar" NUMERO
//   girar       ::= "girar" DIRECCION
//   pintar      ::= "pintar" COLOR
//   repetir     ::= "repetir" NUMERO "veces" ":" NUEVA_LINEA { linea } "fin"

import { ErrorTinto } from './errores.js';
import { COLORES, DIRECCIONES, escribirNumero } from './lexer.js';

// Cuántos "repetir" se pueden meter uno dentro de otro.
// Este error es de la fase sintáctica porque es el parser el que se queda sin espacio: cada
// "repetir" anidado es una llamada más de la función repetir(), y con unos 3.000 niveles Node
// se queda sin pila y lanza RangeError. Se pone el límite en 50: nadie escribe a mano más de
// 3 o 4 niveles, 50 es muchísimo más de lo que una persona usa, y es una cifra muy lejos del
// punto en que Node falla. Así el programa pasa a ser un error normal de Tinto con su línea.
const MAXIMO_ANIDAMIENTO = 50;

// ---------- Ayudas para armar los mensajes de error ----------

// Dice en palabras qué token se encontró.
function describirToken(token) {
  if (token.tipo === 'NUEVA_LINEA') return 'el final de la línea';
  if (token.tipo === 'FIN_ARCHIVO') return 'el final del programa';
  return `"${token.lexema}"`;
}

// Un token es "fin de línea" si es NUEVA_LINEA o FIN_ARCHIVO.
function esFinDeLinea(token) {
  return token.tipo === 'NUEVA_LINEA' || token.tipo === 'FIN_ARCHIVO';
}

// Crea un error sintáctico con la posición del token indicado.
function crearError(token, detalle, explicacion) {
  return new ErrorTinto({
    fase: 'sintactico',
    mensaje: `Error sintáctico en línea ${token.linea}, columna ${token.columna}: ${detalle}`,
    explicacion,
    linea: token.linea,
    columna: token.columna,
  });
}

// Comprueba si el token es una palabra reservada con ese valor (ej.: "veces").
function esReservada(token, palabra) {
  return token.tipo === 'PALABRA_RESERVADA' && token.valor === palabra;
}

// ---------- Función principal ----------

export function analizarSintactico(tokens) {
  let posicion = 0; // índice del token que estamos mirando
  let profundidad = 0; // cuántos "repetir" hay abiertos en este momento

  // Devuelve el token actual sin avanzar.
  function actual() {
    return tokens[posicion];
  }

  // Devuelve el token actual y avanza al siguiente.
  function consumir() {
    const token = tokens[posicion];
    posicion++;
    return token;
  }

  // Al terminar una instrucción debe venir NUEVA_LINEA o FIN_ARCHIVO.
  // Esto es lo que obliga a escribir una sola instrucción por línea.
  function terminarLinea() {
    const token = actual();
    if (token.tipo === 'NUEVA_LINEA') {
      consumir();
      return;
    }
    if (token.tipo === 'FIN_ARCHIVO') {
      return; // el final del programa también cierra la línea
    }
    throw crearError(
      token,
      `se esperaba el final de la línea (va una instrucción por línea) y se encontró ${describirToken(token)}`,
      `En Tinto va una sola instrucción por línea. Escribe ${describirToken(token)} en una línea nueva.`
    );
  }

  // programa ::= { linea }
  function programa() {
    const cuerpo = [];
    while (actual().tipo !== 'FIN_ARCHIVO') {
      if (actual().tipo === 'NUEVA_LINEA') {
        consumir(); // línea vacía: se salta
        continue;
      }
      cuerpo.push(instruccion());
      terminarLinea();
    }
    return { tipo: 'Programa', cuerpo };
  }

  // instruccion ::= avanzar | girar | pintar | repetir
  // Mira la primera palabra de la línea para decidir qué regla usar.
  function instruccion() {
    const token = actual();

    if (esReservada(token, 'avanzar')) return avanzar();
    if (esReservada(token, 'girar')) return girar();
    if (esReservada(token, 'pintar')) return pintar();
    if (esReservada(token, 'repetir')) return repetir();

    // "fin" aquí significa que no hay ningún repetir abierto.
    // (Dentro de un repetir, "fin" lo atiende la función repetir.)
    if (esReservada(token, 'fin')) {
      throw crearError(
        token,
        'se encontró "fin" pero no hay ningún "repetir" abierto',
        'Escribiste "fin", pero no hay ningún "repetir" que cerrar. Cada "fin" cierra un "repetir".'
      );
    }

    // Cualquier otra cosa no puede iniciar una línea.
    throw crearError(
      token,
      `se esperaba una instrucción (avanzar, girar, pintar o repetir) y se encontró ${describirToken(token)}`,
      `Cada línea debe empezar con una orden para el robot: avanzar, girar, pintar o repetir. Aquí apareció ${describirToken(token)}.`
    );
  }

  // avanzar ::= "avanzar" NUMERO
  function avanzar() {
    const inicio = consumir(); // la palabra "avanzar"
    const token = actual();
    if (token.tipo !== 'NUMERO') {
      throw crearError(
        token,
        `después de "avanzar" se esperaba un número y se encontró ${describirToken(token)}`,
        esFinDeLinea(token)
          ? 'Le dijiste al robot que avance, pero no cuántas casillas.'
          : `Después de "avanzar" va el número de casillas, y aquí apareció ${describirToken(token)}.`
      );
    }
    consumir(); // el número
    return { tipo: 'Avanzar', pasos: token.valor, linea: inicio.linea };
  }

  // girar ::= "girar" DIRECCION
  function girar() {
    const inicio = consumir(); // la palabra "girar"
    const token = actual();
    if (token.tipo !== 'DIRECCION') {
      throw crearError(
        token,
        `después de "girar" se esperaba una dirección (${DIRECCIONES.join(' o ')}) y se encontró ${describirToken(token)}`,
        esFinDeLinea(token)
          ? `Le dijiste al robot que gire, pero no hacia dónde. Usa ${DIRECCIONES.map((d) => `"${d}"`).join(' o ')}.`
          : `Después de "girar" va la dirección (${DIRECCIONES.join(' o ')}), y aquí apareció ${describirToken(token)}.`
      );
    }
    consumir(); // la dirección
    return { tipo: 'Girar', direccion: token.valor, linea: inicio.linea };
  }

  // pintar ::= "pintar" COLOR
  function pintar() {
    const inicio = consumir(); // la palabra "pintar"
    const token = actual();
    if (token.tipo !== 'COLOR') {
      throw crearError(
        token,
        `después de "pintar" se esperaba un color (${COLORES.join(', ')}) y se encontró ${describirToken(token)}`,
        esFinDeLinea(token)
          ? `Le dijiste al robot que pinte, pero no de qué color. Los colores son: ${COLORES.join(', ')}.`
          : `Después de "pintar" va el nombre de un color (${COLORES.join(', ')}), y aquí apareció ${describirToken(token)}.`
      );
    }
    consumir(); // el color
    return { tipo: 'Pintar', color: token.valor, linea: inicio.linea };
  }

  // repetir ::= "repetir" NUMERO "veces" ":" NUEVA_LINEA { linea } "fin"
  function repetir() {
    const inicio = consumir(); // la palabra "repetir"

    // 0. Límite de anidamiento: se revisa antes de seguir para no hundir la pila de Node.
    if (profundidad >= MAXIMO_ANIDAMIENTO) {
      throw crearError(
        inicio,
        `hay demasiados "repetir" uno dentro de otro (el máximo es ${MAXIMO_ANIDAMIENTO})`,
        `Este "repetir" es el número ${MAXIMO_ANIDAMIENTO + 1} que está metido dentro de otros. Tinto solo admite ${MAXIMO_ANIDAMIENTO} niveles; usa menos "repetir" uno dentro de otro.`
      );
    }

    // 1. El número de veces.
    const tokenNumero = actual();
    if (tokenNumero.tipo !== 'NUMERO') {
      throw crearError(
        tokenNumero,
        `después de "repetir" se esperaba un número y se encontró ${describirToken(tokenNumero)}`,
        esFinDeLinea(tokenNumero)
          ? 'Le dijiste al robot que repita, pero no cuántas veces.'
          : `Después de "repetir" va el número de veces, y aquí apareció ${describirToken(tokenNumero)}.`
      );
    }
    consumir();

    // 2. La palabra "veces".
    const tokenVeces = actual();
    if (!esReservada(tokenVeces, 'veces')) {
      throw crearError(
        tokenVeces,
        `después del número de "repetir" se esperaba "veces" y se encontró ${describirToken(tokenVeces)}`,
        `Falta la palabra "veces". Se escribe así: repetir ${escribirNumero(tokenNumero.valor)} veces:`
      );
    }
    consumir();

    // 3. Los dos puntos.
    const tokenDosPuntos = actual();
    if (tokenDosPuntos.tipo !== 'DOS_PUNTOS') {
      throw crearError(
        tokenDosPuntos,
        `después de "veces" se esperaba ":" y se encontró ${describirToken(tokenDosPuntos)}`,
        `Faltan los dos puntos al final. Se escribe así: repetir ${escribirNumero(tokenNumero.valor)} veces:`
      );
    }
    consumir();

    // 4. Un salto de línea. Si en vez de eso se acabó el programa, no se
    //    reporta aquí: el ciclo de abajo avisa que falta el "fin".
    const tokenSalto = actual();
    if (tokenSalto.tipo !== 'NUEVA_LINEA' && tokenSalto.tipo !== 'FIN_ARCHIVO') {
      throw crearError(
        tokenSalto,
        `después de "repetir ${escribirNumero(tokenNumero.valor)} veces:" se esperaba el final de la línea y se encontró ${describirToken(tokenSalto)}`,
        `Lo que se repite debe ir en las líneas de abajo. Escribe ${describirToken(tokenSalto)} en una línea nueva.`
      );
    }

    // 5. El cuerpo: líneas hasta encontrar "fin".
    const cuerpo = [];
    profundidad++; // desde aquí hasta el "fin" hay un "repetir" más abierto
    while (!esReservada(actual(), 'fin')) {
      const token = actual();

      if (token.tipo === 'FIN_ARCHIVO') {
        // Se acabó el programa y nunca apareció el "fin".
        throw crearError(
          inicio,
          `el "repetir" que empieza en la línea ${inicio.linea} nunca se cierra: se esperaba "fin" y se encontró el final del programa`,
          `El "repetir" de la línea ${inicio.linea} no tiene su "fin". Cada "repetir" necesita un "fin" que le diga al robot dónde termina lo que se repite.`
        );
      }

      if (token.tipo === 'NUEVA_LINEA') {
        consumir(); // línea vacía: se salta
        continue;
      }

      cuerpo.push(instruccion()); // si es otro repetir, la recursión lo anida
      terminarLinea();
    }
    consumir(); // el "fin"
    profundidad--;

    return { tipo: 'Repetir', veces: tokenNumero.valor, cuerpo, linea: inicio.linea };
  }

  return programa();
}
