// Medidas de lo que se corta o se monta (se ejecuta dentro de la página).
export const MEDIR = () => {
  const out = { ventana: [innerWidth, innerHeight], dpr: devicePixelRatio };
  const d = document.documentElement;
  const b = document.body;
  out.scrollPagina = { vertical: Math.max(d.scrollHeight - d.clientHeight, b.scrollHeight - b.clientHeight), horizontal: Math.max(d.scrollWidth - d.clientWidth, b.scrollWidth - b.clientWidth) };

  const rangoTexto = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const c = r.getBoundingClientRect();
    return c;
  };
  // 1) Personajes: el texto se sale de su tarjeta o se monta con el de otra
  const tarjetas = [...document.querySelectorAll('.personaje')];
  const textos = [];
  const salenDeTarjeta = [];
  tarjetas.forEach((t, i) => {
    const tr = t.getBoundingClientRect();
    t.querySelectorAll('.personaje-nombre, .personaje-tecnico').forEach((el) => {
      const rr = rangoTexto(el);
      textos.push({ i, texto: el.textContent, l: rr.left, r: rr.right, t: rr.top, b: rr.bottom });
      if (rr.left < tr.left - 0.5 || rr.right > tr.right + 0.5) salenDeTarjeta.push(`${el.textContent} (texto ${Math.round(rr.left)}-${Math.round(rr.right)}, tarjeta ${Math.round(tr.left)}-${Math.round(tr.right)})`);
    });
  });
  const montados = [];
  for (let a = 0; a < textos.length; a++) {
    for (let c = a + 1; c < textos.length; c++) {
      const x = textos[a], y = textos[c];
      if (x.i !== y.i && x.l < y.r - 0.5 && y.l < x.r - 0.5 && x.t < y.b - 0.5 && y.t < x.b - 0.5) montados.push(`${x.texto} x ${y.texto}`);
    }
  }
  // flechas: el texto del personaje pisa una flecha
  const flechas = [...document.querySelectorAll('.flecha')].map((f) => f.getBoundingClientRect());
  const pisaFlecha = [];
  textos.forEach((x) => flechas.forEach((f) => { if (x.l < f.right - 0.5 && f.left < x.r - 0.5 && x.t < f.bottom && f.top < x.b) pisaFlecha.push(x.texto); }));
  out.personajes = {
    anchoTarjetas: tarjetas.map((t) => Math.round(t.getBoundingClientRect().width)),
    salenDeTarjeta,
    textosMontadosEntreTarjetas: montados,
    textosQuePisanFlechas: [...new Set(pisaFlecha)],
    tarjetasConNombrePartidoEnVariasLineas: tarjetas.filter((t) => t.querySelector('.personaje-nombre').getBoundingClientRect().height > 1.6 * parseFloat(getComputedStyle(t.querySelector('.personaje-nombre')).lineHeight || 20)).map((t) => t.querySelector('.personaje-nombre').textContent),
  };

  // 2) Texto cortado: un elemento con texto cuyo rectángulo se sale de un ancestro que recorta
  const cortados = [];
  const enScroll = [];
  const visto = new Set();
  const pasa = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const ox = cs.overflowX, oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const ar = a.getBoundingClientRect();
      const er = rangoTexto(el);
      if (er.width === 0 || er.height === 0) return;
      const sale = er.right > ar.right + 1.5 || er.left < ar.left - 1.5 || er.bottom > ar.bottom + 1.5 || er.top < ar.top - 1.5;
      if (sale) {
        const clave = `${(el.className || el.tagName).toString().slice(0, 30)}|${el.textContent.trim().slice(0, 30)}`;
        if (visto.has(clave)) return;
        visto.add(clave);
        const info = `${(el.className || el.tagName).toString().slice(0, 28)} "${el.textContent.trim().slice(0, 36)}" en ${(a.className || a.tagName).toString().slice(0, 28)} (texto ${Math.round(er.left)}-${Math.round(er.right)} x ${Math.round(er.top)}-${Math.round(er.bottom)}; caja ${Math.round(ar.left)}-${Math.round(ar.right)} x ${Math.round(ar.top)}-${Math.round(ar.bottom)})`;
        const scrollable = (/auto|scroll/.test(ox) && (er.right > ar.right + 1.5 || er.left < ar.left - 1.5)) || (/auto|scroll/.test(oy) && (er.bottom > ar.bottom + 1.5 || er.top < ar.top - 1.5));
        (scrollable ? enScroll : cortados).push(info);
        return;
      }
    }
  };
  const hojas = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() !== '' && !['SCRIPT', 'STYLE', 'OPTION'].includes(e.tagName) && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0);
  hojas.forEach(pasa);
  out.cortados = cortados.slice(0, 40);
  out.cortadosTotal = cortados.length;
  out.enScrollInterno = enScroll.slice(0, 25);
  out.enScrollInternoTotal = enScroll.length;

  // 3) Elementos que se salen de la ventana
  const fuera = [];
  hojas.forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) {
      // ignorar lo que esta dentro de un contenedor con scroll (ya cuenta como scroll)
      let dentro = false;
      for (let a = e.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll|hidden/.test(cs.overflowX + cs.overflowY) && a !== document.body && a !== document.documentElement) { dentro = true; break; } }
      if (!dentro) fuera.push(`${(e.className || e.tagName).toString().slice(0, 24)} "${e.textContent.trim().slice(0, 30)}"`);
    }
  });
  out.fueraDeVentana = fuera.slice(0, 15);

  // 4) Retos
  const lista = document.querySelector('#lista-retos');
  if (lista) {
    const lr = lista.getBoundingClientRect();
    const tarj = [...lista.querySelectorAll('.reto')];
    const completas = tarj.filter((t) => { const r = t.getBoundingClientRect(); return r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1; }).length;
    out.retos = { total: tarj.length, completamenteVisibles: completas, scrollInterno: lista.scrollHeight - lista.clientHeight };
  }
  // 5) Barra del editor
  const barra = document.querySelector('.editor-barra');
  const titulo = document.querySelector('#t-editor');
  const sig = document.querySelector('#btn-siguiente');
  const comp = document.querySelector('#btn-compilar');
  if (barra) {
    out.barraEditor = {
      tituloAlto: Math.round(titulo.getBoundingClientRect().height), tituloLineas: Math.round(titulo.getBoundingClientRect().height / parseFloat(getComputedStyle(titulo).lineHeight || 24)),
      siguienteAlto: Math.round(sig.getBoundingClientRect().height), compilarAlto: Math.round(comp.getBoundingClientRect().height),
      barraAlto: Math.round(barra.getBoundingClientRect().height),
    };
  }
  // 6) Editor / chat / tablero: tamaños
  const r4 = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  out.tamanos = { chat: r4('.chat'), editor: r4('.editor-zona'), panel: r4('#panel'), tablero: r4('#tablero'), derecha: r4('.derecha'), historial: r4('#historial'), formChat: r4('#form-chat') };
  // 7) panel: contenido que requiere scroll vertical de la propia pagina del panel
  const p = document.querySelector('#panel');
  out.panelDesborda = { scroll: [p.scrollWidth, p.scrollHeight], visible: [p.clientWidth, p.clientHeight] };
  // error: la caja de explicacion y el codigo visibles
  const ec = document.querySelector('#panel .error-caja');
  const eco = document.querySelector('#panel .error-codigo');
  if (ec) {
    const pr = p.getBoundingClientRect();
    const er = ec.getBoundingClientRect();
    out.error = { cajaExplicacion: [Math.round(er.top - pr.top), Math.round(er.bottom - pr.top)], panelAlto: Math.round(pr.height), codigoVisibleAlto: eco ? Math.round(Math.max(0, Math.min(eco.getBoundingClientRect().bottom, pr.bottom) - eco.getBoundingClientRect().top)) : 0, codigoLineas: eco ? eco.querySelectorAll('.fila').length : 0, codigoScrollable: eco ? eco.scrollHeight - eco.clientHeight : 0 };
  }
  return out;
};
