# Plan de construcción de Tinto

Proyecto de aula para la Semana de Ingeniería del ITM. Presentación: jueves 12 de noviembre de 2026. Una sola persona.

## 1. Qué se va a mostrar

Una página web donde el visitante escribe en español ("dibuja un cuadrado rojo") y ocurre esto:

1. Una IA traduce la frase a **Tinto**, el lenguaje inventado para el proyecto.
2. El compilador procesa ese código y muestra cada fase con un personaje.
3. Un robot virtual ejecuta el programa y dibuja el resultado en una cuadrícula.

Si el código tiene un error (porque la IA se equivocó o porque el visitante lo dañó a propósito), el personaje que lo detecta se pone en rojo y explica el error en palabras simples.

**Mensaje para el público:** un compilador es una cadena de revisores, y cada uno atrapa un tipo distinto de error.

## 2. Alcance

**Entra:**

- El lenguaje Tinto con 4 instrucciones.
- El compilador con 5 fases: léxico, sintáctico, semántico, generación de código y ejecución.
- La interfaz con chat, editor de código, personajes y tablero.
- La traducción de español a Tinto con IA.
- Ejemplos guardados para funcionar sin internet.
- Tarjetas de retos para el público.

**No entra:**

- Variables, condicionales y funciones.
- Optimizador.
- Robot físico.
- Publicación en internet: corre solo en el Mac de la presentación.

## 3. El lenguaje Tinto

**Por qué se llama así:** Java lleva ese nombre por el café. Este lenguaje es colombiano, así que se llama como el café de acá.

### 3.1 Instrucciones

- `avanzar N`: mueve el robot N casillas en la dirección en la que mira, pintando las casillas por las que pasa.
- `girar derecha` o `girar izquierda`: gira 90 grados sin moverse.
- `pintar COLOR`: cambia el color del trazo. Colores: `rojo`, `azul`, `verde`, `amarillo`, `negro`.
- `repetir N veces:` ... `fin`: repite el bloque N veces. Se puede anidar.

### 3.2 Reglas

- El tablero es de 10×10.
- El robot inicia en la esquina superior izquierda, mirando a la derecha, con color negro.
- Va una instrucción por línea.
- Mayúsculas y minúsculas dan igual.
- Solo hay números enteros positivos.
- `repetir` admite entre 1 y 100 veces.
- La casilla inicial no se pinta; se pintan las casillas a las que el robot llega.

### 3.3 Tokens

- `PALABRA_RESERVADA`: `avanzar`, `girar`, `pintar`, `repetir`, `veces`, `fin`
- `DIRECCION`: `derecha`, `izquierda`
- `COLOR`: `rojo`, `azul`, `verde`, `amarillo`, `negro`
- `NUMERO`: uno o más dígitos
- `DOS_PUNTOS`: `:`
- `NUEVA_LINEA`: salto de línea
- `FIN_ARCHIVO`: marca el final del código

Cada token guarda cuatro datos: tipo, lexema (el texto tal cual), línea y columna.

### 3.4 Gramática

```
programa    ::= { linea }
linea       ::= [ instruccion ] NUEVA_LINEA
instruccion ::= avanzar | girar | pintar | repetir
avanzar     ::= "avanzar" NUMERO
girar       ::= "girar" DIRECCION
pintar      ::= "pintar" COLOR
repetir     ::= "repetir" NUMERO "veces" ":" NUEVA_LINEA { linea } "fin"
```

### 3.5 Programa de ejemplo

```
pintar rojo
repetir 4 veces:
  avanzar 3
  girar derecha
fin
```

## 4. Diseño del compilador

Todo el compilador es JavaScript sin librerías, para que el código se pueda mostrar y explicar. Cada fase es un archivo con una sola función.

### 4.1 Léxico: `lexer.js` (El Lector)

- **Entrada:** el código como texto.
- **Salida:** la lista de tokens, o un error léxico.
- **Cómo funciona:** recorre el texto carácter por carácter.
  - Si ve un espacio, lo salta.
  - Si ve un salto de línea, emite `NUEVA_LINEA`.
  - Si ve un dígito, lee todos los dígitos seguidos y emite `NUMERO`.
  - Si ve una letra, lee letras y dígitos seguidos, pasa la palabra a minúsculas y la busca en las listas de palabras reservadas, direcciones y colores. Si no está en ninguna, es error léxico: "palabra desconocida".
  - Si ve `:`, emite `DOS_PUNTOS`.
  - Cualquier otro carácter es error léxico: "símbolo inválido".
- **Casos que resuelve este diseño:** `avanzar3` se lee como una sola palabra desconocida; en `2.5` falla el punto; en `-1` falla el guion.

