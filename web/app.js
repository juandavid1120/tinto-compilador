// app.js
// Orquesta toda la página: el editor, el chat, los modos de recorrido,
// los personajes y el tablero. Aquí se llama a compilar() del compilador.

import { compilar } from '../compilador/compilar.js';
import { EJEMPLOS, RETOS } from './ejemplos.js';
import { crearTablero } from './tablero.js';
import {
  PERSONAJES,
  FASE_A_INDICE,
  crear,
  crearLinea,
  mostrarPanel,
  mostrarMensajePanel,
  marcarEjecucion,
  marcarEjecucionDetenida,
  limpiarEjecucion,
  resumirPasos,
} from './personajes.js';

const $ = (id) => document.getElementById(id);

// Pausas del robot según el control de velocidad (de 1 = lenta a 5 = rápida), en milisegundos.
const PAUSAS_ROBOT = [0, 650, 380, 210, 100, 40];
// Pausas del modo automático entre fases.
const PAUSA_TRABAJANDO = 350; // el personaje "palpita" antes de dar su resultado
const PAUSA_ENTRE_FASES = 500; // se deja ver su panel antes de pasar al siguiente
// Tiempo máximo de espera a la IA.
const LIMITE_IA = 20000;

// Espera una cantidad de milisegundos.
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// Muestra un aviso corto en pantalla durante unos segundos.
let relojAviso = null;
function avisar(texto) {
  const caja = $('aviso');
  caja.textContent = texto;
  caja.hidden = false;
  clearTimeout(relojAviso);
  relojAviso = setTimeout(() => (caja.hidden = true), 5000);
}

// ---------- Estado de la página ----------

const estado = {
  modo: 'paso', // "paso" o "auto"
  codigo: '', // el código que se compiló por última vez
  resultado: null, // lo que devolvió compilar()
  total: 0, // cuántos personajes se van a activar (5 si todo sale bien)
  reveladas: 0, // cuántos personajes ya se activaron
  fases: ['espera', 'espera', 'espera', 'espera', 'espera'],
  seleccionado: -1, // personaje cuyo panel está abierto
  secuencia: 0, // número de la corrida automática; si cambia, la corrida se cancela
};

// ---------- Piezas de la pantalla ----------

const tablero = crearTablero($('tablero'), $('estado-robot'));
const linea = crearLinea($('linea-personajes'), elegirPersonaje);
const panel = $('panel');
const botonSiguiente = $('btn-siguiente');

// ======================================================================
// EDITOR
// ======================================================================

const cajaCodigo = $('codigo');
const margen = $('margen');
const numeros = $('numeros');
const banda = $('banda');

// Escribe los números de línea al lado del editor.
function actualizarNumeros() {
  const cantidad = cajaCodigo.value.split('\n').length;
  if (numeros.childElementCount === cantidad) return;
  numeros.replaceChildren();
  for (let i = 1; i <= cantidad; i++) numeros.append(crear('div', 'numero', String(i)));
}

// Mantiene los números alineados cuando el editor hace scroll.
function sincronizarScroll() {
  numeros.style.transform = `translateY(${-cajaCodigo.scrollTop}px)`;
  if (!banda.hidden) ubicarBanda();
}

let lineaMarcada = null;

// Pinta una franja roja detrás de la línea del error (si hay).
function marcarLineaError(numero) {
  lineaMarcada = numero || null;
  banda.hidden = !lineaMarcada;
  numeros.querySelectorAll('.numero').forEach((n, i) => n.classList.toggle('con-error', i + 1 === lineaMarcada));
  if (lineaMarcada) ubicarBanda();
}

function ubicarBanda() {
  const estilo = getComputedStyle(cajaCodigo);
  const alto = parseFloat(estilo.lineHeight);
  const arriba = parseFloat(estilo.paddingTop);
  banda.style.height = `${alto}px`;
  banda.style.top = `${arriba + (lineaMarcada - 1) * alto - cajaCodigo.scrollTop}px`;
}

