// Validación R2-25 a R2-28. Semilla fija. Simulador independiente (no usa nada de compilador/ salvo compilar()).
import { compilar } from '../../../compilador/compilar.js';
const SEED = Number(process.env.SEED || 20261112);
// mulberry32
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R = rng(SEED);
const ri=(a,b)=>a+Math.floor(R()*(b-a+1)); const pick=a=>a[Math.floor(R()*a.length)];
const COL=['rojo','azul','verde','amarillo','negro'];

// ---- generador de programas como árbol propio ----
function genBloque(prof, maxNodos, limpio){
  const n=ri(1,maxNodos), out=[];
  for(let i=0;i<n;i++){
    const k=R();
    if(k<0.35) out.push({t:'av',n: limpio? ri(1,4): ri(1,9)});
    else if(k<0.60) out.push({t:'gi',d:pick(['derecha','izquierda'])});
    else if(k<0.75) out.push({t:'pi',c:pick(COL)});
    else if(prof<6) out.push({t:'rep',n: ri(1,limpio?4:12), c: genBloque(prof+1, 3, limpio)});
    else out.push({t:'gi',d:'derecha'});
  }
  return out;
}
// render a texto con estilo variable
function render(bloque, sty, lineaActual, mapa, ind=0){ // devuelve líneas; mapa: nodo->línea
  const L=[];
  const sp=()=> sty.indent? ' '.repeat(ind*2): '';
  const maybeBlank=()=>{ while(R()<sty.blank) L.push(R()<0.5?'':' \t '); };
  const cap=s=> sty.upper&&R()<0.5? (R()<0.5? s.toUpperCase(): s[0].toUpperCase()+s.slice(1)) : s;
  const ws=()=> sty.tabs&&R()<0.3 ? '\t' : ' '.repeat(ri(1, sty.extra?3:1));
  for(const nd of bloque){
    maybeBlank();
    let txt;
    if(nd.t==='av') txt=`${cap('avanzar')}${ws()}${nd.n}`;
    else if(nd.t==='gi') txt=`${cap('girar')}${ws()}${cap(nd.d)}`;
    else if(nd.t==='pi') txt=`${cap('pintar')}${ws()}${cap(nd.c)}`;
    else txt=`${cap('repetir')}${ws()}${nd.n}${ws()}${cap('veces')}${R()<0.2?' ':''}:`;
    nd.linea=L.length+1+ (mapa.base||0);
    L.push(sp()+txt+(sty.trail&&R()<0.3?'  ':''));
    if(nd.t==='rep'){
      const hijos=render(nd.c,sty,0,{base:(mapa.base||0)+L.length},ind+1);
      L.push(...hijos); maybeBlank();
      L.push(sp()+cap('fin'));
    }
  }
  return L;
}
function estilo(){ return {indent:R()<0.7,blank:R()<0.4?0.25:0,upper:R()<0.3,tabs:R()<0.2,extra:R()<0.3,trail:R()<0.3,eol:pick(['\n','\n','\r\n','\r']),finalNL:R()<0.5}; }
function aTexto(bloque,sty){ const mapa={base:0}; const L=render(bloque,sty,0,mapa); return L.join(sty.eol)+(sty.finalNL?sty.eol:''); }

// ---- simulador independiente (por expansión recursiva, sin pasar por el AST ni el generador) ----
const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
function simula(bloque){
  const s={x:0,y:0,d:0,col:'negro',movs:0,pintadas:new Map(),fuera:false,pasosMover:0,instr:0};
  function run(b){
    for(const nd of b){
      if(s.fuera) return;
      if(nd.t==='av'){ s.instr++; for(let i=0;i<nd.n;i++){const nx=s.x+DIRS[s.d][0],ny=s.y+DIRS[s.d][1]; if(nx<0||ny<0||nx>9||ny>9){s.fuera=true;return;} s.x=nx;s.y=ny;s.pintadas.set(nx+','+ny,s.col);s.pasosMover++;} }
      else if(nd.t==='gi'){ s.instr++; s.d=(s.d+(nd.d==='derecha'?1:3))%4; }
      else if(nd.t==='pi'){ s.instr++; s.col=nd.c; }
      else { for(let i=0;i<nd.n;i++){ s.instr++; run(nd.c); if(s.fuera) return; } }
    }
  }
  run(bloque); return s;
}
const nombreDir=['derecha','abajo','izquierda','arriba'];
// cuenta de instrucciones según el criterio del semántico (cada vuelta cuenta 1) para saber si cabe en 10000
const resumen={};
const falla=[]; const fb=(c,m,x)=>{ if(falla.length<40) falla.push({caso:c,msg:m,...x}); resumen[c]=(resumen[c]||0)+1; };