### 4.2 Sintáctico: `parser.js` (El Gramático)

- **Entrada:** la lista de tokens.
- **Salida:** el árbol de sintaxis (AST), o un error sintáctico.
- **Técnica:** descenso recursivo. Hay una función por cada regla de la gramática (`programa`, `instruccion`, `avanzar`, `girar`, `pintar`, `repetir`).
- **Forma de los nodos:**
  - `{ tipo: "Programa", cuerpo: [...] }`
  - `{ tipo: "Avanzar", pasos: 3, linea: 2 }`
  - `{ tipo: "Girar", direccion: "derecha", linea: 3 }`
  - `{ tipo: "Pintar", color: "rojo", linea: 1 }`
  - `{ tipo: "Repetir", veces: 4, cuerpo: [...], linea: 2 }`
- **Errores:** cada uno dice qué esperaba y qué encontró, con línea y columna. Ejemplo: "Línea 2: después de `avanzar` esperaba un número y encontré `girar`".

### 4.3 Semántico: `semantico.js` (El Juez)

- **Entrada:** el AST.
- **Salida:** la lista de revisiones aprobadas, o un error semántico.
- **Qué revisa:**
  - `avanzar 0` y `repetir 0 veces` no tienen sentido.
  - `repetir` con más de 100 veces supera el límite.
  - El robot no se puede salir del tablero. Para saberlo, el Juez simula el recorrido completo sin dibujar, llevando posición y dirección.
- **Detalle para explicar al profesor:** en un compilador normal, salirse del tablero sería un error de ejecución. Aquí se puede revisar antes de ejecutar porque el programa no recibe datos de entrada, así que todo el recorrido se conoce de antemano.
- **Errores dentro de un `repetir`:** indican en qué vuelta ocurre. Ejemplo: "Línea 3: en la vuelta 3 del `repetir`, el robot se sale del tablero".

### 4.4 Generación de código: `generador.js` (El Traductor)

- **Entrada:** el AST ya aprobado.
- **Salida:** una lista numerada de instrucciones simples, parecidas a las de una máquina.
- **Instrucciones que genera:**
  - `COLOR rojo`: cambia el color.
  - `MOVER 3`: avanza 3 casillas.
  - `GIRAR DER` o `GIRAR IZQ`: gira.
  - `CONTAR 4`: guarda un contador de vueltas.
  - `VOLVER 2`: resta 1 al contador y, si quedan vueltas, salta a la instrucción 2.
- **Ejemplo:** el cuadrado rojo queda así:

```
0  COLOR rojo
1  CONTAR 4
2  MOVER 3
3  GIRAR DER
4  VOLVER 2
```

- **Por qué importa:** esta fase es la que convierte el proyecto en un compilador de verdad. El `repetir` desaparece y se vuelve un contador con un salto, que es lo que hace un procesador real con los ciclos.

### 4.5 Ejecución: `ejecutor.js` (El Ejecutor)

- **Entrada:** las instrucciones generadas.
- **Cómo funciona:** es una máquina virtual pequeña. Lleva un apuntador a la instrucción actual y una pila de contadores, y ejecuta una instrucción a la vez.
- **Salida:** una lista plana de pasos para animar.
- **Forma de los pasos:**
  - `{ accion: "mover", x: 1, y: 0, color: "rojo" }` (un paso por casilla)
  - `{ accion: "girar", direccion: "abajo" }`
  - `{ accion: "color", color: "rojo" }`
- La interfaz recorre esa lista con una pausa entre pasos para animar el robot.

### 4.6 Unión de las fases: `compilar.js`

Una función `compilar(codigo)` que llama a las cinco fases en orden y devuelve un solo objeto:

```
{
  tokens: [...],          // siempre que el léxico pase
  ast: {...},             // siempre que el sintáctico pase
  revisiones: [...],      // siempre que el semántico pase
  instrucciones: [...],   // el código generado
  pasos: [...],           // solo si todo pasó
  error: null | { fase, mensaje, explicacion, linea, columna }
}
```

Si una fase falla, las siguientes no corren y sus campos quedan vacíos. La interfaz usa este objeto para pintar cada personaje.

### 4.7 Errores: `errores.js`

Cada error tiene dos textos:

- **Mensaje técnico:** "Error sintáctico en línea 2, columna 9: se esperaba NUMERO".
- **Explicación simple:** "Le dijiste al robot que avance, pero no cuántas casillas".

Las explicaciones simples son plantillas escritas a mano, una por tipo de error. No dependen de la IA, así que funcionan sin internet.

## 5. Diseño de la interfaz

### 5.1 Distribución de la pantalla

