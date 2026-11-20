// personajes.js
// La línea de los cinco personajes y el panel de cada uno.
//
// Cada personaje es una fase del compilador. Puede estar en tres estados:
//   "espera"   (apagado), "aprobado" (verde) o "error" (rojo).
// El panel muestra lo que produjo la fase, o el error si falló, y el botón
// "¿Qué pasó aquí?" arma una explicación con los datos reales del código actual.

import { instruccionesATexto } from '../compilador/generador.js';
import { dibujarArbol } from './arbol.js';

// ---------- Datos de los personajes ----------

export const PERSONAJES = [
  { id: 'lector', emoji: '📖', nombre: 'El Lector', tecnico: 'Análisis léxico' },
  { id: 'gramatico', emoji: '🌳', nombre: 'El Gramático', tecnico: 'Análisis sintáctico' },
  { id: 'juez', emoji: '⚖️', nombre: 'El Juez', tecnico: 'Análisis semántico' },
  { id: 'traductor', emoji: '🔧', nombre: 'El Traductor', tecnico: 'Generación de código' },
  { id: 'ejecutor', emoji: '🤖', nombre: 'El Ejecutor', tecnico: 'Ejecución' },
];

// El campo error.fase dice qué personaje falló.
export const FASE_A_INDICE = { lexico: 0, sintactico: 1, semantico: 2 };

// ---------- Ayudas para armar la pantalla ----------

