# Rediseño global de ByePass en tests

La identidad aprobada de la portada se extendió a las 20 pantallas de la aplicación. El mensaje principal presenta ByePass como una comunidad de juegos y torneos, sin exclusividad de Pokémon. El catálogo de cartas y los rulings conservan la identificación del juego al que pertenecen.

## Resultado

- Base crema y azul profundo, coral para acciones y amarillo, lila y menta para detalles.
- Temas claro y oscuro, marca, cabeceras, campos, botones, alertas y diálogos coherentes.
- Composiciones propias para cuentas, tiendas, muro, panel, estadísticas, herramientas, mazos, inscripciones, staff, rifas, documentos, afiches y vistas de torneo.
- Portada sin formularios en el contenido principal, con acceso mediante ventana de pestañas.
- Movimiento reducido, foco visible y salto al contenido que respeta las rutas por hash.
- CSS separado por responsabilidades. Consulta ESTILOS.md para mantener o ampliar el sistema.

## Verificación

- npm.cmd run verify:ui: 20 páginas y todas sus hojas locales accesibles; mensaje general sin exclusividad de un juego.
- npm.cmd run verify: integridad de los 61 archivos originales, emulador obligatorio, bloqueo de datos externos, operaciones CRUD y cuentas locales.
- Revisión en navegador de interfaces públicas y con la cuenta ficticia de organización, en claro y oscuro.
- Comprobación de ancho a 390 px, sin desplazamiento horizontal en los estados revisados.
- Inicio de sesión, navegación del panel, inicio y pausa del reloj ficticio y recepción de su estado en la vista moderna de torneo.
- Editor de mazos abierto sin guardar una lista, editor de afiches en escritorio y móvil, navegación de reglas y documentos.
- Se corrigió la detección de navegador del reloj: new Function confundía la CSP local con un navegador antiguo. La política local admite el transporte alternativo de Firebase únicamente desde el emulador local.

Los estados de inscripción y rifa sin evento muestran sus avisos de enlace incompleto; no se completaron inscripciones ni participaciones en rifas. Esta revisión no sustituye las pruebas completas de todos los flujos ni de las reglas de producción.

## Copias y alcance

La copia anterior completa está en data/before-global-ui/ y la portada anterior a la primera etapa en data/before-redesign/. Todo el trabajo corresponde a tests: el proyecto original y su base real no se modificaron.
