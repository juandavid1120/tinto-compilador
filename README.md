# Tinto

Proyecto de aula para la Semana de Ingeniería del ITM. Tinto es un lenguaje de programación inventado, con instrucciones en español (`avanzar`, `girar`, `pintar`, `repetir`), que mueve un robot virtual por un tablero de 10×10 y va pintando las casillas. La página web recibe una frase en español, una IA la traduce a Tinto, y el compilador (léxico, sintáctico, semántico, generación de código y ejecución) procesa el código y muestra cada fase mientras el robot dibuja el resultado.

## Requisitos

- Node.js (probado con la versión 22).
- El comando `claude` (Claude Code) instalado y con sesión iniciada: el servidor lo usa para traducir de español a Tinto. Sin él, la página sigue funcionando con los ejemplos guardados.

## Cómo correrlo

1. `npm install` (solo hace falta para las pruebas de navegador; el servidor no tiene dependencias).
2. `npm start`
3. Abrir http://localhost:3000 en el navegador (redirige a `/web/`).

## Pruebas

- `npm test` corre las pruebas unitarias del compilador (75 pruebas).

## Carpetas principales

- `compilador/`: las fases del compilador.
- `web/`: la interfaz (chat, editor, personajes y tablero).
- `servidor.js` y `prompt-traductor.md`: servidor y prompt de la traducción con IA.
- `pruebas/`: pruebas unitarias y scripts de pruebas en el navegador.
- `docs/`: plan de construcción, plan de pruebas, casos y resultados.