// Crea un elemento con clase y texto (el texto se pone como texto, nunca como HTML).
export function crear(etiqueta, clase = '', texto = '') {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

// Convierte un texto con `comillas invertidas` en un fragmento donde esas partes son <code>.
export function conCodigo(texto) {
  const fragmento = document.createDocumentFragment();
  texto.split('`').forEach((trozo, i) => {
    if (trozo === '') return;
    fragmento.append(i % 2 === 1 ? crear('code', '', trozo) : document.createTextNode(trozo));
  });
  return fragmento;
}

// "1 casilla", "3 casillas".
function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

// Resume la lista de pasos del Ejecutor para poder hablar de "instrucciones ejecutadas".
// Un mover de 3 casillas son 3 pasos pero UNA instrucción, así que se cuenta una instrucción
// cada vez que el paso viene de una instrucción distinta a la del paso anterior.
//   hasta[i]: cuántas instrucciones se habían ejecutado al llegar al paso i
//   total:    cuántas se ejecutan en todo el programa (el repetir repite las de adentro)
export function resumirPasos(pasos) {
  const hasta = [];
  let total = 0;
  pasos.forEach((paso, i) => {
    if (i === 0 || paso.pc !== pasos[i - 1].pc) total++;
    hasta.push(total);
  });
  return { hasta, total };
}

// Los tokens que se muestran en el código resaltado (sin saltos de línea ni fin de archivo).
function esTokenVisible(token) {
  return token.tipo !== 'NUEVA_LINEA' && token.tipo !== 'FIN_ARCHIVO';
}

// ---------- La línea de personajes ----------

const FLECHA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NOMBRE_ESTADO = { espera: 'en espera', aprobado: 'aprobado', error: 'con error' };

// Dibuja los cinco personajes con flechas entre ellos.
// alElegir(indice) se llama cuando alguien hace clic en un personaje.
export function crearLinea(contenedor, alElegir) {
  contenedor.replaceChildren();
  const tarjetas = [];
  const flechas = [];

  PERSONAJES.forEach((personaje, i) => {
    if (i > 0) {
      const flecha = crear('span', 'flecha');
      flecha.innerHTML = FLECHA;
      contenedor.append(flecha);
      flechas.push(flecha);
    }
    const tarjeta = crear('button', 'personaje');
    tarjeta.type = 'button';
    tarjeta.dataset.estado = 'espera';
    tarjeta.append(
      crear('span', 'personaje-sello'), // el ✓ o la ✗ (se dibujan desde el CSS)
      crear('span', 'personaje-dibujo', personaje.emoji),
      crear('span', 'personaje-nombre', personaje.nombre),
      crear('span', 'personaje-tecnico', personaje.tecnico)
    );
    tarjeta.setAttribute('aria-label', `${personaje.nombre}, ${personaje.tecnico}: en espera`);
    tarjeta.addEventListener('click', () => alElegir(i));
    contenedor.append(tarjeta);
    tarjetas.push(tarjeta);
  });

  return {
    // Cambia el estado de un personaje: "espera", "aprobado" o "error".
    poner(indice, estado) {
      const tarjeta = tarjetas[indice];
      tarjeta.dataset.estado = estado;
      tarjeta.classList.remove('trabajando');
      const p = PERSONAJES[indice];
      tarjeta.setAttribute('aria-label', `${p.nombre}, ${p.tecnico}: ${NOMBRE_ESTADO[estado]}`);
      // La flecha que sale de un personaje aprobado se enciende.
      if (indice < flechas.length) flechas[indice].classList.toggle('encendida', estado === 'aprobado');
    },
    // Hace que un personaje "palpite" mientras trabaja.
    trabajando(indice, si) {
      tarjetas[indice].classList.toggle('trabajando', si);
    },
    // Lleva el foco del teclado a la tarjeta de un personaje.
    enfocar(indice) {
      tarjetas[indice].focus();
    },
    // Marca cuál personaje tiene su panel abierto.
    seleccionar(indice) {
      tarjetas.forEach((t, i) => t.classList.toggle('elegido', i === indice));
    },
    // Todos vuelven a "en espera".
    reiniciar() {
      PERSONAJES.forEach((_, i) => this.poner(i, 'espera'));
      this.seleccionar(-1);
    },
  };
}

// ---------- Vista del código (con números de línea) ----------

// Dibuja el código con números de línea. Opciones:
//   tokens:       si viene, cada lexema se resalta según su tipo de token
//   lineaError:   número de línea que se pinta de rojo
//   marca:        { linea, columna, largo }: el pedacito exacto que falló
//   tonoPorLinea: Map línea -> color, para ligar el código con sus instrucciones
function vistaCodigo(codigo, opciones = {}) {
  const caja = crear('div', 'codigo');
  const lineas = codigo.split('\n').map((l) => l.replace(/\r$/, ''));

  // Agrupa los tokens por línea.
  const tokensPorLinea = new Map();
  for (const token of (opciones.tokens ?? []).filter(esTokenVisible)) {
    if (!tokensPorLinea.has(token.linea)) tokensPorLinea.set(token.linea, []);
    tokensPorLinea.get(token.linea).push(token);
  }

  lineas.forEach((texto, indice) => {
    const numero = indice + 1;
    const fila = crear('div', 'fila');
    fila.dataset.linea = numero;
    fila.append(crear('span', 'fila-numero', String(numero)));
    const contenido = crear('span', 'fila-texto');

    // Trozos de la línea: cada token con su clase, y lo demás tal cual.
    const trozos = []; // { desde, hasta, clase }
    for (const token of tokensPorLinea.get(numero) ?? []) {
      trozos.push({ desde: token.columna - 1, hasta: token.columna - 1 + token.lexema.length, clase: `lexema tok-${token.tipo}` });
    }
    if (opciones.marca && opciones.marca.linea === numero) {
      const m = opciones.marca;
      trozos.push({ desde: m.columna - 1, hasta: m.columna - 1 + Math.max(m.largo, 1), clase: 'mala' });
    }
    trozos.sort((a, b) => a.desde - b.desde);

    let posicion = 0;
    for (const trozo of trozos) {
      if (trozo.desde < posicion) continue; // por si dos trozos se pisan
      if (trozo.desde > posicion) contenido.append(texto.slice(posicion, trozo.desde));
      // Si la marca cae al final de la línea, no hay letra que marcar: se usa un espacio.
      contenido.append(crear('span', trozo.clase, texto.slice(trozo.desde, trozo.hasta) || ' '));
      posicion = Math.max(posicion, trozo.hasta);
    }
    if (posicion < texto.length) contenido.append(texto.slice(posicion));

    fila.append(contenido);
    if (opciones.lineaError === numero) fila.classList.add('con-error');
    if (opciones.tonoPorLinea?.has(numero)) {
      fila.classList.add('con-tono');
      fila.style.setProperty('--tono', opciones.tonoPorLinea.get(numero));
    }
    caja.append(fila);
  });

  return caja;
}

// Averigua qué pedacito del código falló, para subrayarlo en rojo.
// Devuelve { linea, columna, largo } o null si el error no trae columna.
function marcaDelError(codigo, resultado) {
  const error = resultado.error;
  if (!error || !error.linea || !error.columna) return null;
  const texto = (codigo.split('\n')[error.linea - 1] ?? '').replace(/\r$/, '');
  const desde = texto.slice(error.columna - 1);

  // Si hay tokens (error sintáctico), se usa el largo del token que falló.
  const token = (resultado.tokens ?? []).find((t) => t.linea === error.linea && t.columna === error.columna);
  if (token) {
    const largo = esTokenVisible(token) ? token.lexema.length : 0; // 0: falló justo al final de la línea
    return { linea: error.linea, columna: error.columna, largo };
  }
  // Si no (error léxico): una palabra completa o un solo símbolo.
  const palabra = desde.match(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]*/);
  const largo = palabra ? palabra[0].length : desde ? String.fromCodePoint(desde.codePointAt(0)).length : 1;
  return { linea: error.linea, columna: error.columna, largo };
}