// Cambia el código del editor desde el programa (ejemplos o IA).
function ponerCodigo(texto) {
  cajaCodigo.value = texto;
  cajaCodigo.scrollTop = 0;
  marcarLineaError(null);
  actualizarNumeros();
  sincronizarScroll();
}

cajaCodigo.addEventListener('input', () => {
  marcarLineaError(null); // al editar, la franja vieja ya no sirve
  actualizarNumeros();
  sincronizarScroll();
});
cajaCodigo.addEventListener('scroll', sincronizarScroll);
// Tab sangra, pero no puede atrapar el teclado: con Escape el siguiente Tab sale del editor.
const ayudaEditor = $('ayuda-editor');
const AYUDA_NORMAL = 'Tab sangra · Esc y luego Tab sale del editor';
const AYUDA_SALIDA = 'Ahora Tab sale del editor';
let tabSale = false; // true después de pulsar Escape

function ponerTabSale(si) {
  tabSale = si;
  ayudaEditor.textContent = si ? AYUDA_SALIDA : AYUDA_NORMAL;
}

cajaCodigo.addEventListener('keydown', (evento) => {
  // Ctrl/Cmd + Enter compila.
  if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
    evento.preventDefault();
    compilarCodigo();
  }
  if (evento.key === 'Escape') {
    ponerTabSale(true);
    return;
  }
  // Tab escribe dos espacios (para sangrar lo que va dentro de un repetir),
  // salvo que se haya pulsado Escape antes: entonces el navegador mueve el foco.
  // Shift + Tab siempre se deja pasar: sale hacia atrás.
  if (evento.key === 'Tab' && !evento.shiftKey && !tabSale) {
    evento.preventDefault();
    cajaCodigo.setRangeText('  ', cajaCodigo.selectionStart, cajaCodigo.selectionEnd, 'end');
    cajaCodigo.dispatchEvent(new Event('input'));
  }
  // Cualquier otra tecla (que no sea Tab ni una tecla modificadora) vuelve a dejar que Tab sangre.
  if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(evento.key)) ponerTabSale(false);
});
cajaCodigo.addEventListener('blur', () => ponerTabSale(false));

// ======================================================================
// RECORRIDO DE LAS FASES
// ======================================================================

// Compila lo que haya en el editor y arranca el recorrido según el modo.
function compilarCodigo() {
  estado.secuencia++; // cancela cualquier corrida automática anterior
  tablero.reiniciar(); // limpia el tablero y cancela la animación anterior
  limpiarEjecucion();
  linea.reiniciar();
  marcarLineaError(null);
  estado.fases = ['espera', 'espera', 'espera', 'espera', 'espera'];
  estado.seleccionado = -1;
  estado.reveladas = 0;
  estado.total = 0;
  estado.resultado = null;

  const codigo = cajaCodigo.value;
  estado.codigo = codigo;

  let resultado;
  try {
    resultado = compilar(codigo);
  } catch (e) {
    // Solo pasa si hay un fallo del propio compilador (no del código del usuario).
    console.error(e);
    mostrarMensajePanel(panel, 'Algo salió mal por dentro', 'El compilador tuvo un fallo inesperado. Prueba con otro código.', 'aviso-error');
    actualizarSiguiente();
    return;
  }
  estado.resultado = resultado;

  // Código vacío: no se activa ningún personaje.
  if (resultado.vacio) {
    mostrarMensajePanel(panel, 'No hay nada que compilar', 'Escribe una instrucción como avanzar 3, o pídele algo al chat.');
    actualizarSiguiente();
    return;
  }

  // Si hay error, solo se activan los personajes hasta el que falló.
  estado.total = resultado.error ? (FASE_A_INDICE[resultado.error.fase] ?? 0) + 1 : PERSONAJES.length;
  mostrarMensajePanel(panel, 'Listo para compilar', estado.modo === 'paso' ? 'Pulsa «Siguiente fase» para despertar al primer personaje.' : 'Los personajes van a trabajar uno tras otro…');

  if (estado.modo === 'auto') {
    correrAutomatico();
  } else {
    actualizarSiguiente();
  }
}