// ===== R2-25 =====
let ok25=0, err25=0, fuera25=0, excep25=0, largos25=0;
for(let i=0;i<2000;i++){
  const limpio=R()<0.5; const b=genBloque(0,limpio?5:7,limpio);
  const sty=estilo(); const txt=aTexto(b,sty);
  let r; try{ r=compilar(txt);}catch(e){ excep25++; fb('R2-25','excepción',{txt,e:String(e)}); continue; }
  const sim=simula(b);
  if(r.error){
    err25++;
    if(r.error.fase==='semantico' && (sim.fuera||sim.instr>10000)){ if(sim.fuera) fuera25++; else largos25++; 
       // la simulación independiente debe coincidir en la causa
       const esFuera=/sale del tablero/.test(r.error.mensaje), esLargo=/demasiado largo/.test(r.error.mensaje);
       // si ambos ocurren, el semántico reporta el que ocurra primero en el recorrido
       if(!(esFuera&&sim.fuera) && !(esLargo&&sim.instr>10000)) fb('R2-25','causa del error semántico no coincide',{txt,err:r.error.mensaje,simFuera:sim.fuera,simInstr:sim.instr});
    } else fb('R2-25','error inesperado en programa válido',{txt,err:r.error,simFuera:sim.fuera,simInstr:sim.instr});
    continue;
  }
  if(sim.fuera) fb('R2-25','compiló pero el simulador dice que se sale',{txt});
  if(sim.instr>10000) fb('R2-25','compiló pero pasa de 10000 instr (según simulación)',{txt,instr:sim.instr});
  ok25++;
  const f=r.estadoFinal;
  if(f.x!==sim.x||f.y!==sim.y||f.direccion!==nombreDir[sim.d]||f.color!==sim.col) fb('R2-25','estado final distinto',{txt,f,sim:{x:sim.x,y:sim.y,d:nombreDir[sim.d],c:sim.col}});
  for(const p of r.pasos) if(p.accion==='mover'&&(p.x<0||p.x>9||p.y<0||p.y>9)) fb('R2-25','paso mover fuera del tablero',{txt});
  // casillas pintadas
  const kp=Object.keys(r.casillasPintadas);
  if(kp.length!==sim.pintadas.size||kp.some(k=>sim.pintadas.get(k)!==r.casillasPintadas[k])) fb('R2-25','casillasPintadas distintas',{txt});
  if(r.pasos.filter(p=>p.accion==='mover').length!==sim.pasosMover) fb('R2-25','cantidad de mover distinta',{txt});
}
console.log(`R2-25: semilla=${SEED} programas=2000 compilaron=${ok25} semanticos-esperados(fuera=${fuera25}, largo=${largos25}) otros-errores=${err25-fuera25-largos25} excepciones=${excep25}`);


