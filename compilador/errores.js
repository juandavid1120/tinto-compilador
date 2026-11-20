// errores.js
// Define el error que usan todas las fases del compilador.
// Cada error lleva dos textos: uno técnico (mensaje) y otro en palabras
// simples (explicacion) para quien no sabe programar.

export class ErrorTinto extends Error {
  // fase: "lexico", "sintactico" o "semantico"
  // mensaje: texto técnico, por ejemplo: Error léxico en línea 1, columna 9: símbolo inválido "@"
  // explicacion: el mismo error en palabras simples
  // linea y columna: dónde ocurrió (columna puede ser null)
  constructor({ fase, mensaje, explicacion, linea, columna }) {
    super(mensaje); // guarda el mensaje técnico en la clase Error de JavaScript
    this.name = 'ErrorTinto';
    this.fase = fase;
    this.mensaje = mensaje;
    this.explicacion = explicacion;
    this.linea = linea;
    this.columna = columna;
  }

  // Devuelve el error como un objeto simple, listo para mostrar en la interfaz.
  aObjeto() {
    return {
      fase: this.fase,
      mensaje: this.mensaje,
      explicacion: this.explicacion,
      linea: this.linea,
      columna: this.columna,
    };
  }
}