// Activa el siguiente personaje: lo pone en verde (o en rojo si falló) y abre su panel.
function revelarSiguiente() {
  const i = estado.reveladas;
  if (!estado.resultado || estado.resultado.vacio || i >= estado.total) return;
  const falla = Boolean(estado.resultado.error) && i === estado.total - 1;

  const teniaElFoco = document.activeElement === botonSiguiente;
  estado.fases[i] = falla ? 'error' : 'aprobado';
  estado.reveladas++;
  linea.poner(i, estado.fases[i]);
  elegirPersonaje(i);

  if (falla) {
    marcarLineaError(estado.resultado.error.linea); // resalta la línea en el editor
    marcarRetoCumplido(estado.resultado.error.fase);
  }
  if (i === PERSONAJES.length - 1) ejecutarRobot();
  actualizarSiguiente();
  // Si el botón tenía el foco y se apagó (ya no quedan fases), el foco pasa al personaje
  // que acaba de abrirse; así quien usa el teclado no se queda "en el aire".
  if (teniaElFoco && botonSiguiente.disabled) linea.enfocar(i);
}

// Modo automático: las fases corren solas, con una pausa corta entre ellas.
async function correrAutomatico() {
  const miSecuencia = ++estado.secuencia;
  actualizarSiguiente();
  while (estado.reveladas < estado.total) {
    const i = estado.reveladas;
    linea.trabajando(i, true);
    await esperar(PAUSA_TRABAJANDO);
    if (miSecuencia !== estado.secuencia) return; // alguien compiló de nuevo o reinició
    revelarSiguiente();
    if (estado.reveladas >= estado.total) break;
    await esperar(PAUSA_ENTRE_FASES);
    if (miSecuencia !== estado.secuencia) return;
  }
  actualizarSiguiente();
}

// Abre el panel de un personaje que ya se activó.
function elegirPersonaje(indice) {
  if (!estado.resultado || indice >= estado.reveladas) {
    // Todavía no despierta: se sacude un poquito.
    const tarjeta = $('linea-personajes').querySelectorAll('.personaje')[indice];
    tarjeta?.classList.remove('sacudir');
    void tarjeta?.offsetWidth;
    tarjeta?.classList.add('sacudir');
    return;
  }
  estado.seleccionado = indice;
  linea.seleccionar(indice);
  mostrarPanel(panel, indice, {
    codigo: estado.codigo,
    resultado: estado.resultado,
    estado: estado.fases[indice],
    alRepetir: ejecutarRobot,
  });
}

// El Ejecutor recorre los pasos y el robot dibuja.
async function ejecutarRobot() {
  const resultado = estado.resultado;
  tablero.reiniciar();
  limpiarEjecucion();
  const resumen = resumirPasos(resultado.pasos); // cuántas instrucciones lleva ejecutadas en cada paso
  linea.trabajando(4, true);
  const termino = await tablero.animar(resultado.pasos, {
    pausa: () => PAUSAS_ROBOT[Number($('velocidad').value)],
    alPaso: (paso, i) => marcarEjecucion(paso, i + 1, resumen),
  });
  // Si la cancelaron (Reiniciar o Compilar), quien la canceló ya se encargó del personaje.
  if (termino) linea.trabajando(4, false);
}

// El botón "Siguiente fase" se prende o se apaga según el momento.
function actualizarSiguiente() {
  const nombre = $('siguiente-nombre');
  const hayResultado = estado.resultado && !estado.resultado.vacio && estado.total > 0;
  const quedan = hayResultado && estado.reveladas < estado.total;
  botonSiguiente.disabled = !(estado.modo === 'paso' && quedan);
  nombre.textContent = quedan && estado.modo === 'paso' ? PERSONAJES[estado.reveladas].nombre : '';
}

botonSiguiente.addEventListener('click', revelarSiguiente);
$('btn-compilar').addEventListener('click', () => {
  compilarCodigo();
  if (!botonSiguiente.disabled) botonSiguiente.focus(); // Enter sigue con la siguiente fase
});