// ---------- Paneles de cada personaje ----------

// Panel del Lector: código resaltado + leyenda + lista de tokens.
const LEYENDA = [
  ['PALABRA_RESERVADA', 'Palabra reservada'],
  ['DIRECCION', 'Dirección'],
  ['COLOR', 'Color'],
  ['NUMERO', 'Número'],
  ['DOS_PUNTOS', 'Dos puntos'],
];

function panelLector(cuerpo, datos) {
  const { codigo, resultado } = datos;
  const izquierda = crear('div', 'col col-codigo');
  izquierda.append(vistaCodigo(codigo, { tokens: resultado.tokens }));

  // La leyenda va en una fila propia, debajo de las dos columnas, para que se lea entera.
  const leyenda = crear('div', 'leyenda');
  for (const [tipo, nombre] of LEYENDA) {
    const chip = crear('span', `chip-leyenda tok-${tipo}`, nombre);
    leyenda.append(chip);
  }

  // La lista de tokens: tipo, lexema, línea y columna.
  const derecha = crear('div', 'col col-tokens');
  const lista = crear('div', 'tokens');
  const encabezado = crear('div', 'token token-encabezado');
  ['Tipo', 'Lexema', 'Lín.', 'Col.'].forEach((t) => encabezado.append(crear('span', '', t)));
  lista.append(encabezado);
  for (const token of resultado.tokens) {
    const fila = crear('div', 'token');
    if (!esTokenVisible(token)) fila.classList.add('atenuado'); // saltos de línea y fin: apagados
    fila.append(
      crear('span', `token-tipo tok-${token.tipo}`, token.tipo),
      crear('span', 'token-lexema', token.lexema === '' ? '(vacío)' : token.lexema),
      crear('span', 'token-num', String(token.linea)),
      crear('span', 'token-num', String(token.columna))
    );
    lista.append(fila);
  }
  derecha.append(lista);
  cuerpo.append(izquierda, derecha, leyenda);
}

// Panel del Gramático: el árbol.
// Devuelve una función que dibuja el árbol cuando el panel ya está en pantalla
// (el dibujo necesita saber cuánto mide el panel para ajustarse).
function panelGramatico(cuerpo, datos) {
  const caja = crear('div', 'caja-arbol');
  const nota = crear('p', 'nota', 'Cada caja es una instrucción. Lo que está dentro de un repetir cuelga de él.');
  cuerpo.classList.add('una-col');
  cuerpo.append(caja, nota);
  return () => {
    dibujarArbol(datos.resultado.ast, caja);
    // Si el árbol es más grande que su recuadro, se avisa que hay más para ver con las barras.
    if (caja.scrollWidth > caja.clientWidth + 1 || caja.scrollHeight > caja.clientHeight + 1) {
      nota.textContent = 'Cada caja es una instrucción. El árbol es grande: usa las barras del recuadro para recorrerlo.';
    }
  };
}

// Panel del Juez: lista de revisiones aprobadas.
function panelJuez(cuerpo, datos) {
  cuerpo.classList.add('una-col');
  const lista = crear('ul', 'revisiones');
  datos.resultado.revisiones.forEach((texto, i) => {
    const item = crear('li', 'revision');
    item.style.animationDelay = `${i * 280}ms`;
    item.append(crear('span', 'visto', '✓'), crear('span', '', texto));
    lista.append(item);
  });
  cuerpo.append(lista);
}