- **Izquierda, el chat:** caja para escribir en español, historial de mensajes y botones con los ejemplos guardados.
- **Centro arriba, el código Tinto:** editor de texto con el código que generó la IA. Se puede editar a mano y tiene el botón "Compilar".
- **Centro abajo, la línea de personajes:** El Lector, El Gramático, El Juez, El Traductor y El Ejecutor, de izquierda a derecha, con flechas entre ellos.
- **Derecha, el tablero:** la cuadrícula de 10×10 con el robot, y los botones "Reiniciar" y de velocidad.

### 5.2 Los personajes

Cada personaje tiene:

- Un dibujo simple (emoji o SVG), su nombre y, debajo, el nombre técnico de la fase.
- Tres estados: en espera (gris), aprobado (verde) y error (rojo).
- Un panel con lo que produjo:
  - **El Lector:** el código con cada lexema resaltado en un color según su tipo de token, y la lista de tokens.
  - **El Gramático:** el árbol dibujado, con los nodos apareciendo uno a uno.
  - **El Juez:** la lista de revisiones con un visto bueno en cada una.
  - **El Traductor:** la lista de instrucciones generadas, al lado del código original.
  - **El Ejecutor:** la instrucción que se está ejecutando, resaltada mientras el robot se mueve.
- El botón "¿Qué pasó aquí?", que explica la fase usando el código actual. Es una plantilla que se llena con los datos reales (por ejemplo: "Encontré 11 palabras. `repetir` es una palabra reservada y `4` es un número").

### 5.3 Modos de recorrido

- **Paso a paso:** el botón "Siguiente fase" activa un personaje a la vez. Es el modo para explicar.
- **Automático:** las fases corren solas con una pausa corta entre ellas. Es el modo para el público que solo quiere jugar.

### 5.4 Retos

Una lista de tarjetas en la pantalla:

- "Dibuja una escalera".
- "Dibuja la inicial de tu nombre".
- "Haz que El Lector falle".
- "Haz que El Gramático falle".
- "Haz que El Juez falle".

### 5.5 Legibilidad

La demo se muestra en la pantalla del portátil, así que todo debe caber sin hacer scroll y leerse a un metro de distancia, con letra grande y alto contraste.

## 6. Diseño de la IA

### 6.1 Cómo se conecta

- Un servidor pequeño en Node (`servidor.js`, sin dependencias) sirve la página y expone `POST /api/traducir`.
- Ese servidor ejecuta el comando `claude -p` con el texto del visitante y devuelve el código Tinto.
- Usa la suscripción de Claude Code que ya está en el Mac. No necesita API key.
- Ya está verificado que el Mac tiene Node 22 y el comando `claude` instalados.

### 6.2 El prompt

El prompt le da a la IA:

- La gramática completa y las reglas del tablero.
- Tres ejemplos de frase y código.
- La instrucción de responder solo con código Tinto, sin explicaciones.
- La instrucción de responder `NO_PUEDO: motivo` cuando lo pedido no se puede dibujar con el robot.

### 6.3 Qué pasa con cada respuesta

- **Código válido:** aparece en el editor y se compila.
- **Código con errores:** también aparece y se compila. El compilador lo atrapa, y eso es parte de la demo.
- **`NO_PUEDO`:** el chat muestra una respuesta amable con el motivo.
- **Sin internet o más de 20 segundos sin respuesta:** el chat avisa y sugiere los ejemplos guardados.

### 6.4 Ejemplos guardados

Cinco frases con su código ya escrito, que funcionan sin IA:

1. "Dibuja un cuadrado rojo" (correcto).
2. "Dibuja una escalera azul" (correcto, con `repetir`).
3. Un código con error léxico: `avanzar @3`.
4. Un código con error sintáctico: `repetir 4 veces` sin `fin`.
5. Un código con error semántico: `avanzar 99`.

## 7. Estructura de archivos

```
tinto-compilador/
  plan-de-pruebas.md
  plan-de-construccion.md
  package.json
  servidor.js
  compilador/
    lexer.js
    parser.js
    semantico.js
    generador.js
    ejecutor.js
    errores.js
    compilar.js
  pruebas/
    lexer.test.js
    parser.test.js
    semantico.test.js
    generador.test.js
    ejecutor.test.js
  web/
    index.html
    estilos.css
    app.js
    personajes.js
    tablero.js
    arbol.js
    ejemplos.js
```

Los archivos de `compilador/` son los mismos para las pruebas y para la página: no hay dos copias.

## 8. Cronograma

### Lunes 9: el compilador

