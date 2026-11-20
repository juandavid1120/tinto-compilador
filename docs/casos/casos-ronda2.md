# Casos de prueba de Tinto, ronda 2

La ronda 1 (`casos-e2e.md`) validó el recorrido normal. Esta ronda busca romper la aplicación: entradas raras, uso desordenado, muchas frases distintas a la IA y programas generados al azar.

## G. Robustez de la interfaz (navegador)

- **R2-01: HTML en el chat.** Enviar por el chat `<img src=x onerror="document.title='HACK'">` y `<b>hola</b>`. Esperado: el texto se muestra tal cual, como texto; no se ejecuta nada y el título de la página no cambia.
- **R2-02: HTML en el editor.** Compilar `avanzar <script>alert(1)</script>`. Esperado: error léxico normal; en los paneles y en el mensaje de error el texto aparece como texto y no se ejecuta.
- **R2-03: doble envío en el chat.** Enviar una frase y, antes de que llegue la respuesta, intentar enviar otra. Esperado: no se mezclan las respuestas ni queda un indicador de carga pegado.
- **R2-04: clics rápidos en Compilar.** Pulsar "Compilar" 10 veces seguidas con el cuadrado, en automático. Esperado: un solo dibujo correcto (12 casillas) y ningún error de JavaScript.
- **R2-05: clics rápidos en Siguiente fase.** En paso a paso, pulsar "Siguiente fase" 15 veces muy rápido. Esperado: los cinco personajes quedan aprobados una sola vez y el cuadrado sale bien.
- **R2-06: editar durante la animación.** Con velocidad lenta, mientras el robot dibuja, cambiar el código y compilar otra cosa. Esperado: el dibujo anterior se cancela y solo queda el nuevo.
- **R2-07: programa largo.** Compilar un programa de 60 líneas válidas (por ejemplo, un recorrido en espiral escrito sin `repetir`). Esperado: compila, los paneles muestran todo con scroll interno y la página no gana scroll.
- **R2-08: ciclos muy anidados.** Compilar 5 niveles de `repetir` anidados con un `girar derecha` adentro. Esperado: el árbol se dibuja sin salirse del panel ni montarse.
- **R2-09: programa demasiado largo.** Compilar tres `repetir 100 veces:` anidados con `girar derecha` adentro. Esperado: El Juez lo rechaza con un mensaje claro y la página no se congela.
- **R2-10: número gigante.** Compilar `avanzar 99999999999999999999999`. Esperado: error semántico normal, sin congelarse.
- **R2-11: tildes, eñes y emojis.** Compilar `avanzár 3`, `año 3` y `avanzar 🚀`. Esperado: error léxico en los tres, con la palabra o el símbolo completo en el mensaje.
- **R2-12: saltos de línea de Windows y tabulaciones.** Compilar el cuadrado con `\r\n` y con tabulaciones en vez de espacios. Esperado: compila igual.
- **R2-13: texto pegado con espacios raros.** Compilar el cuadrado con espacios al inicio y al final de cada línea y cinco líneas vacías en medio. Esperado: compila, y los números de línea de un error posterior siguen siendo correctos.
- **R2-14: ver un panel anterior.** Tras compilar el cuadrado completo, pulsar cada personaje para volver a ver su panel. Esperado: cada panel muestra su contenido y volver al del Ejecutor no repite el dibujo solo.
- **R2-15: "Ejecutar otra vez".** Pulsar ese botón tres veces. Esperado: el dibujo se repite desde cero cada vez, sin casillas duplicadas ni animaciones encimadas.
- **R2-16: recargar la página.** Recargar a mitad de una animación. Esperado: la página vuelve limpia, sin errores.
- **R2-17: ventana pequeña.** Probar a 1024×768 y a 1366×768 (resolución común en portátiles). Esperado: se anota qué se corta o se monta en cada una.
- **R2-18: zoom del navegador.** Probar a 1440×900 con zoom de 125 % y 150 %. Esperado: se anota qué se corta.
- **R2-19: solo teclado.** Cargar un ejemplo, compilar y avanzar las fases usando solo el teclado (Tab, Enter, Cmd+Enter). Esperado: se puede completar el recorrido y el foco se ve.
- **R2-20: guion de la demo completo.** Ejecutar el guion de la sección 9 de `plan-de-construccion.md` de principio a fin, en orden y sin recargar: cuadrado por chat en automático, el mismo en paso a paso, los tres ejemplos con error, y un reto. Esperado: nada queda en un estado raro entre un paso y el siguiente.