// Colores para ligar cada línea del código con las instrucciones que salieron de ella.
const TONOS = ['#ffb454', '#7cc4ff', '#ff9ec7', '#b8e986', '#c9a8ff', '#ffe27a'];

// Panel del Traductor: el código a un lado y las instrucciones al otro.
function panelTraductor(cuerpo, datos) {
  const { codigo, resultado } = datos;
  const instrucciones = resultado.instrucciones;
  const textos = instruccionesATexto(instrucciones);

  // A cada línea de origen se le asigna un color, en el orden en que aparece.
  const tonoPorLinea = new Map();
  for (const instruccion of instrucciones) {
    if (!tonoPorLinea.has(instruccion.linea)) tonoPorLinea.set(instruccion.linea, TONOS[tonoPorLinea.size % TONOS.length]);
  }

  const izquierda = crear('div', 'col col-codigo');
  izquierda.append(crear('h3', 'col-titulo', 'Tu código Tinto'), vistaCodigo(codigo, { tonoPorLinea }));

  const derecha = crear('div', 'col col-instrucciones');
  derecha.append(crear('h3', 'col-titulo', 'Instrucciones generadas'));
  const lista = crear('div', 'instrucciones');
  instrucciones.forEach((instruccion, i) => {
    const fila = crear('div', 'instruccion con-tono');
    fila.dataset.linea = instruccion.linea;
    fila.style.setProperty('--tono', tonoPorLinea.get(instruccion.linea));
    fila.append(crear('span', 'instruccion-texto', textos[i]), crear('span', 'instruccion-origen', `← línea ${instruccion.linea}`));
    lista.append(fila);
  });
  derecha.append(lista);

  // Si hay un repetir, se explica qué pasó con él.
  if (instrucciones.some((i) => i.op === 'CONTAR')) {
    derecha.append(crear('p', 'nota nota-repetida', 'El repetir desapareció: ahora es CONTAR (guarda las vueltas) y VOLVER (salta hacia atrás).'));
  }

  // Al pasar el mouse por una instrucción (o una línea), se resalta su pareja.
  cuerpo.addEventListener('mouseover', (evento) => {
    const objetivo = evento.target.closest('[data-linea]');
    cuerpo.querySelectorAll('.resaltada').forEach((e) => e.classList.remove('resaltada'));
    if (objetivo) cuerpo.querySelectorAll(`[data-linea="${objetivo.dataset.linea}"]`).forEach((e) => e.classList.add('resaltada'));
  });
  cuerpo.addEventListener('mouseleave', () => cuerpo.querySelectorAll('.resaltada').forEach((e) => e.classList.remove('resaltada')));

  cuerpo.append(izquierda, derecha);
}

// Lo que se ve en el panel del Ejecutor se actualiza desde app.js mientras corre la animación.
// Se guarda aquí el último paso para poder redibujarlo si se cambia de panel y se vuelve.
let ejecucion = { paso: null, numero: 0, resumen: null, detenido: false };

// Panel del Ejecutor: la lista de instrucciones con la actual resaltada.
function panelEjecutor(cuerpo, datos) {
  const { resultado } = datos;
  const textos = instruccionesATexto(resultado.instrucciones);

  const izquierda = crear('div', 'col col-instrucciones');
  const lista = crear('div', 'instrucciones');
  textos.forEach((texto, i) => {
    const fila = crear('div', 'instruccion');
    fila.dataset.pc = i;
    fila.append(crear('span', 'instruccion-texto', texto));
    lista.append(fila);
  });
  izquierda.append(crear('h3', 'col-titulo', 'Instrucciones'), lista);

  // Una frase fija que aclara la diferencia entre "la lista" y "lo que se ejecuta".
  const cantidadLista = resultado.instrucciones.length;
  const ejecutadas = resumirPasos(resultado.pasos).total;
  const aclaracion =
    ejecutadas === cantidadLista
      ? `La lista tiene ${plural(cantidadLista, 'instrucción', 'instrucciones')} y ${cantidadLista === 1 ? 'se ejecuta' : 'cada una se ejecuta'} una vez.`
      : `La lista tiene ${plural(cantidadLista, 'instrucción', 'instrucciones')}; con el repetir se ejecutan ${ejecutadas}.`;

  const derecha = crear('div', 'col col-monitor');
  derecha.append(
    crear('h3', 'col-titulo', 'Ahora mismo'),
    crear('div', 'monitor-actual', '—'),
    crear('p', 'monitor-detalle', ''),
    crear('p', 'monitor-paso', ''),
    Object.assign(crear('div', 'barra-progreso'), { innerHTML: '<i></i>' }),
    crear('p', 'nota monitor-aclaracion', aclaracion)
  );
  const repetir = crear('button', 'btn pequeno secundario', '↻ Ejecutar otra vez');
  repetir.type = 'button';
  repetir.addEventListener('click', () => datos.alRepetir?.());
  derecha.append(repetir);

  cuerpo.append(izquierda, derecha);
  // Se resalta la instrucción actual cuando el panel ya está en pantalla (para poder hacer scroll).
  return () => pintarEjecucion(cuerpo, resultado.instrucciones);
}

