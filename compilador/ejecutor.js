// ejecutor.js (El Ejecutor)
// Fase 5 del compilador: una máquina virtual pequeña que ejecuta las instrucciones.
// Lleva un apuntador a la instrucción actual (pc) y una pila de contadores.
// Produce una lista plana de pasos que la interfaz anima.
// Cada paso dice qué hizo (accion) y en qué instrucción estaba (pc):
//   { accion: 'color',  color, pc }              cambió el pincel
//   { accion: 'girar',  direccion, pc }          giró el robot
//   { accion: 'mover',  x, y, color, pc }        avanzó UNA casilla (y la pintó)
//   { accion: 'contar', vueltas, pc }            empezó un repetir (anotó las vueltas)
//   { accion: 'volver', quedan, salta, pc }      terminó una vuelta: quedan N y salta (true) o sigue (false)
// El tablero solo dibuja color, girar y mover; contar y volver son para que
// el panel de El Ejecutor pueda mostrar cómo funciona el repetir.

// Tamaño del tablero: 10×10.
const TAMANO_TABLERO = 10;

// Las cuatro orientaciones, en el orden en que se llega girando a la derecha.
const ORIENTACIONES = ['derecha', 'abajo', 'izquierda', 'arriba'];

// Cuánto cambia (x, y) por cada casilla que se avanza. y crece hacia abajo.
const MOVIMIENTO = {
  derecha: { dx: 1, dy: 0 },
  abajo: { dx: 0, dy: 1 },
  izquierda: { dx: -1, dy: 0 },
  arriba: { dx: 0, dy: -1 },
};

// Función principal: ejecuta las instrucciones y devuelve { pasos, estadoFinal, casillasPintadas }.
export function ejecutar(instrucciones) {
  // Estado del robot: empieza en (0, 0), mirando a la derecha, con color negro.
  const robot = { x: 0, y: 0, direccion: 'derecha', color: 'negro' };

  const pasos = [];
  const casillasPintadas = {}; // clave "x,y" -> color final de esa casilla
  const pila = []; // pila de contadores de los "repetir" abiertos
  let pc = 0; // índice de la instrucción actual

  while (pc < instrucciones.length) {
    const { op, arg } = instrucciones[pc];

    if (op === 'COLOR') {
      robot.color = arg;
      pasos.push({ accion: 'color', color: robot.color, pc });
      pc++;
    } else if (op === 'GIRAR') {
      // Derecha suma 1 en la lista de orientaciones; izquierda resta 1 (o sea suma 3).
      const posicion = ORIENTACIONES.indexOf(robot.direccion);
      const salto = arg === 'DER' ? 1 : 3;
      robot.direccion = ORIENTACIONES[(posicion + salto) % 4];
      pasos.push({ accion: 'girar', direccion: robot.direccion, pc });
      pc++;
    } else if (op === 'MOVER') {
      const mov = MOVIMIENTO[robot.direccion];
      // Avanza casilla por casilla, y cada casilla es un paso.
      for (let i = 0; i < arg; i++) {
        const nuevaX = robot.x + mov.dx;
        const nuevaY = robot.y + mov.dy;
        if (nuevaX < 0 || nuevaX >= TAMANO_TABLERO || nuevaY < 0 || nuevaY >= TAMANO_TABLERO) {
          throw new Error(
            `El robot se salió del tablero en la instrucción ${pc} (intentó ir a ${nuevaX},${nuevaY})`
          );
        }
        robot.x = nuevaX;
        robot.y = nuevaY;
        casillasPintadas[`${robot.x},${robot.y}`] = robot.color;
        pasos.push({ accion: 'mover', x: robot.x, y: robot.y, color: robot.color, pc });
      }
      pc++;
    } else if (op === 'CONTAR') {
      // Empieza un "repetir": apila cuántas vueltas faltan.
      pila.push(arg);
      pasos.push({ accion: 'contar', vueltas: arg, pc });
      pc++;
    } else if (op === 'VOLVER') {
      // Termina una vuelta: resta 1 al contador del tope.
      pila[pila.length - 1]--;
      const quedan = pila[pila.length - 1];
      if (quedan > 0) {
        pasos.push({ accion: 'volver', quedan, salta: true, pc });
        pc = arg; // todavía quedan vueltas: salta al inicio del cuerpo
      } else {
        pasos.push({ accion: 'volver', quedan: 0, salta: false, pc });
        pila.pop(); // ya no quedan vueltas: quita el contador y sigue
        pc++;
      }
    } else {
      throw new Error(`Instrucción desconocida "${op}" en la posición ${pc}`);
    }
  }

  return {
    pasos,
    estadoFinal: { x: robot.x, y: robot.y, direccion: robot.direccion, color: robot.color },
    casillasPintadas,
  };
}