// ---------- Modo: paso a paso o automático ----------

function ponerModo(modo) {
  const cambio = estado.modo !== modo; // pulsar el modo que ya está puesto no debe frenar nada
  estado.modo = modo;
  const auto = modo === 'auto';
  $('modo').setAttribute('aria-checked', String(auto));
  $('modo-paso').classList.toggle('activa', !auto);
  $('modo-auto').classList.toggle('activa', auto);

  const incompleto = estado.resultado && !estado.resultado.vacio && estado.reveladas < estado.total;
  if (auto && incompleto) {
    correrAutomatico(); // sigue solo desde donde iba
  } else if (!auto && cambio) {
    const corriaSolo = incompleto; // estaba pasando de fase en fase por sí solo
    estado.secuencia++; // detiene la corrida automática; ahora se avanza con el botón
    // Los personajes que todavía no se activaron dejan de palpitar.
    PERSONAJES.forEach((_, i) => {
      if (i >= estado.reveladas) linea.trabajando(i, false);
    });
    // Si el robot ya estaba dibujando, también se frena donde va (lo ya pintado se queda).
    // Se dice en pantalla, para que no parezca que el interruptor no hizo nada.
    if (tablero.detener()) {
      linea.trabajando(4, false);
      marcarEjecucionDetenida();
      avisar('Paso a paso: el robot se detuvo. Lo que ya pintó se queda; pulsa «Ejecutar otra vez» en El Ejecutor para verlo completo.');
    } else if (corriaSolo) {
      avisar(`Paso a paso: me detuve. Pulsa «Siguiente fase» para despertar a ${PERSONAJES[estado.reveladas].nombre}.`);
    }
  }
  actualizarSiguiente();
}
$('modo').addEventListener('click', () => ponerModo(estado.modo === 'auto' ? 'paso' : 'auto'));
$('modo-paso').addEventListener('click', () => ponerModo('paso'));
$('modo-auto').addEventListener('click', () => ponerModo('auto'));

// ---------- Reiniciar y velocidad ----------

$('btn-reiniciar').addEventListener('click', () => {
  estado.secuencia++; // cancela también una corrida automática pendiente
  tablero.reiniciar();
  limpiarEjecucion();
  linea.trabajando(4, false);
  PERSONAJES.forEach((_, i) => linea.trabajando(i, false));
  actualizarSiguiente();
});

// ======================================================================
// EJEMPLOS Y RETOS
// ======================================================================

// Botones de los ejemplos guardados: cargan el código sin usar la IA.
const listaEjemplos = $('lista-ejemplos');
for (const ejemplo of EJEMPLOS) {
  const boton = crear('button', 'ejemplo');
  boton.type = 'button';
  boton.dataset.fase = ejemplo.esperado ?? 'ok';
  boton.append(crear('span', 'ejemplo-frase', ejemplo.frase), crear('small', 'ejemplo-etiqueta', ejemplo.etiqueta));
  boton.addEventListener('click', () => {
    agregarMensaje('usuario', ejemplo.frase);
    agregarMensaje('ia', 'Ejemplo guardado, sin IA. Este es el código:', ejemplo.codigo);
    ponerCodigo(ejemplo.codigo);
    compilarCodigo();
  });
  listaEjemplos.append(boton);
}