// Dice en palabras simples qué hizo un paso del Ejecutor.
function describirPaso(paso, instrucciones) {
  if (paso.accion === 'color') return `Cambio el pincel a ${paso.color}.`;
  if (paso.accion === 'girar') return `Giro: ahora miro ${FRASE_DIRECCION[paso.direccion]}.`;
  if (paso.accion === 'mover') return `Avanzo una casilla y la pinto de ${paso.color}: estoy en (${paso.x}, ${paso.y}).`;
  if (paso.accion === 'contar') return `Empieza un repetir: anoto que son ${plural(paso.vueltas, 'vuelta', 'vueltas')}.`;
  // volver
  if (paso.salta) {
    const destino = instrucciones[paso.pc].arg;
    return `${paso.quedan === 1 ? 'Queda 1 vuelta' : `Quedan ${paso.quedan} vueltas`}: vuelvo a la instrucción ${destino}.`;
  }
  // Ya no quedan vueltas: se sale del repetir (y si era la última instrucción, el programa termina).
  return paso.pc === instrucciones.length - 1
    ? 'Ya no quedan vueltas: el repetir terminó y el programa también.'
    : 'Ya no quedan vueltas: sigo con la instrucción que viene después.';
}

// Resalta en el panel del Ejecutor la instrucción que se está ejecutando.
function pintarEjecucion(cuerpo, instrucciones) {
  const filas = cuerpo.querySelectorAll('.instruccion[data-pc]');
  if (filas.length === 0) return;
  filas.forEach((f) => f.classList.remove('actual'));
  const monitor = cuerpo.querySelector('.monitor-actual');
  const detalle = cuerpo.querySelector('.monitor-detalle');
  const textoPaso = cuerpo.querySelector('.monitor-paso');
  const progreso = cuerpo.querySelector('.barra-progreso i');

  if (ejecucion.paso === null) {
    monitor.textContent = '—';
    detalle.textContent = '';
    textoPaso.textContent = 'Esperando para ejecutar';
    progreso.style.width = '0%';
    return;
  }
  const { paso, numero, resumen } = ejecucion;
  const fila = cuerpo.querySelector(`.instruccion[data-pc="${paso.pc}"]`);
  fila.classList.add('actual');
  // Se hace scroll solo dentro de la lista (no de toda la página).
  const lista = fila.parentElement;
  if (fila.offsetTop < lista.scrollTop) lista.scrollTop = fila.offsetTop - 4;
  else if (fila.offsetTop + fila.offsetHeight > lista.scrollTop + lista.clientHeight) {
    lista.scrollTop = fila.offsetTop + fila.offsetHeight - lista.clientHeight + 4;
  }
  const i = paso.pc;
  monitor.textContent = `${i}  ${instrucciones[i].op} ${instrucciones[i].arg}`;
  detalle.textContent = ejecucion.detenido ? 'Dibujo detenido aquí. Pulsa «Ejecutar otra vez» para verlo completo.' : describirPaso(paso, instrucciones);
  textoPaso.textContent = `Instrucciones ejecutadas: ${resumen.hasta[numero - 1]} de ${resumen.total}`;
  progreso.style.width = `${(numero / resumen.hasta.length) * 100}%`;
}

