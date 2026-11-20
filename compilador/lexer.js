// lexer.js - El Lector (análisis léxico)
// Recibe el código como texto y lo convierte en una lista de tokens.
// Recorre el texto carácter por carácter.

import { ErrorTinto } from './errores.js';

// Palabras que forman el lenguaje, agrupadas por el tipo de token que producen.
export const RESERVADAS = ['avanzar', 'girar', 'pintar', 'repetir', 'veces', 'fin'];
export const DIRECCIONES = ['derecha', 'izquierda'];
export const COLORES = ['rojo', 'azul', 'verde', 'amarillo', 'negro'];

// Una letra es cualquier letra del alfabeto español (con tildes, ü y ñ).
function esLetra(caracter) {
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]$/.test(caracter);
}

// Un dígito es un carácter entre 0 y 9.
function esDigito(caracter) {
  return caracter >= '0' && caracter <= '9';
}

// Escribe un número para mostrarlo en un mensaje de error. JavaScript solo guarda con
// exactitud los enteros hasta 9007199254740991: más allá, un número como 1e23 se mostraría
// como "1e+23" (o como "Infinity" si es gigantesco). Para que el mensaje se lea bien,
// en esos casos se dice "más de 9007199254740991".
export function escribirNumero(numero) {
  if (Number.isSafeInteger(numero)) return String(numero);
  return `más de ${Number.MAX_SAFE_INTEGER}`;
}

// Arma un token con los cinco datos que lo describen.
function crearToken(tipo, lexema, valor, linea, columna) {
  return { tipo, lexema, valor, linea, columna };
}

export function analizarLexico(codigo) {
  const tokens = [];
  let posicion = 0; // en qué carácter del texto vamos
  let linea = 1;    // línea actual (empieza en 1)
  let columna = 1;  // columna actual (empieza en 1)

  while (posicion < codigo.length) {
    const caracter = codigo[posicion];

    // 1. Espacios y tabs se ignoran: solo avanzamos.
    if (caracter === ' ' || caracter === '\t') {
      posicion++;
      columna++;
      continue;
    }

    // 1b. El \r tiene dos usos. Si va seguido de \n es el salto de línea de Windows (\r\n):
    // se ignora y el \n de al lado hace el trabajo. Si va solo es el salto de línea de los
    // Mac antiguos, y se trata igual que un \n.
    if (caracter === '\r' && codigo[posicion + 1] === '\n') {
      posicion++;
      columna++;
      continue;
    }

    // 2. Salto de línea: emite NUEVA_LINEA y pasa a la línea siguiente.
    if (caracter === '\n' || caracter === '\r') {
      tokens.push(crearToken('NUEVA_LINEA', '\\n', null, linea, columna));
      posicion++;
      linea++;
      columna = 1;
      continue;
    }

    // 3. Dígito: lee todos los dígitos seguidos y emite NUMERO.
    if (esDigito(caracter)) {
      const columnaInicial = columna;
      let texto = '';
      while (posicion < codigo.length && esDigito(codigo[posicion])) {
        texto += codigo[posicion];
        posicion++;
        columna++;
      }
      tokens.push(crearToken('NUMERO', texto, Number(texto), linea, columnaInicial));
      continue;
    }

    // 4. Letra: lee letras y dígitos seguidos (una palabra) y la clasifica.
    if (esLetra(caracter)) {
      const columnaInicial = columna;
      let texto = '';
      while (
        posicion < codigo.length &&
        (esLetra(codigo[posicion]) || esDigito(codigo[posicion]))
      ) {
        texto += codigo[posicion];
        posicion++;
        columna++;
      }
      const palabra = texto.toLowerCase(); // mayúsculas y minúsculas dan igual

      // La buscamos en las tres listas para saber qué tipo de token es.
      let tipo = null;
      if (RESERVADAS.includes(palabra)) {
        tipo = 'PALABRA_RESERVADA';
      } else if (DIRECCIONES.includes(palabra)) {
        tipo = 'DIRECCION';
      } else if (COLORES.includes(palabra)) {
        tipo = 'COLOR';
      }

      // Si no está en ninguna lista, es una palabra que Tinto no conoce.
      if (tipo === null) {
        const todas = [...RESERVADAS, ...DIRECCIONES, ...COLORES].join(', ');
        throw new ErrorTinto({
          fase: 'lexico',
          mensaje: `Error léxico en línea ${linea}, columna ${columnaInicial}: palabra desconocida "${texto}"`,
          explicacion: `La palabra "${texto}" no existe en Tinto. Las palabras que sí existen son: ${todas}.`,
          linea,
          columna: columnaInicial,
        });
      }

      tokens.push(crearToken(tipo, texto, palabra, linea, columnaInicial));
      continue;
    }

    // 5. Dos puntos: emite DOS_PUNTOS.
    if (caracter === ':') {
      tokens.push(crearToken('DOS_PUNTOS', ':', ':', linea, columna));
      posicion++;
      columna++;
      continue;
    }

    // 6. Cualquier otro carácter no existe en Tinto: error léxico.
    // Se usa codePointAt para que un emoji cuente como un solo símbolo.
    const simbolo = String.fromCodePoint(codigo.codePointAt(posicion));
    throw new ErrorTinto({
      fase: 'lexico',
      mensaje: `Error léxico en línea ${linea}, columna ${columna}: símbolo inválido "${simbolo}"`,
      explicacion: `El símbolo "${simbolo}" no existe en Tinto. Solo se pueden usar palabras, números enteros y los dos puntos.`,
      linea,
      columna,
    });
  }

  // Siempre cerramos la lista con FIN_ARCHIVO para que el parser sepa dónde termina.
  tokens.push(crearToken('FIN_ARCHIVO', '', null, linea, columna));
  return tokens;
}