// ===== R2-25 fase B: hasta reunir 2000 programas que SÍ compilan (rechazo por simulación independiente) =====
let okB=0, intentosB=0, malB=0, pasosTot=0, maxPasos=0;
while(okB<2000){
  intentosB++; const limpio=R()<0.5; const b=genBloque(0,limpio?5:8,limpio); const sim=simula(b);
  if(sim.fuera||sim.instr>10000) continue;
  const txt=aTexto(b,estilo()); let r;
  try{ r=compilar(txt);}catch(e){ malB++; fb('R2-25B','excepción',{txt,e:String(e)}); continue; }
  if(r.error){ malB++; fb('R2-25B','error en programa que el simulador acepta',{txt,err:r.error.mensaje}); continue; }
  const f=r.estadoFinal; okB++;
  pasosTot+=r.pasos.length; maxPasos=Math.max(maxPasos,r.pasos.length);
  if(f.x!==sim.x||f.y!==sim.y||f.direccion!==nombreDir[sim.d]||f.color!==sim.col){ malB++; fb('R2-25B','estado final distinto',{txt,f,sim:{x:sim.x,y:sim.y,d:nombreDir[sim.d],c:sim.col}}); }
  const kp=Object.keys(r.casillasPintadas);
  if(kp.length!==sim.pintadas.size||kp.some(k=>sim.pintadas.get(k)!==r.casillasPintadas[k])){ malB++; fb('R2-25B','casillasPintadas distintas',{txt}); }
  if(r.pasos.filter(p=>p.accion==='mover').length!==sim.pasosMover){ malB++; fb('R2-25B','mover distinto',{txt}); }
  if(r.pasos.some(p=>p.accion==='mover'&&(p.x<0||p.x>9||p.y<0||p.y>9))){ malB++; fb('R2-25B','mover fuera',{txt}); }
}
console.log(`R2-25 fase B: compilados y comparados=${okB} (intentos de generación=${intentosB}) discrepancias=${malB} pasos medios=${(pasosTot/okB).toFixed(1)} máx=${maxPasos}`);
// R2-25 modo "largo": cerca del tope de 10000 (cuerpos de girar/pintar con repeticiones grandes)
let largoOK=0,largoErr=0,largoMal=0;
function genLargo(){ const rec=(p)=>{ const n=ri(1,3), o=[]; for(let i=0;i<n;i++){ if(p<3&&R()<0.5) o.push({t:'rep',n:ri(2,100),c:rec(p+1)}); else o.push(R()<0.5?{t:'gi',d:pick(['derecha','izquierda'])}:{t:'pi',c:pick(COL)}); } return o; }; return [{t:'rep',n:ri(2,100),c:rec(1)}]; }
for(let i=0;i<500;i++){
  const b=genLargo(); const sim=simula(b); const r=compilar(aTexto(b,estilo()));
  const esperaError=sim.instr>10000;
  if(esperaError){ if(r.error&&/demasiado largo/.test(r.error.mensaje)) largoErr++; else {largoMal++; fb('R2-25L','debía ser demasiado largo',{txt:aTexto(b,estilo()),instr:sim.instr,err:r.error&&r.error.mensaje});} }
  else { if(!r.error&&r.estadoFinal.direccion===nombreDir[sim.d]) largoOK++; else {largoMal++; fb('R2-25L','debía compilar',{instr:sim.instr,err:r.error&&r.error.mensaje});} }
}
console.log(`R2-25 modo largo (tope 10000, criterio: avanzar/girar/pintar=1 y cada vuelta de repetir=1): casos=500 compilan=${largoOK} rechazados-por-largo=${largoErr} discrepancias=${largoMal}`);

// ===== R2-26 basura =====
const pal=['avanzar','girar','pintar','repetir','veces','fin','derecha','izquierda','rojo','azul','verde','amarillo','negro',':','3','0','100','101','\n','\r\n','\t',' ','  '];
const chars='abcdefghijklmnopqrstuvwxyzáéíóúñÑÁ0123456789:.,;@#$%^&*()-+=_[]{}|\\/<>?"\'`~ \t\n\r¡¿€😀 \u0000 \ud83d';
let exc26=0, malForma=0, vacios26=0, ok26=0; const porFase={lexico:0,sintactico:0,semantico:0};
for(let i=0;i<2000;i++){
  let txt='';
  const modo=i%4;
  if(modo===0){ const n=ri(0,80); for(let j=0;j<n;j++) txt+=chars[ri(0,chars.length-1)]; }
  else if(modo===1){ const n=ri(0,40); for(let j=0;j<n;j++) txt+=pick(pal)+(R()<0.7?' ':''); }
  else if(modo===2){ // programa válido cortado
    const b=genBloque(0,6,false); const t=aTexto(b,estilo()); txt=t.slice(0,ri(0,t.length)); }
  else { // válido con trozos mutados
    const b=genBloque(0,6,false); let t=aTexto(b,estilo()); const m=ri(1,4); for(let j=0;j<m;j++){ const p=ri(0,t.length); const op=R(); if(op<0.4) t=t.slice(0,p)+t.slice(p+ri(1,3)); else if(op<0.8) t=t.slice(0,p)+pick(pal)+t.slice(p); else t=t.slice(0,p)+chars[ri(0,chars.length-1)]+t.slice(p);} txt=t; }
  let r; try{ r=compilar(txt);}catch(e){ exc26++; fb('R2-26','excepción',{txt:JSON.stringify(txt),e:String(e)}); continue; }
  if(r.error){ const e=r.error; porFase[e.fase]=(porFase[e.fase]||0)+1;
    if(!['lexico','sintactico','semantico'].includes(e.fase)||typeof e.mensaje!=='string'||!e.mensaje||typeof e.explicacion!=='string'||!e.explicacion||!Number.isInteger(e.linea)||e.linea<1) { malForma++; fb('R2-26','error mal formado',{txt:JSON.stringify(txt),e}); }
    // coherencia: la línea no pasa del número de líneas del texto
    const nl=txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').length;
    if(e.linea>nl) fb('R2-26','línea fuera de rango',{txt:JSON.stringify(txt),e});
    if(e.fase!=='semantico'&&(!Number.isInteger(e.columna)||e.columna<1)) fb('R2-26','columna inválida',{txt:JSON.stringify(txt),e});
    if(r.pasos!==null&&r.pasos!==undefined) fb('R2-26','hay pasos pese al error',{txt:JSON.stringify(txt)});
  } else { if(r.vacio) vacios26++; else ok26++; }
}
console.log(`R2-26: textos=2000 excepciones=${exc26} errores-mal-formados=${malForma} errores por fase=${JSON.stringify(porFase)} válidos=${ok26} vacíos=${vacios26}`);