// app.js llama a esto en cada paso de la animación.
//   paso: el paso actual · numero: cuál es (1, 2, 3…) · resumen: lo que devuelve resumirPasos
export function marcarEjecucion(paso, numero, resumen) {
  ejecucion = { paso, numero, resumen, detenido: false };
  const cuerpo = document.querySelector('.panel-cuerpo');
  const datosPanel = cuerpo?.dataset.panel === 'ejecutor' ? panelActual : null;
  if (datosPanel) pintarEjecucion(cuerpo, datosPanel.resultado.instrucciones);
}

// El dibujo se frenó a mitad de camino: el panel lo dice.
export function marcarEjecucionDetenida() {
  if (ejecucion.paso === null) return;
  ejecucion.detenido = true;
  const cuerpo = document.querySelector('.panel-cuerpo');
  if (cuerpo?.dataset.panel === 'ejecutor' && panelActual) pintarEjecucion(cuerpo, panelActual.resultado.instrucciones);
}

// Apaga el resaltado (al reiniciar o al compilar de nuevo).
export function limpiarEjecucion() {
  ejecucion = { paso: null, numero: 0, resumen: null, detenido: false };
  const cuerpo = document.querySelector('.panel-cuerpo');
  if (cuerpo?.dataset.panel === 'ejecutor' && panelActual) pintarEjecucion(cuerpo, panelActual.resultado.instrucciones);
}

const PANELES = [panelLector, panelGramatico, panelJuez, panelTraductor, panelEjecutor];

// ---------- "¿Qué pasó aquí?" ----------
// Plantillas que se llenan con los datos reales del resultado. No usan IA ni internet.

const NOMBRE_TIPO = {
  PALABRA_RESERVADA: 'una palabra reservada',
  DIRECCION: 'una dirección',
  COLOR: 'un color',
  NUMERO: 'un número',
  DOS_PUNTOS: 'el signo de dos puntos',
};

const FRASE_DIRECCION = { derecha: 'a la derecha', abajo: 'hacia abajo', izquierda: 'a la izquierda', arriba: 'hacia arriba' };

// Cuenta las instrucciones del árbol, cuántas son repetir y qué tan profundo llegan los ciclos.
function contarNodos(nodos, nivel = 1) {
  let total = 0;
  let repetir = 0;
  let profundidad = 0;
  for (const nodo of nodos) {
    total++;
    if (nodo.tipo === 'Repetir') {
      repetir++;
      profundidad = Math.max(profundidad, nivel);
      const dentro = contarNodos(nodo.cuerpo, nivel + 1);
      total += dentro.total;
      repetir += dentro.repetir;
      profundidad = Math.max(profundidad, dentro.profundidad);
    }
  }
  return { total, repetir, profundidad };
}

function explicarLector(datos) {
  const { resultado, codigo } = datos;
  if (resultado.error?.fase === 'lexico') {
    const marca = marcaDelError(codigo, resultado) ?? { linea: resultado.error.linea, columna: 1, largo: 1 };
    const texto = (codigo.split('\n')[marca.linea - 1] ?? '').slice(marca.columna - 1, marca.columna - 1 + marca.largo);
    return `Fui leyendo tu código letra por letra y me detuve en la línea ${marca.linea}, columna ${marca.columna}: \`${texto}\` no existe en Tinto. Por eso no le pasé nada al Gramático.`;
  }
  const visibles = resultado.tokens.filter(esTokenVisible);
  // Dos ejemplos de tipos distintos: de preferencia "repetir" y un número.
  const primero = visibles.find((t) => t.valor === 'repetir') ?? visibles.find((t) => t.tipo === 'PALABRA_RESERVADA') ?? visibles[0];
  const segundo = visibles.find((t) => t.tipo === 'NUMERO' && t !== primero) ?? visibles.find((t) => t.tipo !== primero.tipo);
  let ejemplo = `Por ejemplo, \`${primero.lexema}\` es ${NOMBRE_TIPO[primero.tipo]}`;
  if (segundo && segundo.tipo !== primero.tipo) ejemplo += ` y \`${segundo.lexema}\` es ${NOMBRE_TIPO[segundo.tipo]}`;
  return `Leí tu código y encontré ${plural(visibles.length, 'palabra', 'palabras')}. ${ejemplo}.`;
}