// Tarjetas de retos. Cada una se puede marcar como hecha; al pulsar el título
// se abre y muestra la descripción y la pista.
const hechos = new Set();
const tarjetasReto = new Map();
for (const reto of RETOS) {
  const tarjeta = crear('div', 'reto');
  const marca = crear('button', 'reto-marca');
  marca.type = 'button';
  marca.setAttribute('aria-label', `Marcar como hecho: ${reto.titulo}`);
  marca.setAttribute('aria-pressed', 'false');
  marca.addEventListener('click', () => ponerReto(reto.id, !hechos.has(reto.id)));

  const titulo = crear('button', 'reto-titulo');
  titulo.type = 'button';
  titulo.setAttribute('aria-expanded', 'false');
  titulo.append(crear('strong', '', reto.titulo), crear('span', 'reto-flecha', '▾'));

  const detalle = crear('div', 'reto-detalle');
  detalle.hidden = true;
  detalle.append(crear('p', '', reto.descripcion), crear('p', 'reto-pista', `Pista: ${reto.pista}`));
  titulo.addEventListener('click', () => {
    detalle.hidden = !detalle.hidden;
    titulo.setAttribute('aria-expanded', String(!detalle.hidden));
    tarjeta.classList.toggle('abierto', !detalle.hidden);
  });

  const cabecera = crear('div', 'reto-cab');
  cabecera.append(marca, titulo);
  tarjeta.append(cabecera, detalle);
  $('lista-retos').append(tarjeta);
  tarjetasReto.set(reto.id, { tarjeta, marca });
}

function ponerReto(id, hecho) {
  if (hecho) hechos.add(id);
  else hechos.delete(id);
  const { tarjeta, marca } = tarjetasReto.get(id);
  tarjeta.classList.toggle('hecho', hecho);
  marca.setAttribute('aria-pressed', String(hecho));
}

// Los retos "Haz que X falle" se marcan solos cuando esa fase atrapa un error.
function marcarRetoCumplido(fase) {
  for (const reto of RETOS) {
    if (reto.fase === fase) ponerReto(reto.id, true);
  }
}

// ======================================================================
// CHAT E IA
// ======================================================================

const historial = $('historial');
const textoChat = $('texto-chat');
const botonEnviar = $('btn-enviar');
const avisoChat = $('aviso-chat');
const PLACEHOLDER_CHAT = textoChat.placeholder;
let esperandoIA = false;
let relojAvisoChat = null;

// Aviso breve encima de la caja del chat (por ejemplo, cuando se envía vacío).
function avisarEnChat(texto) {
  avisoChat.textContent = texto;
  avisoChat.hidden = false;
  textoChat.classList.add('con-aviso');
  clearTimeout(relojAvisoChat);
  relojAvisoChat = setTimeout(quitarAvisoChat, 3000);
}

function quitarAvisoChat() {
  clearTimeout(relojAvisoChat);
  avisoChat.hidden = true;
  textoChat.classList.remove('con-aviso');
}

// Mientras la IA responde, la caja y el botón se apagan (y se nota); al terminar vuelven.
function bloquearChat(si) {
  esperandoIA = si;
  textoChat.disabled = si;
  botonEnviar.disabled = si;
  botonEnviar.textContent = si ? 'Esperando…' : 'Enviar';
  textoChat.placeholder = si ? 'Esperando a la IA…' : PLACEHOLDER_CHAT;
}