1. Crear el proyecto: `package.json` y las carpetas.
2. Escribir `lexer.js` y sus pruebas (TC-L01 a TC-L06).
3. Escribir `parser.js` y sus pruebas (TC-S01 a TC-S09).
4. Escribir `semantico.js` y sus pruebas (TC-M01 a TC-M06).
5. Escribir `generador.js` y sus pruebas (TC-G01 a TC-G04).
6. Escribir `ejecutor.js` y sus pruebas (TC-E01 a TC-E05).
7. Escribir `errores.js` y `compilar.js`.

**Listo cuando:** `npm test` pasa los 30 casos automatizados.

**Repaso del día (30 minutos):** recorrer el lexer y el parser línea por línea, hasta poder explicar qué es un lexema, qué es un token y cómo se arma el árbol.

### Martes 10: la interfaz

1. Armar la página con las cuatro zonas.
2. Hacer el tablero y la animación del robot.
3. Hacer los personajes con sus tres estados y sus paneles.
4. Dibujar el árbol del Gramático.
5. Hacer los modos paso a paso y automático.
6. Hacer el botón "¿Qué pasó aquí?" y las explicaciones simples de errores.
7. Cargar los ejemplos guardados y las tarjetas de retos.

**Listo cuando:** pasan TC-U01 a TC-U06 a mano, escribiendo Tinto directamente en el editor. Ese día la demo ya funciona completa sin IA.

**Repaso del día (30 minutos):** el Juez y el Ejecutor, y por qué salirse del tablero se revisa antes de ejecutar.

### Miércoles 11: la IA y el ensayo

1. Escribir `servidor.js` con `/api/traducir`.
2. Escribir y afinar el prompt con unas 10 frases distintas.
3. Conectar el chat con el servidor, con indicador de carga y manejo de fallos.
4. Pasar TC-I01 a TC-I05.
5. Ensayar la demo completa con cronómetro, primero con internet y después sin él (TC-D01).
6. Revisar que todo se lea bien en la pantalla del portátil (TC-D02).
7. Pedirle a alguien que no programe que complete un reto (TC-D03).
8. Corregir lo que salga del ensayo.

**Listo cuando:** el ensayo completo sale dos veces seguidas sin fallos.

**Repaso del día (30 minutos):** practicar las preguntas de la sección 11.

### Jueves 12: la presentación

- Llegar con el servidor ya encendido y la página abierta.
- Probar un ejemplo con IA y uno guardado antes de empezar.
- No tocar el código ese día.

## 9. Guion de la demo (unos 5 minutos)

1. **Gancho (30 segundos):** "¿Cómo entiende un computador lo que le escribimos?". Escribir "dibuja un cuadrado rojo" y dejar que el robot lo dibuje en modo automático.
2. **Las fases (2 minutos):** repetir el mismo ejemplo en modo paso a paso y presentar cada personaje con lo que hizo.
3. **Los errores (1 minuto y medio):** cargar los tres ejemplos con error y mostrar que cada uno lo atrapa un personaje distinto.
4. **La IA (30 segundos):** aclarar que la IA solo tradujo, y que el compilador es el que revisa con reglas exactas.
5. **El público (el resto):** invitar a alguien a tomar una tarjeta de reto.

## 10. Riesgos y qué hacer con cada uno

- **No hay internet en el evento.** Los ejemplos guardados y el editor de Tinto funcionan sin conexión. Llevar también el celular para compartir datos.
- **La IA tarda mucho.** Hay indicador de carga y un límite de 20 segundos. Mientras responde, se explica en voz alta qué está haciendo.
- **La IA genera código malo.** Se aprovecha: el compilador lo atrapa y se muestra en qué fase.
- **El profesor pregunta por el código.** El código es corto, sin librerías y comentado, y hay un repaso cada día.
- **El tiempo no alcanza.** El orden de construcción garantiza que cada día termina con algo presentable: el lunes un compilador probado, el martes una demo sin IA y el miércoles la demo completa. Si algo se atrasa, lo primero que se recorta son los retos y el modo automático.
- **Falla el Mac o la pantalla.** Llevar un video de respaldo de la demo, grabado el miércoles.

## 11. Preguntas que puede hacer el profesor

- ¿Cuál es la diferencia entre lexema, token y patrón?
- ¿Qué técnica de análisis sintáctico usaste y por qué?
- ¿Cuál es la gramática del lenguaje?
- ¿Qué es un AST y para qué sirve?
- ¿Qué errores detecta cada fase y por qué en esa fase y no en otra?
- ¿Es un compilador o un intérprete? (Respuesta: es un compilador, porque traduce Tinto a otro lenguaje más simple, las instrucciones tipo máquina. Esas instrucciones las ejecuta una máquina virtual, igual que Java compila a bytecode y la JVM lo ejecuta.)
- ¿Qué papel cumple la IA y por qué no reemplaza al compilador?
- ¿Cómo lo extenderías? (Variables, condicionales, un optimizador.)
