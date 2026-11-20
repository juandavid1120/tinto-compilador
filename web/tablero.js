// tablero.js
// La cuadrícula de 10×10 y el robot. También recorre la lista de pasos
// que produjo El Ejecutor para animar el dibujo, un paso a la vez.
//
// Convenciones (las mismas del compilador):
//   - El robot empieza en (0, 0), mirando a la derecha, con color negro.
//   - x crece hacia la derecha e y crece hacia abajo.

const TAMANO = 10;

// Cuántos grados hay que girar el dibujo del robot para cada dirección.
// El dibujo original mira a la derecha.
const ANGULOS = { derecha: 0, abajo: 90, izquierda: 180, arriba: 270 };

// Cómo se dice cada dirección en una frase.
const FRASE_DIRECCION = {
  derecha: 'a la derecha',
  abajo: 'hacia abajo',
  izquierda: 'a la izquierda',
  arriba: 'hacia arriba',
};

// Dibujo del robot (SVG propio). El triángulo es la "nariz": indica hacia dónde mira.
// El círculo del centro toma el color del pincel actual.
const DIBUJO_ROBOT = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <polygon points="74,24 99,50 74,76" class="robot-nariz"/>
  <rect x="8" y="12" width="68" height="76" rx="20" class="robot-cuerpo"/>
  <circle cx="42" cy="50" r="17" class="robot-pincel"/>
</svg>`;

// Espera una cantidad de milisegundos.
function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// Crea el tablero dentro de "contenedor". "lineaEstado" es el párrafo
// donde se escribe dónde está el robot.
export function crearTablero(contenedor, lineaEstado) {
  contenedor.replaceChildren();

  // La rejilla: 100 celdas, de izquierda a derecha y de arriba hacia abajo.
  const rejilla = document.createElement('div');
  rejilla.className = 'rejilla';
  const celdas = [];
  for (let y = 0; y < TAMANO; y++) {
    for (let x = 0; x < TAMANO; x++) {
      const celda = document.createElement('div');
      celda.className = 'celda';
      if (x === 0 && y === 0) celda.classList.add('inicio'); // marca la casilla de salida
      rejilla.append(celda);
      celdas.push(celda);
    }
  }

  // El robot flota encima de la rejilla. "robot" se mueve; su dibujo interno gira.
  const robot = document.createElement('div');
  robot.className = 'robot';
  robot.innerHTML = DIBUJO_ROBOT;
  const dibujo = robot.querySelector('svg');

  contenedor.append(rejilla, robot);

  // Estado actual del robot y del dibujo.
  const estado = { x: 0, y: 0, direccion: 'derecha', color: 'negro' };
  let angulo = 0; // grados acumulados, para que el robot siempre gire por el lado corto
  let ficha = 0; // cada animación tiene un número; si cambia, la animación se cancela
  let animando = false; // true mientras el robot está dibujando

  // Devuelve la celda que está en (x, y).
  function celdaEn(x, y) {
    return celdas[y * TAMANO + x];
  }

  // Coloca el robot en su casilla y le pone el color del pincel.
  function dibujarRobot() {
    robot.style.left = `${estado.x * 10}%`;
    robot.style.top = `${estado.y * 10}%`;
    robot.style.setProperty('--pincel', `var(--c-${estado.color})`);
  }

  // Gira el dibujo hasta la dirección indicada, por el camino más corto.
  function girarDibujo(direccion) {
    const destino = ANGULOS[direccion];
    const diferencia = ((destino - (angulo % 360) + 540) % 360) - 180;
    angulo += diferencia;
    dibujo.style.transform = `rotate(${angulo}deg)`;
  }

  // Escribe debajo del tablero dónde está el robot.
  function escribirEstado() {
    lineaEstado.replaceChildren();
    const texto = document.createElement('span');
    texto.textContent = `Robot en (${estado.x}, ${estado.y}) · mira ${FRASE_DIRECCION[estado.direccion]} · pincel `;
    const punto = document.createElement('i');
    punto.className = 'punto-color';
    punto.style.background = `var(--c-${estado.color})`;
    const nombre = document.createElement('b');
    nombre.textContent = estado.color;
    lineaEstado.append(texto, punto, nombre);
  }

  // Aplica un solo paso de los que produjo El Ejecutor.
  function aplicarPaso(paso) {
    // "contar" y "volver" son del repetir: le sirven al panel de El Ejecutor, no al robot.
    if (paso.accion === 'contar' || paso.accion === 'volver') return;
    if (paso.accion === 'mover') {
      estado.x = paso.x;
      estado.y = paso.y;
      estado.color = paso.color;
      // Pinta la casilla a la que llegó. Se quita y se pone la clase para repetir el efecto.
      const celda = celdaEn(paso.x, paso.y);
      celda.className = 'celda';
      void celda.offsetWidth; // fuerza al navegador a "olvidar" la clase anterior
      celda.classList.add('pintada', `c-${paso.color}`);
    } else if (paso.accion === 'girar') {
      estado.direccion = paso.direccion;
      girarDibujo(paso.direccion);
    } else if (paso.accion === 'color') {
      estado.color = paso.color;
    }
    dibujarRobot();
    escribirEstado();
  }

  // Limpia el tablero, devuelve el robot al inicio y cancela cualquier animación.
  function reiniciar() {
    ficha++; // invalida la animación que esté corriendo
    animando = false;
    celdas.forEach((celda, i) => {
      celda.className = 'celda';
      if (i === 0) celda.classList.add('inicio');
    });
    estado.x = 0;
    estado.y = 0;
    estado.direccion = 'derecha';
    estado.color = 'negro';
    // Se quita la transición un instante para que el robot no "viaje" de vuelta.
    robot.classList.add('sin-transicion');
    angulo = 0;
    dibujo.style.transform = 'rotate(0deg)';
    dibujarRobot();
    escribirEstado();
    void robot.offsetWidth;
    robot.classList.remove('sin-transicion');
  }

  // Frena el dibujo donde va, sin borrar lo que ya pintó. Devuelve true si estaba dibujando.
  function detener() {
    const estabaDibujando = animando;
    ficha++; // la animación en curso se da cuenta y termina
    animando = false;
    return estabaDibujando;
  }

  // Recorre los pasos uno por uno. Devuelve una promesa:
  //   true  si la animación terminó,
  //   false si la cancelaron (Reiniciar o un nuevo Compilar).
  // opciones.pausa(): milisegundos de espera entre pasos (se pregunta en cada paso,
  //                   así el control de velocidad funciona en vivo).
  // opciones.alPaso(paso, indice): se llama justo después de aplicar cada paso.
  async function animar(pasos, opciones = {}) {
    const pausa = opciones.pausa ?? (() => 200);
    const alPaso = opciones.alPaso ?? (() => {});
    const miFicha = ++ficha;
    animando = true;

    for (let i = 0; i < pasos.length; i++) {
      if (miFicha !== ficha) return false;
      const espera = pausa();
      robot.style.setProperty('--duracion', `${Math.min(espera * 0.9, 240)}ms`);
      aplicarPaso(pasos[i]);
      alPaso(pasos[i], i);
      await esperar(espera);
    }
    if (miFicha !== ficha) return false;
    animando = false;
    return true;
  }

  reiniciar();
  return { reiniciar, animar, detener, aplicarPaso, dibujando: () => animando, estado: () => ({ ...estado }) };
}