// ===== R2-27 error sembrado =====
// Se parte de un programa válido (cuerpo plano + ciclos) y se siembra UN error en una línea conocida.
// Tipos: lexico (símbolo, palabra), sintactico (sin número, fin suelto, dos instr, repetir sin :), semantico (avanzar 0, repetir 0, repetir 101, salirse).
let ok27=0, mal27=0; const porTipo={};
function sembrar(){
  // construye líneas con una marca: lista de líneas ya formateadas con eol variable
  let b; do { b=genBloque(0,4,true); } while (simula(b).fuera);
  const sty=estilo(); sty.finalNL=R()<0.5;
  const L=render(b,sty,0,{base:0});
  // elegir línea de inserción
  const tipo=pick(['simbolo','palabra','sin_numero','fin_suelto','dos_instr','sin_dospuntos','avanzar0','repetir0','repetir101','fuera','sin_color','sin_dir']);
  let linea, texto;
  // cuántas líneas hay antes de insertar; el error ocurre en la línea insertada (insertamos al nivel superior: antes de una línea de nivel 0 o al final)
  const sitios=[]; { let prof=0; L.forEach((l,i)=>{ const t=l.trim().toLowerCase(); if(prof===0) sitios.push(i); if(/^repetir\b/.test(t)) prof++; else if(/^fin$/.test(t)) {prof--; } }); sitios.push(L.length); }
  const pos=pick(sitios);
  const ins={
    simbolo:'avanzar @3', palabra:'saltar 3', sin_numero:'avanzar', fin_suelto:'fin', dos_instr:'avanzar 1 girar derecha',
    sin_dospuntos:'repetir 2 veces', avanzar0:'avanzar 0', repetir0:'repetir 0 veces:\nfin', repetir101:'repetir 101 veces:\ngirar derecha\nfin',
    fuera:'avanzar 99', sin_color:'pintar', sin_dir:'girar'
  }[tipo];
  // Para 'repetir 2 veces' sin ':' y 'fin' sueltos no deben capturar líneas siguientes: 'repetir 2 veces' sin ':' falla en la misma línea.
  const insL=ins.split('\n');
  const nuevo=[...L.slice(0,pos),...insL,...L.slice(pos)];
  const linea1=pos+1;
  const faseEsp={simbolo:'lexico',palabra:'lexico',sin_numero:'sintactico',fin_suelto:'sintactico',dos_instr:'sintactico',sin_dospuntos:'sintactico',avanzar0:'semantico',repetir0:'semantico',repetir101:'semantico',fuera:'semantico',sin_color:'sintactico',sin_dir:'sintactico'}[tipo];
  return {txt:nuevo.join(sty.eol)+(sty.finalNL?sty.eol:''),tipo,linea1,faseEsp,L,pos};
}
for(let i=0;i<500;i++){
  const s=sembrar(); let r; try{r=compilar(s.txt)}catch(e){ mal27++; fb('R2-27','excepción',{txt:JSON.stringify(s.txt),e:String(e)}); continue;}
  porTipo[s.tipo]=porTipo[s.tipo]||{ok:0,mal:0};
  // un error semántico puede no ser el sembrado si el programa válido ya se sale o es largo antes: se valida solo si el prefijo es seguro
  const e=r.error;
  if(!e){ mal27++; porTipo[s.tipo].mal++; fb('R2-27','sin error',{txt:JSON.stringify(s.txt),tipo:s.tipo}); continue; }
  const faseOK = e.fase===s.faseEsp;
  const lineaOK = e.linea===s.linea1;
  if(faseOK&&lineaOK){ ok27++; porTipo[s.tipo].ok++; }
  else {
    // casos legítimos distintos: error semántico anterior por salida del tablero del programa base con 'fuera' etc.
    mal27++; porTipo[s.tipo].mal++; fb('R2-27','fase/línea distinta',{txt:JSON.stringify(s.txt),tipo:s.tipo,esperado:{fase:s.faseEsp,linea:s.linea1},obtenido:{fase:e.fase,linea:e.linea,msg:e.mensaje}});
  }
}
console.log(`R2-27: casos=500 coinciden(fase y línea)=${ok27} no-coinciden=${mal27} por tipo=${JSON.stringify(porTipo)}`);