function explicarGramatico(datos) {
  const { resultado } = datos;
  if (resultado.error?.fase === 'sintactico') {
    return `Las palabras estaban bien escritas, pero al agruparlas en instrucciones me trabé en la línea ${resultado.error.linea}: no siguen el orden que pide Tinto. Sin un árbol completo, no puedo seguir.`;
  }
  const { total, repetir, profundidad } = contarNodos(resultado.ast.cuerpo);
  let texto = `Agrupé las palabras en un árbol: tu programa tiene ${plural(total, 'instrucción', 'instrucciones')}`;
  if (repetir === 0) texto += ' y ningún ciclo repetir.';
  else if (repetir === 1) texto += ' y 1 ciclo repetir. Lo que está dentro del repetir cuelga de él.';
  else texto += ` y ${repetir} ciclos repetir. Lo que está dentro de cada repetir cuelga de él.`;
  if (profundidad >= 2) texto += ` Hay ciclos dentro de ciclos (${profundidad} niveles).`;
  return texto;
}

function explicarJuez(datos) {
  const { resultado } = datos;
  if (resultado.error) {
    const donde = resultado.error.linea ? ` en la línea ${resultado.error.linea}` : '';
    return `Tu programa está bien escrito, pero al seguir el recorrido del robot encontré un problema${donde}: lo que pides no tiene sentido o no cabe en el tablero. Por eso nadie lo ejecuta.`;
  }
  const fin = resultado.estadoFinal;
  const n = resultado.revisiones.length;
  const hice = n === 1 ? 'Hice 1 revisión y tu programa la pasó' : `Hice ${n} revisiones y tu programa pasó todas`;
  const final = fin ? ` y termina en la casilla (${fin.x}, ${fin.y})` : '';
  return `${hice}. Simulé el recorrido: el robot no se sale del tablero de 10×10${final}.`;
}

function explicarTraductor(datos) {
  const { resultado, codigo } = datos;
  const lineas = codigo.split('\n');
  const instrucciones = resultado.instrucciones;
  let ejemplo;
  const contar = instrucciones.findIndex((i) => i.op === 'CONTAR');
  if (contar >= 0) {
    const volver = instrucciones.findIndex((i, k) => k > contar && i.op === 'VOLVER' && i.linea === instrucciones[contar].linea);
    ejemplo = `El repetir de la línea ${instrucciones[contar].linea} desapareció: ahora es \`CONTAR ${instrucciones[contar].arg}\` al inicio y \`VOLVER ${instrucciones[volver].arg}\` al final, que salta hacia atrás.`;
  } else {
    const primera = instrucciones[0];
    const original = (lineas[primera.linea - 1] ?? '').trim();
    const cuenta = `la línea ${primera.linea} (\`${original}\`) se volvió \`${primera.op} ${primera.arg}\``;
    // Con una sola instrucción no hay "por ejemplo": ella es todo el programa.
    ejemplo = instrucciones.length === 1 ? `Aquí ${cuenta}.` : `Por ejemplo, ${cuenta}.`;
  }
  // "1 instrucción simple, parecida" / "5 instrucciones simples, parecidas".
  const una = instrucciones.length === 1;
  return `Traduje tu programa a ${plural(instrucciones.length, 'instrucción simple', 'instrucciones simples')}, ${una ? 'parecida' : 'parecidas'} a las de una máquina. ${ejemplo}`;
}

function explicarEjecutor(datos) {
  const { resultado } = datos;
  const fin = resultado.estadoFinal;
  const casillas = Object.keys(resultado.casillasPintadas).length;
  const movidas = resultado.pasos.filter((p) => p.accion === 'mover').length;
  const enLista = resultado.instrucciones.length;
  const ejecutadas = resumirPasos(resultado.pasos).total;

  // Primero, qué se ejecutó: la lista, y cuántas veces corrió con el repetir.
  let inicio;
  if (ejecutadas !== enLista) {
    inicio = `Tu lista tiene ${plural(enLista, 'instrucción', 'instrucciones')}, pero el repetir ejecuta algunas varias veces: corrí ${ejecutadas} en total.`;
  } else if (enLista === 1) {
    inicio = 'Ejecuté tu única instrucción.';
  } else {
    inicio = `Ejecuté las ${enLista} instrucciones una por una.`;
  }
  // Después, qué hizo el robot.
  const se = movidas === 0 ? 'El robot no avanzó ninguna casilla' : `El robot avanzó ${plural(movidas, 'casilla', 'casillas')}`;
  const pinto = casillas === 0 ? 'no pintó ninguna' : `pintó ${casillas}`;
  return `${inicio} ${se}, ${pinto} y terminó en (${fin.x}, ${fin.y}) mirando ${FRASE_DIRECCION[fin.direccion]}.`;
}

