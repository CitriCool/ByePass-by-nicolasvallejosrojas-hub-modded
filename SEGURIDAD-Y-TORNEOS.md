# Seguridad y torneos: estado verificable

Todo lo implementado vive en `tests`. El original y la configuración de Firebase real permanecen intactos.

## Cambios

- `web/admin-publicacion.js` construye la actualización atómica del torneo y sus emparejamientos a partir del estado siguiente. Quitar la última ronda elimina la publicación en la misma escritura.
- El panel conserva un aviso local cuando no se confirma la publicación. Un timeout no libera el bloqueo de una escritura todavía en curso; el botón de comprobación relee el torneo antes de publicar.
- `web/inscripcion-datos.js` envía inscripción, plaza e índice de propietario juntos. No hay una reserva separada que pueda quedar huérfana si falla el perfil.
- El borrado de historial y sus IDs es atómico; errores en acciones de administración se muestran mediante `web/errores.js`. Los fallos de APIs opcionales dejan diagnóstico en consola.
- `admin.html` contiene la estructura; `admin-panel.js` conserva la coordinación de la interfaz y usa módulos independientes para publicación y errores. No se completó una separación por cada pestaña: aún existe lógica extensa en el coordinador.
- `npm.cmd run assets:version` calcula una versión global a partir del contenido. El inicio local lo ejecuta automáticamente. Ejecutarlo antes de preparar una entrega evita actualizar `?v=` a mano.
- El servidor comprime y conserva en memoria las representaciones de rulings, permite HTTP 304 por ETag y mantiene sin caché los datos y el resto de páginas de prueba. La lista ordenada de reglas se reutiliza al buscar.
- Se corrigió la lectura de rondas que Firebase devuelve como arreglos con posiciones nulas.

## Reglas reconstruidas: laboratorio separado

`firebase.sistema.json` usa `rules/sistema.rules.json`, Auth 9093, base 9003 y Functions 5003. No reemplaza las reglas permisivas del entorno de navegación (9000/9099).

Las reglas restringen perfiles, privilegios, miembros de tiendas, torneos, historial, jugadores, cupos e inscripciones. Una plaza solo se ocupa si está libre, existe, y coincide con la inscripción y el índice del usuario. Se prueban la última plaza concurrente, privacidad, anulación, cierre y escritura atómica.

**Son reglas candidatas, no una reconstrucción completa para publicar.** Los flujos de alta de tiendas, invitaciones de organizadores, salas anónimas, chat completo, mazos, insignias y otros nodos siguen requiriendo una matriz y pruebas específicas. Los nodos no definidos se rechazan. El navegador principal conserva reglas permisivas para que esa cobertura incompleta no rompa las pruebas de navegación; sus resultados no acreditan seguridad.

## Funciones locales

`functions/index.js` implementa tres disparadores reales del emulador: inscripción recibida, mensaje de staff y cambio de admisión. Generan avisos simulados en `notificaciones/<uid>`, con ID por evento y transacción para evitar duplicados. Se usa la misma instancia de base que originó el evento. Su inicio fuera del emulador está bloqueado.

No se envía correo SMTP ni FCM. No están recuperadas las funciones originales ni sus plantillas, proveedores, preferencias y secretos. El envío real requiere esa configuración y pruebas de entrega; no debe presentarse la simulación como envío real. Authentication continúa proporcionando sus enlaces de prueba para verificar correo y recuperar contraseña.

## Verificación

- `npm.cmd run test:registro`: 17 casos del registro.
- `npm.cmd run test:registro:emuladores`: 6 escenarios originales contra Auth y base.
- `npm.cmd run test:sistema`: 6 casos de publicación, notificaciones y arreglos de Firebase.
- `npm.cmd run test:sistema:emuladores`: 8 escenarios, incluyendo disparador de Functions y torneo de 4 jugadores hasta historial y borrado.
- `npm.cmd run verify`: integridad de los 61 originales, aislamiento, CRUD y cuentas locales.
- `npm.cmd run verify:ui`: recursos CSS de las 20 páginas.
- `npm.cmd run verify:entrega`: cabeceras de seis páginas, compresión y HTTP 304; medición de JSON en Node, no en teléfono.
- `node scripts/verificar-publicado.mjs`: consulta HEAD de dos páginas públicas; no consulta Firebase.

En navegador se creó «Verificación local» en tienda-test, con Ana de prueba y Bruno de prueba; se emparejó, anotó ganador y archivó correctamente. Ese torneo ficticio se conserva para revisar el resultado. Evidencia: `data/screenshots/sistema/torneo-archivado.png`.

Los reportes reproducibles están en `data/*verification.json`. La medición final de transferencia está en `data/entrega-verification.json`; es distinta de una medición de carga completa y capacidad de respuesta en un celular real.

## Alojamiento publicado

La consulta HEAD a https://byepass.cl/admin.html y https://byepass.cl/cuenta.html respondió 200 y no devolvió CSP, X-Frame-Options, nosniff, Referrer-Policy ni HSTS. Fecha y evidencia: `data/cabeceras-publicadas.json`. La protección de incrustación no queda acreditada por cabeceras HTTP. No se cambió el alojamiento.

`web/_headers` ya contiene políticas para Netlify. Para Cloudflare, configurar reglas de transformación de cabeceras de respuesta: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; en admin, cuenta, muro, staff, herramientas y estadísticas agregar `X-Frame-Options: DENY` y `Content-Security-Policy: frame-ancestors 'none'`. Si ya existe una CSP, integrar la directiva sin eliminar sus otras restricciones. HSTS requiere confirmar antes que todos los nombres cubiertos funcionan por HTTPS. No publicar el archivo config.js de pruebas ni sus reglas permisivas.

## Pendientes externos y límites

1. Completar la matriz de permisos de las funciones del sitio que el laboratorio aún rechaza; probar roles y casos negativos antes de promover reglas.
2. Configurar y probar envío real de correo y push cuando se disponga de proveedores y configuración. Revisar preferencias y destinatarios.
3. Aplicar las cabeceras en el alojamiento publicado y volver a ejecutar el comprobador.
4. Medir búsqueda y carga en un teléfono real. Compresión y tiempos de Node no certifican esa experiencia.
5. Seguir separando el coordinador del panel por pestañas y ampliar pruebas para acciones todavía no cubiertas. El torneo completo probado es suizo; no acredita todas las combinaciones de top cut, importación y edición simultánea de organizadores.

Referencias de diseño: [actualizaciones y reglas](https://firebase.google.com/docs/database/security/rules-conditions), [funciones locales](https://firebase.google.com/docs/functions/local-emulator).
