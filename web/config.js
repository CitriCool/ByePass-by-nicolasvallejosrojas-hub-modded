/* ▌ÍNDICE de config.js (detalle y números de línea en MAPA-CODIGO.md, en la raíz del proyecto)
    1. Configuración de Firebase
    2. esc()
    3. Emulador
*/
// ====== CONFIGURACIÓN DE FIREBASE ======
// Proyecto: demo-byepass
// Estos valores NO son secretos: la seguridad real está en las reglas
// de la Realtime Database y en tu contraseña de organizador.
/* El Instagram de ByePass: a donde las tiendas escriben para que las verifiquemos (y salgan en el buscador de tiendas). Se usa
   en el panel, en la cuenta y en el aviso de «tienda aceptada» (avisotienda.js). Sin la @. */
const INSTAGRAM_BYEPASS = "byepasscl";

/* ▌BLOQUE 1 · Configuración de Firebase ═════════════════════════════════════════
   Las claves del proyecto (no son secretas: protege las reglas). */
const FIREBASE_CONFIG = {
  apiKey: "demo-byepass-local-key",
  authDomain: "demo-byepass.firebaseapp.com",
  databaseURL: "https://demo-byepass-default-rtdb.firebaseio.com",
  projectId: "demo-byepass",
  storageBucket: "demo-byepass.firebasestorage.app",
  messagingSenderId: "123456789000",
  appId: "1:123456789000:web:localtests"
};

/* ▌BLOQUE 2 · esc() ═════════════════════════════════════════════════════════════
   Escapa texto antes de meterlo en HTML. Global: la usan todas las páginas. */
// ====== ESCAPAR TEXTO ======
// Todo lo que escribe una persona (nombres del archivo del torneo, tiendas, mensajes) pasa por
// acá antes de ir a innerHTML. Una sola para todo el sitio: había una copia por
// página y ya no escapaban lo mismo (la mitad dejaba pasar la comilla simple).
// Va como función global, igual que FIREBASE_CONFIG, porque todas las páginas
// cargan este archivo antes que sus módulos. Sin flechas: la usa tele.html.
function esc(t){
  return String(t == null ? "" : t).replace(/[&<>"']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
  });
}

/* ▌BLOQUE 3 · Emulador ══════════════════════════════════════════════════════════
   Con ?emu=1 en localhost apunta al emulador local en vez de la base real. */
// ====== EMULADOR LOCAL ======
// Este archivo se publica, así que el emulador tiene que ser IMPOSIBLE de
// encender en producción: primero se exige que la página venga de localhost o
// de una IP de red privada. En github.io el parámetro ?emu=1 no hace nada.
//
// Se enciende con ?emu=1 y queda recordado en la pestaña; ?emu=0 lo apaga.
// Es explícito a propósito: adivinar por el nombre del host llevaría a creer
// que estás probando contra datos falsos cuando en realidad tocas producción.
//
// EMULADOR es null (apagado) o { host, auth, db }.
// Entorno de pruebas obligatorio: ?emu=0 NO puede desactivarlo.
if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
  throw new Error("Esta copia solo puede ejecutarse en localhost.");
}
const EMULADOR = Object.freeze({ host: "127.0.0.1", auth: 9099, db: 9000 });
document.documentElement.classList.add("entorno-local");


// ====== POLÍTICA DE SEGURIDAD (CSP) ======
// Dice de dónde pueden salir los scripts y con qué servidores puede hablar la
// página. Si algún día se colara código en una página, no podría cargar
// scripts de otro sitio ni mandar datos a otro servidor que Firebase.
// GitHub Pages no deja poner cabeceras, así que va como <meta>, puesta desde
// acá para que sea UNA para todas las páginas. Rige para lo que se carga
// después: los módulos de Firebase, las conexiones y las imágenes.
// Con el emulador no va: corre en la IP del computador (también desde el
// celular) y la política lo bloquearía.
if (!EMULADOR){
  var csp = document.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.firebaseio.com",
    "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com"
      + " https://identitytoolkit.googleapis.com https://securetoken.googleapis.com"
      + " https://fcmregistrations.googleapis.com https://fcm.googleapis.com https://firebaseinstallations.googleapis.com",   // avisos push
    "img-src 'self' data: blob: https://assets.tcgdex.net",   // las fotos de las cartas en el armador de mazos (no se guardan aquí)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "media-src 'self' data: blob:",
    "frame-src https://demo-byepass.firebaseapp.com",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'"
  ].join("; ");
  document.head.appendChild(csp);
}

// ====== ANTI-MARCO ======
// Las páginas con sesión no se dejan meter en un marco de otro sitio (clickjacking: engañar a alguien para que apriete
// un botón sin verlo). GitHub Pages no lee _headers, así que se hace acá: si la página está dentro de un marco, intenta
// salir de él y, si no puede, se esconde. El timer, el perfil de tienda y el widget sí se pueden incrustar.
if (window.top !== window.self && /\/(admin|cuenta|muro|herramientas|estadisticas|staff)(\.html)?$/.test(location.pathname)){
  document.documentElement.style.display = "none";
  try { window.top.location = window.self.location; } catch (e) {}
}

// ====== APP INSTALABLE ======
// El manifiesto (nombre e ícono al instalarla en el celular) y el ícono de la
// pestaña, puestos desde acá para que sean UNO para todas las páginas, igual
// que la política de arriba. sw.js es lo que la deja abrir sin señal.
["manifest:manifest.webmanifest", "icon:icono.svg", "apple-touch-icon:icono-apple.png"].forEach(function(x){
  var l = document.createElement("link"), p = x.split(":");
  l.rel = p[0]; l.href = p[1];
  document.head.appendChild(l);
});
if ("serviceWorker" in navigator) addEventListener("load", function(){
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
});

// Barra fija, para que nunca se confunda una sesión de prueba con la real.
if (EMULADOR) addEventListener("DOMContentLoaded", function(){
  var b = document.createElement("div");
  b.textContent = "PRUEBAS LOCALES · Base original aislada";
  b.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;"
    + "background:#1B2C49;color:#F5D270;font:600 11px/1.3 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;"
    + "letter-spacing:.05em;text-transform:uppercase;text-align:center;padding:7px 10px;"
    + "pointer-events:none;";
  document.body.appendChild(b);

  // Avisar AL CARGAR si el emulador esta encendido pero no hay nadie al otro
  // lado, en vez de dejar que se descubra recien al fallar un registro.
  //
  // El emulador de Auth responde su raiz con CORS abierto, asi que esta es una
  // peticion normal. Se intento con mode:"no-cors" y era peor: la respuesta es
  // JSON, el navegador la bloquea por ORB despues de recibirla y deja un
  // net::ERR_ABORTED en la consola en cada carga, aunque el emulador este
  // perfectamente arriba.
  //
  // No se mira el status: cualquier respuesta significa que hay alguien
  // escuchando. Solo el fallo de red -- el catch -- quiere decir que no esta.
  fetch("http://" + EMULADOR.host + ":" + EMULADOR.auth + "/", { cache: "no-store" })
    .catch(function(){
      b.textContent = "El entorno local no responde — ejecuta tests/iniciar.cmd";
      b.style.background = "#FF9F0A";
      b.style.color = "#0C0A22";
    });
});