// ===== R2-28 coherencia del código generado =====
let ok28=0, mal28=0, total28=0;
function expandirContarMover(b){ let n=0; for(const nd of b){ if(nd.t==='av') n+=nd.n; else if(nd.t==='rep') n+=nd.n*expandirContarMover(nd.c);} return n; }
while(total28<500){
  const b=genBloque(0,R()<0.5?5:7,R()<0.5); const sty=estilo(); const txt=aTexto(b,sty);
  const r=compilar(txt); if(r.error||r.vacio) continue; total28++;
  const ins=r.instrucciones; let bad=null;
  // pila de CONTAR para emparejar con VOLVER
  const st=[]; ins.forEach((x,i)=>{ if(x.op==='CONTAR') st.push(i); else if(x.op==='VOLVER'){ const c=st.pop(); if(c===undefined) bad='VOLVER sin CONTAR'; else if(x.arg!==c+1) bad=`VOLVER ${x.arg} en ${i} no apunta a ${c+1}`; } });
  if(st.length) bad='CONTAR sin VOLVER';
  // cuenta de ops vs. árbol propio
  const cuenta=(o)=>ins.filter(x=>x.op===o).length; const ctn=(bl,t)=>bl.reduce((a,nd)=>a+(nd.t===t?1:0)+(nd.t==='rep'?ctn(nd.c,t):0),0);
  if(cuenta('CONTAR')!==ctn(b,'rep')||cuenta('VOLVER')!==ctn(b,'rep')) bad=bad||'cantidad de CONTAR/VOLVER';
  if(cuenta('MOVER')!==ctn(b,'av')||cuenta('GIRAR')!==ctn(b,'gi')||cuenta('COLOR')!==ctn(b,'pi')) bad=bad||'cantidad de MOVER/GIRAR/COLOR';
  // argumentos CONTAR coinciden en orden con los repetir del texto
  const mv=r.pasos.filter(p=>p.accion==='mover').length; const esp=expandirContarMover(b);
  if(mv!==esp) bad=bad||`mover=${mv} esperado=${esp}`;
  const nc=r.pasos.filter(p=>p.accion==='contar').length, nv=r.pasos.filter(p=>p.accion==='volver').length;
  // expandido a mano: cuántas veces se ejecuta CONTAR y VOLVER
  const ejec=(bl,mult)=>bl.reduce((a,nd)=>nd.t==='rep'?a+mult+ejec(nd.c,mult*nd.n):a,0);
  const ejecV=(bl,mult)=>bl.reduce((a,nd)=>nd.t==='rep'?a+mult*nd.n+ejecV(nd.c,mult*nd.n):a,0);
  if(nc!==ejec(b,1)||nv!==ejecV(b,1)) bad=bad||`contar=${nc}/${ejec(b,1)} volver=${nv}/${ejecV(b,1)}`;
  // los pasos "volver": salta=true exactamente cuando quedan>0
  if(r.pasos.some(p=>p.accion==='volver'&&(p.salta!==(p.quedan>0)))) bad=bad||'volver.salta incoherente';
  // pc de cada paso en rango
  if(r.pasos.some(p=>!(p.pc>=0&&p.pc<ins.length))) bad=bad||'pc fuera de rango';
  if(bad){ mal28++; fb('R2-28',bad,{txt:JSON.stringify(txt)}); } else ok28++;
}
console.log(`R2-28: programas=500 coherentes=${ok28} incoherentes=${mal28}`);
console.log('RESUMEN FALLAS',JSON.stringify(resumen));
for(const f of falla.slice(0,12)) console.log(JSON.stringify(f).slice(0,700));