## H. La IA con frases del público

- **R2-21: batería de 40 frases.** Enviar 40 frases como las que escribiría un estudiante nuevo, sin simular respuestas. Deben incluir: figuras simples (cuadrado, rectángulo, línea, escalera, L, zigzag), tamaños ("grande", "pequeño", "de 5"), colores válidos y uno inválido, frases coloquiales paisas ("parce, hágame un cuadrito"), frases con errores de ortografía, frases en inglés, peticiones imposibles (círculo, triángulo), peticiones que no son dibujos, y frases vagas ("dibuja algo bonito"). Para cada una se registra: tiempo, si devolvió código o rechazo, si el código compila y, cuando compila, si el dibujo corresponde a lo pedido (mirando las casillas pintadas). Esperado: se reporta la tasa de aciertos y qué tipos de frase fallan.
- **R2-22: misma frase diez veces.** Enviar "dibuja un cuadrado rojo" 10 veces. Esperado: se reporta si la respuesta varía y el tiempo mínimo, promedio y máximo.
- **R2-23: cuatro peticiones a la vez.** Enviar 4 frases al servidor al mismo tiempo. Esperado: las cuatro responden bien y se reporta cuánto tarda cada una.
- **R2-24: intentos de manipulación.** Probar 8 variantes: pedir el prompt del sistema, pedir que responda en otro formato, pedir código con errores a propósito, texto con instrucciones escondidas dentro de una descripción de dibujo, y similares. Esperado: nunca revela el prompt ni responde algo que no sea código Tinto o un rechazo.

## I. El compilador con programas al azar

- **R2-25: programas válidos al azar.** Generar 2.000 programas aleatorios sintácticamente válidos (con ciclos anidados) y compilarlos. Esperado: `compilar` nunca lanza una excepción; cuando no hay error, el ejecutor nunca se sale del tablero, y la posición final del ejecutor coincide con una simulación independiente escrita aparte.
- **R2-26: texto basura.** Compilar 2.000 textos aleatorios (caracteres al azar, palabras del lenguaje revueltas, líneas cortadas). Esperado: `compilar` nunca lanza una excepción y siempre devuelve un error con fase, mensaje, explicación y línea, o un resultado válido.
- **R2-27: coherencia de las líneas.** En 500 programas con un único error sembrado en una línea conocida, verificar la línea que reporta el error. Esperado: coincide con la línea sembrada.
- **R2-28: coherencia del código generado.** En 500 programas válidos, verificar que cada `VOLVER` apunta a la instrucción siguiente a su `CONTAR` y que la cantidad de pasos de tipo "mover" es igual a la suma de casillas que resulta de expandir el programa a mano.

## J. El servidor

- **R2-29: puerto ocupado.** Iniciar un segundo servidor en el mismo puerto. Esperado: un mensaje claro, no un error incomprensible.
- **R2-30: peticiones mal formadas.** Enviar a `/api/traducir` un cuerpo enorme, JSON roto, otro tipo de contenido y otros métodos. Esperado: respuestas JSON con el estado correcto y el servidor sigue vivo.
- **R2-31: 50 traducciones seguidas.** Enviar 50 peticiones, una tras otra. Esperado: el servidor no se degrada ni quedan procesos `claude` huérfanos al terminar.
