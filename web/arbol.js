// arbol.js
// Dibuja el árbol sintáctico (el AST que armó El Gramático) como un SVG.
//
// El árbol se dibuja de izquierda a derecha: la raíz ("Programa") a la izquierda y
// sus instrucciones a la derecha. Lo que está dentro de un "repetir" cuelga de él,
// así que los ciclos anidados se ven como ramas dentro de ramas.
// Los nodos aparecen uno a uno (primero el padre, luego sus hijos).

const SVG_NS = 'http://www.w3.org/2000/svg';

// Medidas del dibujo, en píxeles.
const ALTO_NODO = 44;
const SEPARACION_FILAS = 10;
const SEPARACION_COLUMNAS = 40;
const MARGEN = 8;
// El árbol se achica para caber, pero nunca por debajo de esta escala: con menos, la letra
// (16 px de título) pasaría a ser demasiado pequeña para leerse en una proyección.
const ESCALA_MINIMA = 0.7;
const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Crea un elemento SVG con sus atributos.
function svg(etiqueta, atributos = {}) {
  const elemento = document.createElementNS(SVG_NS, etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    elemento.setAttribute(nombre, valor);
  }
  return elemento;
}

// Mide cuántos píxeles ocupa un texto, para que cada caja le quede del tamaño justo.
const lienzo = document.createElement('canvas').getContext('2d');
function medirTexto(texto, tamano, peso) {
  lienzo.font = `${peso} ${tamano}px ${FUENTE}`;
  return lienzo.measureText(texto).width;
}

// Convierte un nodo del AST en un nodo para dibujar:
//   { clase, titulo, detalle, color, hijos }
function aNodoDibujable(nodo) {
  if (nodo.tipo === 'Programa') {
    const cantidad = nodo.cuerpo.length;
    return {
      clase: 'programa',
      titulo: 'Programa',
      detalle: cantidad === 1 ? '1 instrucción' : `${cantidad} instrucciones`,
      hijos: nodo.cuerpo.map(aNodoDibujable),
    };
  }
  if (nodo.tipo === 'Repetir') {
    return {
      clase: 'repetir',
      titulo: `Repetir ${nodo.veces} ${nodo.veces === 1 ? 'vez' : 'veces'}`,
      detalle: `línea ${nodo.linea}`,
      hijos: nodo.cuerpo.map(aNodoDibujable),
    };
  }
  if (nodo.tipo === 'Avanzar') {
    return { clase: 'avanzar', titulo: `Avanzar ${nodo.pasos}`, detalle: `línea ${nodo.linea}`, hijos: [] };
  }
  if (nodo.tipo === 'Girar') {
    return { clase: 'girar', titulo: `Girar ${nodo.direccion}`, detalle: `línea ${nodo.linea}`, hijos: [] };
  }
  // Pintar
  return {
    clase: 'pintar',
    titulo: `Pintar ${nodo.color}`,
    detalle: `línea ${nodo.linea}`,
    color: nodo.color,
    hijos: [],
  };
}

// Reparte las posiciones:
//   - la columna depende de la profundidad (qué tan adentro está el nodo),
//   - la fila: cada hoja (nodo sin hijos) tiene su propia fila y cada padre
//     queda centrado entre sus hijos.
function colocar(raiz) {
  let siguienteFila = 0;
  const todos = []; // en orden: padre antes que hijos

  function visitar(nodo, profundidad, padre) {
    nodo.profundidad = profundidad;
    nodo.padre = padre;
    todos.push(nodo);
    if (nodo.hijos.length === 0) {
      nodo.fila = siguienteFila++;
    } else {
      nodo.hijos.forEach((hijo) => visitar(hijo, profundidad + 1, nodo));
      nodo.fila = (nodo.hijos[0].fila + nodo.hijos[nodo.hijos.length - 1].fila) / 2;
    }
  }
  visitar(raiz, 0, null);

  // Ancho de cada caja según su texto, y ancho de cada columna = la caja más ancha de ese nivel.
  const anchoColumna = [];
  for (const nodo of todos) {
    const ancho = Math.max(medirTexto(nodo.titulo, 16, 700), medirTexto(nodo.detalle, 12, 500)) + (nodo.color ? 50 : 30);
    nodo.ancho = Math.ceil(ancho);
    anchoColumna[nodo.profundidad] = Math.max(anchoColumna[nodo.profundidad] ?? 0, nodo.ancho);
  }
  const inicioColumna = [];
  let x = MARGEN;
  anchoColumna.forEach((ancho, nivel) => {
    inicioColumna[nivel] = x;
    x += ancho + SEPARACION_COLUMNAS;
  });
  for (const nodo of todos) {
    nodo.x = inicioColumna[nodo.profundidad];
    nodo.y = MARGEN + nodo.fila * (ALTO_NODO + SEPARACION_FILAS);
  }

  return {
    nodos: todos,
    ancho: x - SEPARACION_COLUMNAS + MARGEN,
    alto: MARGEN * 2 + siguienteFila * (ALTO_NODO + SEPARACION_FILAS) - SEPARACION_FILAS,
  };
}