// Si lo que escribió la IA ya es una frase completa, se muestra tal cual; si le falta
// el signo final se le pone un punto. Solo se agrega nuestra sugerencia cuando la IA no
// terminó en pregunta (una pregunta ya propone otra cosa para dibujar).
const SUGERENCIA = 'Pídeme algo con líneas, giros y colores, como «dibuja un cuadrado rojo».';
function mensajeDeRechazo(motivo) {
  const texto = (motivo ?? '').trim();
  if (texto === '') return `Eso no lo puedo dibujar con el robot. ${SUGERENCIA}`;
  // Un motivo que empieza en minúscula es un pedazo de frase ("una pizza no tiene..."): se le da inicio.
  const inicio = /^[a-záéíóúüñ]/.test(texto) ? 'Eso no lo puedo dibujar con el robot: ' : '';
  // Cierra con punto solo si no termina ya en . ! ? … (aunque venga seguido de comillas o paréntesis).
  const frase = /[.!?…]["»”')\]]*$/.test(texto) ? texto : `${texto}.`;
  const completa = inicio + frase;
  return /\?["»”')\]]*$/.test(completa) ? completa : `${completa} ${SUGERENCIA}`;
}

// Agrega un mensaje al historial. rol: "usuario", "ia" o "aviso". "codigo" es opcional.
function agregarMensaje(rol, texto, codigo) {
  const mensaje = crear('div', `mensaje ${rol}`);
  if (texto) mensaje.append(crear('p', '', texto));
  if (codigo) mensaje.append(crear('pre', 'mensaje-codigo', codigo));
  historial.append(mensaje);
  historial.scrollTop = historial.scrollHeight;
  return mensaje;
}

// Mensaje con tres puntos que laten mientras la IA responde.
function agregarCargando() {
  const mensaje = crear('div', 'mensaje ia cargando');
  mensaje.setAttribute('role', 'status');
  mensaje.append(crear('span', 'puntos', ''), crear('span', '', 'Traduciendo a Tinto…'));
  mensaje.querySelector('.puntos').innerHTML = '<i></i><i></i><i></i>';
  historial.append(mensaje);
  historial.scrollTop = historial.scrollHeight;
  return mensaje;
}

// Pide la traducción al servidor. Devuelve el JSON, o lanza un error si algo falla
// (sin internet, error del servidor, respuesta rara o más de 20 segundos).
async function pedirTraduccion(texto) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), LIMITE_IA);
  try {
    const respuesta = await fetch('/api/traducir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
      signal: control.signal,
    });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const datos = await respuesta.json();
    if (datos === null || typeof datos !== 'object') throw new Error('Respuesta inesperada');
    return datos;
  } finally {
    clearTimeout(reloj);
  }
}

const AVISO_SIN_IA =
  'La IA no está disponible ahora (puede que no haya internet). ' +
  'Usa los ejemplos guardados de aquí abajo o escribe Tinto directamente en el editor.';

async function enviarMensaje(evento) {
  evento.preventDefault();
  if (esperandoIA) return; // (la caja y el botón ya están apagados; esto es por si acaso)
  const texto = textoChat.value.trim();
  if (!texto) {
    textoChat.value = ''; // si solo había espacios, se limpian
    avisarEnChat('Escribe qué quieres que dibuje el robot.');
    textoChat.focus();
    return;
  }
  quitarAvisoChat();

  agregarMensaje('usuario', texto);
  textoChat.value = '';
  bloquearChat(true);
  const cargando = agregarCargando();

  try {
    const datos = await pedirTraduccion(texto);
    cargando.remove();

    if (typeof datos.codigo === 'string' && datos.codigo.trim() !== '') {
      // La IA devolvió código: va al editor, se muestra en el chat y se compila.
      agregarMensaje('ia', 'Esto es lo que traduje. Ahora el compilador lo revisa:', datos.codigo);
      ponerCodigo(datos.codigo);
      compilarCodigo();
    } else if (typeof datos.noPuedo === 'string') {
      agregarMensaje('ia', mensajeDeRechazo(datos.noPuedo));
    } else {
      throw new Error(datos.error ?? 'Respuesta sin código');
    }
  } catch (e) {
    cargando.remove();
    agregarMensaje('aviso', AVISO_SIN_IA);
  } finally {
    bloquearChat(false);
    // El foco vuelve a la caja, salvo que la persona ya se haya ido a otro control.
    if (document.activeElement === document.body || document.activeElement === textoChat) textoChat.focus();
  }
}

$('form-chat').addEventListener('submit', enviarMensaje);
// Enter envía; Shift + Enter hace un salto de línea.
textoChat.addEventListener('input', quitarAvisoChat); // al escribir, el aviso ya no hace falta
textoChat.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    $('form-chat').requestSubmit();
  }
});

// ======================================================================
// ARRANQUE
// ======================================================================

agregarMensaje('ia', '¡Hola! Cuéntame en español qué quieres que dibuje el robot y lo traduzco a Tinto. Si prefieres, usa un ejemplo guardado.');
mostrarMensajePanel(panel, 'Aquí aparecerán los personajes', 'Escribe o elige un ejemplo y pulsa Compilar. Cada personaje te mostrará lo que hizo.');
actualizarNumeros();
actualizarSiguiente();
