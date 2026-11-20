// generador.js (El Traductor)
// Fase 4 del compilador: convierte el AST aprobado en una lista de instrucciones simples,
// parecidas a las de una máquina. Cada instrucción tiene la forma { op, arg, linea }.

// Agrega al arreglo "instrucciones" las instrucciones de una lista de nodos del AST.
function generarNodos(nodos, instrucciones) {
  for (const nodo of nodos) {
    if (nodo.tipo === 'Pintar') {
      instrucciones.push({ op: 'COLOR', arg: nodo.color, linea: nodo.linea });
    } else if (nodo.tipo === 'Avanzar') {
      instrucciones.push({ op: 'MOVER', arg: nodo.pasos, linea: nodo.linea });
    } else if (nodo.tipo === 'Girar') {
      const arg = nodo.direccion === 'derecha' ? 'DER' : 'IZQ';
      instrucciones.push({ op: 'GIRAR', arg, linea: nodo.linea });
    } else if (nodo.tipo === 'Repetir') {
      // El "repetir" desaparece: se vuelve un contador (CONTAR) y un salto hacia atrás (VOLVER).
      instrucciones.push({ op: 'CONTAR', arg: nodo.veces, linea: nodo.linea });
      // El VOLVER debe saltar a la primera instrucción del cuerpo,
      // que es la que va justo después del CONTAR.
      const inicioDelCuerpo = instrucciones.length;
      generarNodos(nodo.cuerpo, instrucciones);
      instrucciones.push({ op: 'VOLVER', arg: inicioDelCuerpo, linea: nodo.linea });
    }
  }
}

// Función principal: recibe el AST y devuelve la lista de instrucciones.
export function generarCodigo(ast) {
  const instrucciones = [];
  generarNodos(ast.cuerpo, instrucciones);
  return instrucciones;
}

// Convierte las instrucciones en texto para mostrarlas, por ejemplo "2  MOVER 3".
// Es el índice, dos espacios, la operación y el argumento.
export function instruccionesATexto(instrucciones) {
  return instrucciones.map((instruccion, indice) => `${indice}  ${instruccion.op} ${instruccion.arg}`);
}