// Dibuja el árbol del AST dentro de "contenedor" (un elemento que ya está en la página).
export function dibujarArbol(ast, contenedor) {
  const raiz = aNodoDibujable(ast);
  const { nodos, ancho, alto } = colocar(raiz);

  // El árbol se achica para caber en el recuadro (hasta ESCALA_MINIMA); si aun así no cabe,
  // el recuadro hace scroll (y se ve la barra), empezando por la raíz.
  // Se mide el recuadro sin contar las barras de scroll, para que al aparecer una no cambie la cuenta.
  function calcularEscala() {
    const estilo = getComputedStyle(contenedor);
    const relleno = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight);
    const dispAncho = (contenedor.offsetWidth || ancho) - relleno - 14;
    const dispAlto = (contenedor.offsetHeight || alto) - relleno - 14;
    return Math.max(ESCALA_MINIMA, Math.min(1, dispAncho / ancho, dispAlto / alto));
  }
  let escala = calcularEscala();

  const lienzoSvg = svg('svg', {
    class: 'arbol',
    viewBox: `0 0 ${ancho} ${alto}`,
    width: Math.round(ancho * escala),
    height: Math.round(alto * escala),
    role: 'img',
    'aria-label': 'Árbol sintáctico del programa',
  });

  // Cada nodo tarda un poquito más que el anterior en aparecer.
  const pausa = Math.min(240, 2600 / nodos.length);

  nodos.forEach((nodo, indice) => {
    const retraso = `${Math.round(indice * pausa)}ms`;

    // La rama que lo une con su padre (una curva suave).
    if (nodo.padre) {
      const desdeX = nodo.padre.x + nodo.padre.ancho;
      const desdeY = nodo.padre.y + ALTO_NODO / 2;
      const hastaX = nodo.x;
      const hastaY = nodo.y + ALTO_NODO / 2;
      const medio = (desdeX + hastaX) / 2;
      const rama = svg('path', {
        class: 'arbol-rama',
        d: `M${desdeX} ${desdeY} C${medio} ${desdeY} ${medio} ${hastaY} ${hastaX} ${hastaY}`,
      });
      rama.style.animationDelay = retraso;
      lienzoSvg.append(rama);
    }

    // La caja del nodo con su título y su detalle.
    const grupo = svg('g', { class: `arbol-nodo ${nodo.clase}`, transform: `translate(${nodo.x} ${nodo.y})` });
    const aparicion = svg('g', { class: 'arbol-aparece' });
    aparicion.style.animationDelay = retraso;
    aparicion.append(svg('rect', { width: nodo.ancho, height: ALTO_NODO, rx: 12 }));

    const margenTexto = nodo.color ? 36 : 14;
    const titulo = svg('text', { x: margenTexto, y: 20, class: 'arbol-titulo' });
    titulo.textContent = nodo.titulo;
    const detalle = svg('text', { x: margenTexto, y: 36, class: 'arbol-detalle' });
    detalle.textContent = nodo.detalle;
    aparicion.append(titulo, detalle);

    // En "Pintar" se dibuja un puntito con el color elegido.
    if (nodo.color) {
      aparicion.append(svg('circle', { cx: 20, cy: ALTO_NODO / 2, r: 8, class: 'arbol-punto', style: `fill: var(--c-${nodo.color})` }));
    }

    grupo.append(aparicion);
    lienzoSvg.append(grupo);
  });

  contenedor.append(lienzoSvg);

  // Si el recuadro cambia de tamaño (por ejemplo, al abrir la burbuja de "¿Qué pasó aquí?"), el árbol se reajusta.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (!lienzoSvg.isConnected) return;
      escala = calcularEscala();
      lienzoSvg.setAttribute('width', Math.round(ancho * escala));
      lienzoSvg.setAttribute('height', Math.round(alto * escala));
    }).observe(contenedor);
  }

  // La raíz queda centrada a lo alto del árbol, así que en un árbol muy alto hay que bajar el scroll
  // hasta ella; de lo contrario se vería primero un pedazo cualquiera del medio hacia arriba.
  contenedor.scrollLeft = 0;
  const centroRaiz = (raiz.y + ALTO_NODO / 2) * escala;
  contenedor.scrollTop = Math.max(0, centroRaiz - contenedor.clientHeight / 2);
  return lienzoSvg;
}
