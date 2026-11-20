# Plan de pruebas de Tinto

Tinto es un lenguaje en español para mover un robot virtual sobre una cuadrícula. Este plan cubre el compilador (léxico, sintáctico, semántico, generación de código y ejecución), la interfaz, la traducción con IA y el ensayo de la demo.

## Supuestos

Estos supuestos deciden los resultados esperados. Si alguno cambia, hay que revisar los casos.

- El tablero es de 10×10 y el robot inicia en la esquina superior izquierda, mirando a la derecha, con color negro.
- Va una instrucción por línea, y mayúsculas y minúsculas dan igual.
- Solo se aceptan números enteros positivos, y `repetir` admite máximo 100 veces.
- Una palabra que no es del lenguaje (`saltar`, `morado`) es error léxico.
- Si hay un error en cualquier fase, el robot no se mueve.

## Léxico (El Lector)

- **TC-L01:** un programa válido genera los tokens correctos, con tipo, lexema, línea y columna.
- **TC-L02:** `avanzar @3` da error léxico por símbolo inválido, con línea y columna.
- **TC-L03:** `saltar 3` y `pintar morado` dan error léxico por palabra desconocida.
- **TC-L04:** `AVANZAR 3` y `Avanzar 3` se aceptan.
- **TC-L05:** los espacios de sobra y las líneas vacías se ignoran.
- **TC-L06:** `avanzar3`, `avanzar 2.5` y `avanzar -1` dan error léxico.

## Sintáctico (El Gramático)

- **TC-S01:** cada instrucción válida, sola, genera su nodo en el árbol.
- **TC-S02:** `avanzar` sin número da error: "falta el número".
- **TC-S03:** `avanzar girar` y `girar 3` dan error por token inesperado.
- **TC-S04:** `repetir` sin `fin` da error.
- **TC-S05:** `fin` sin `repetir` da error.
- **TC-S06:** `repetir 4:` y `repetir 4 veces` (sin `veces` o sin `:`) dan error.
- **TC-S07:** un `repetir` dentro de otro es válido y el árbol queda anidado.
- **TC-S08:** `avanzar 3 girar derecha` en una misma línea da error.
- **TC-S09:** un programa vacío no da error y muestra el mensaje "no hay nada que compilar".

## Semántico (El Juez)

- **TC-M01:** `avanzar 99` da error porque se sale del tablero.
- **TC-M02:** `avanzar 9` (llega justo al borde) es válido.
- **TC-M03:** `avanzar 10` (una casilla de más) da error.
- **TC-M04:** `repetir 0 veces` y `avanzar 0` dan error: "no tiene sentido".
- **TC-M05:** si el robot se sale en la tercera vuelta de un `repetir`, el error indica en qué vuelta.
- **TC-M06:** `repetir 101 veces` da error por superar el límite.

## Generación de código (El Traductor)

- **TC-G01:** un programa sin ciclos genera una instrucción por línea: `COLOR`, `MOVER` y `GIRAR`.
- **TC-G02:** un `repetir` genera `CONTAR` al inicio y `VOLVER` al final, y el `VOLVER` apunta a la primera instrucción del bloque.
- **TC-G03:** un `repetir` anidado genera dos pares `CONTAR` y `VOLVER` con los saltos correctos.
- **TC-G04:** si una fase anterior falla, no se genera código.

## Ejecución (El Ejecutor)

- **TC-E01:** el cuadrado rojo de lado 3 pinta 12 casillas rojas y el robot termina donde empezó.
- **TC-E02:** `girar derecha` 4 veces lo deja con la orientación inicial.
- **TC-E03:** sin `pintar`, el trazo sale negro.
- **TC-E04:** si se cambia de color a mitad del programa, cada tramo queda con su color.
- **TC-E05:** un `repetir` anidado da el número correcto de movimientos.

## Interfaz y personajes

- **TC-U01:** "siguiente fase" avanza un solo personaje a la vez.
- **TC-U02:** con un error, el personaje correcto se pone en rojo, los siguientes no se activan y el robot no se mueve.
- **TC-U03:** cada personaje muestra su nombre técnico debajo.
- **TC-U04:** "¿Qué pasó aquí?" explica la fase con el código actual, no con un ejemplo fijo.
- **TC-U05:** al editar el código y recompilar, el resultado se actualiza.
- **TC-U06:** "reiniciar" limpia el tablero y devuelve el robot al inicio.

## IA

- **TC-I01:** "dibuja un cuadrado rojo" genera código Tinto que compila y dibuja el cuadrado.
- **TC-I02:** una petición imposible ("hazme una pizza") recibe una respuesta amable, sin código basura.
- **TC-I03:** sin internet, aparece un mensaje claro y los ejemplos guardados funcionan.
- **TC-I04:** si la IA devuelve código inválido, el compilador lo atrapa y muestra la fase.
- **TC-I05:** mientras la IA responde hay un indicador de carga, y la respuesta tarda menos de 15 segundos.

## Ensayo de la demo

- **TC-D01:** el recorrido completo de los 5 ejemplos funciona sin internet.
- **TC-D02:** en la pantalla del portátil, todo cabe sin hacer scroll y se lee a un metro.
- **TC-D03:** una persona que no sabe programar completa un reto sin ayuda.

## Cómo se ejecutan

- **Automatizados:** los grupos léxico, sintáctico, semántico, de generación y de ejecución corren con un solo comando (`npm test`).
- **Manuales:** los grupos de interfaz, IA y ensayo de la demo.