const EXPLICACIONES = [explicarLector, explicarGramatico, explicarJuez, explicarTraductor, explicarEjecutor];

// Devuelve el texto de "¿Qué pasó aquí?" para el personaje indicado.
export function explicar(indice, datos) {
  return EXPLICACIONES[indice](datos);
}

// ---------- El panel completo ----------

// Los datos del panel que está abierto (para poder actualizarlo desde afuera).
let panelActual = null;

// Dibuja el panel del personaje "indice".
// datos = { codigo, resultado, estado ("aprobado" | "error"), alRepetir }
export function mostrarPanel(contenedor, indice, datos) {
  panelActual = datos;
  contenedor.replaceChildren();
  const personaje = PERSONAJES[indice];

  // Cabecera: dibujo, nombre, fase y botón "¿Qué pasó aquí?".
  const cabecera = crear('div', 'panel-cab');
  const titulo = crear('div', 'panel-titulo');
  titulo.append(
    crear('span', 'panel-dibujo', personaje.emoji),
    crear('h2', '', personaje.nombre),
    crear('span', 'panel-tecnico', personaje.tecnico),
    crear('span', `panel-estado ${datos.estado}`, datos.estado === 'error' ? 'Error' : 'Aprobado')
  );
  const boton = crear('button', 'btn pequeno acento', '¿Qué pasó aquí?');
  boton.type = 'button';
  boton.setAttribute('aria-expanded', 'false');
  cabecera.append(titulo, boton);

  // La burbuja con la explicación (aparece al pulsar el botón).
  const burbuja = crear('div', 'burbuja');
  burbuja.hidden = true;
  boton.addEventListener('click', () => {
    burbuja.hidden = !burbuja.hidden;
    boton.setAttribute('aria-expanded', String(!burbuja.hidden));
    if (!burbuja.hidden) {
      const texto = crear('p');
      texto.append(conCodigo(explicar(indice, datos)));
      burbuja.replaceChildren(crear('span', 'burbuja-dibujo', personaje.emoji), texto);
    }
  });

  // El cuerpo: lo que produjo la fase, o el error.
  const cuerpo = crear('div', 'panel-cuerpo');
  cuerpo.dataset.panel = personaje.id;
  let despues = null; // algunos paneles terminan de dibujarse cuando ya están en pantalla
  if (datos.estado === 'error') {
    panelError(cuerpo, datos);
  } else {
    despues = PANELES[indice](cuerpo, datos);
  }

  contenedor.append(cabecera, burbuja, cuerpo);
  if (despues) despues();
}

// Panel cuando la fase falló: explicación grande, mensaje técnico y la línea del error.
function panelError(cuerpo, datos) {
  const { resultado, codigo } = datos;
  const error = resultado.error;
  cuerpo.classList.add('con-error-panel');

  const caja = crear('div', 'error-caja');
  caja.setAttribute('role', 'alert');
  caja.append(crear('p', 'error-explicacion', error.explicacion), crear('p', 'error-mensaje', error.mensaje));

  const codigoCaja = crear('div', 'col col-codigo error-codigo');
  codigoCaja.append(
    vistaCodigo(codigo, { lineaError: error.linea, marca: marcaDelError(codigo, resultado) })
  );
  cuerpo.append(caja, codigoCaja);
}

// Mensaje cuando todavía no se ha compilado nada, o cuando no hay nada que compilar.
export function mostrarMensajePanel(contenedor, titulo, texto, clase = '') {
  panelActual = null;
  contenedor.replaceChildren();
  const caja = crear('div', `panel-vacio ${clase}`);
  caja.append(crear('p', 'panel-vacio-titulo', titulo), crear('p', 'panel-vacio-texto', texto));
  contenedor.append(caja);
}
