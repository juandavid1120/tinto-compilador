// ejemplos.js
// Los cinco ejemplos guardados (funcionan sin IA ni internet) y las tarjetas de retos.
// Son solo datos: app.js los pinta en la pantalla.

// Cada ejemplo tiene:
//   frase:    lo que diría una persona en español
//   etiqueta: cómo debe terminar al compilarlo (para el botón)
//   esperado: null si compila bien, o la fase que debe atrapar el error
//   codigo:   el código Tinto ya escrito
export const EJEMPLOS = [
  {
    id: 'cuadrado',
    frase: 'Dibuja un cuadrado rojo',
    etiqueta: 'Correcto',
    esperado: null,
    codigo: [
      'pintar rojo',
      'repetir 4 veces:',
      '  avanzar 3',
      '  girar derecha',
      'fin',
    ].join('\n'),
  },
  {
    id: 'escalera',
    frase: 'Dibuja una escalera azul',
    etiqueta: 'Correcto, con repetir',
    esperado: null,
    codigo: [
      'pintar azul',
      'repetir 6 veces:',
      '  avanzar 1',
      '  girar derecha',
      '  avanzar 1',
      '  girar izquierda',
      'fin',
    ].join('\n'),
  },
  {
    id: 'lexico',
    frase: 'Error léxico: avanzar @3',
    etiqueta: 'Falla El Lector',
    esperado: 'lexico',
    codigo: 'avanzar @3',
  },
  {
    id: 'sintactico',
    frase: 'Error sintáctico: repetir sin fin',
    etiqueta: 'Falla El Gramático',
    esperado: 'sintactico',
    // Falta el "fin" que cierra el repetir.
    codigo: [
      'repetir 4 veces:',
      '  avanzar 3',
      '  girar derecha',
    ].join('\n'),
  },
  {
    id: 'semantico',
    frase: 'Error semántico: avanzar 99',
    etiqueta: 'Falla El Juez',
    esperado: 'semantico',
    codigo: 'avanzar 99',
  },
];

// Las tarjetas de retos para el público.
//   fase: si el reto es "haz que X falle", la fase que debe fallar.
//         app.js lo marca como cumplido solo cuando ocurre ese error.
export const RETOS = [
  {
    id: 'escalera',
    titulo: 'Dibuja una escalera',
    descripcion: 'Haz que el robot suba o baje en escalones.',
    pista: 'Dentro de un repetir: avanzar 1, girar derecha, avanzar 1, girar izquierda.',
    fase: null,
  },
  {
    id: 'inicial',
    titulo: 'Dibuja una letra: prueba L, T, H o E',
    descripcion: 'Con líneas rectas, dibuja tu letra en el tablero.',
    pista: 'La L: girar derecha, avanzar 5, girar izquierda, avanzar 3 (baja y luego va a la derecha). Cuidado: el robot no puede salirse.',
    fase: null,
  },
  {
    id: 'lector',
    titulo: 'Haz que El Lector falle',
    descripcion: 'Escribe algo que Tinto no sabe leer.',
    pista: 'Una palabra inventada, o un símbolo raro como @ o %.',
    fase: 'lexico',
  },
  {
    id: 'gramatico',
    titulo: 'Haz que El Gramático falle',
    descripcion: 'Usa palabras que existen, pero en mal orden.',
    pista: 'Un avanzar sin número, o un repetir al que le falte el fin.',
    fase: 'sintactico',
  },
  {
    id: 'juez',
    titulo: 'Haz que El Juez falle',
    descripcion: 'Escribe algo bien escrito pero que no tenga sentido.',
    pista: 'Un avanzar tan grande que el robot se salga del tablero.',
    fase: 'semantico',
  },
];
