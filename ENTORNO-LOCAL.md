# ByePass: entorno local aislado

El rediseño global de las 20 pantallas está documentado en `REDISENO.md`. Para cambiar la paleta o agregar vistas, consulta `ESTILOS.md`. Puedes comprobar sus hojas de estilo con `npm.cmd run verify:ui`.

El registro recuperable y sus pruebas están documentados en `REGISTRO.md`. `ESTADO-ENTORNO.md` distingue los componentes disponibles de las reglas y funciones originales que todavía faltan.

Todo lo preparado para las pruebas está dentro de esta carpeta. El ZIP y los 61 archivos del proyecto original no se modificaron. `web/` es una copia independiente: los cambios que hagas ahí no pasan al original.

## Arrancar

Haz doble clic en `iniciar.cmd`, o abre PowerShell en esta carpeta y ejecuta:

```powershell
npm.cmd start
```

Espera a que aparezca `WEB LOCAL`. Abre:

- Web: http://127.0.0.1:8001
- Panel de emuladores: http://127.0.0.1:4000
- Administración de la tienda ficticia: http://127.0.0.1:8001/admin.html?sala=tienda-test

Los puertos 9000 y 9099 son para datos y autenticación. Todos los servicios se enlazan únicamente a 127.0.0.1. Si algún puerto está ocupado, el arranque falla en lugar de reutilizar otro servicio.

En otra terminal, carga los datos ficticios la primera vez:

```powershell
npm.cmd run seed
```

El seed conserva la tienda si ya existe; antes de escribir guarda una copia local en `data/backups/`.

| Cuenta | Correo | Contraseña |
| --- | --- | --- |
| Organizador y administrador local | organizador@example.test | PruebaLocal2026! |
| Jugador | jugador@example.test | PruebaLocal2026! |

Solo existen en el emulador. Las fechas de nacimiento, identidades y tienda son ficticias. Los correos se marcan como verificados localmente; no se envían mensajes reales.

## Detener y conservar datos

Presiona Ctrl+C en la terminal de arranque y espera a que Firebase termine de exportar. Se conserva Database y Authentication en `data/snapshot/`; el siguiente arranque los importa. No cierres la ventana a la fuerza: podrías perder cambios de esa sesión.

También puedes ejecutar `guardar.cmd` mientras los emuladores están abiertos para guardar una copia sin detenerlos.

## Importar una copia de la base real

Este entorno arranca con datos ficticios: NO se ha descargado la base original ni se dispone de sus reglas o usuarios.

Desde la consola de Firebase, una persona con acceso puede ir a Realtime Database, seleccionar la raíz de Datos y usar Exportar JSON. Guarda el archivo dentro de `imports/` (puedes crear esa carpeta). No uses Importar JSON en la consola de producción.

Con los emuladores arrancados, ejecuta:

```powershell
npm.cmd run import:database -- ".\imports\exportacion.json"
```

Este script solo conoce la URL fija `http://127.0.0.1:9000`: reemplaza la base LOCAL y guarda la anterior en `data/backups/`. No acepta una URL de destino. Una exportación de Realtime Database no contiene cuentas de Authentication ni reglas. Los UID de los usuarios de una copia real no coincidirán automáticamente con los de estas cuentas de prueba.

Los datos importados pueden contener información personal; `imports/`, `data/` y herramientas descargadas están excluidos de Git. No publiques esta carpeta.

## Aislamiento y límites

- Proyecto ficticio `demo-byepass`: no usa las claves ni identificadores del Firebase original.
- El emulador siempre está activado; `?emu=0` no lo puede desactivar.
- La CSP enviada por el servidor solo permite conexiones de datos al propio servidor y a los emuladores locales. Bloquea Firebase de producción, incluidas conexiones REST y WebSocket.
- Los enlaces cortos de `404.html` también consultan el emulador.
- El servidor no expone esta carpeta completa: únicamente `web/`. No instala el service worker de producción y deshabilita caché HTTP.
- No se utiliza `firebase login`, `deploy` ni credenciales de producción. Java y Firebase CLI son locales a esta carpeta.
- Se necesita internet para cargar los SDK desde gstatic, las fuentes y las imágenes de cartas; no es un entorno completamente offline.
- Las reglas locales permiten lectura/escritura para facilitar pruebas. NO reproducen las reglas reales: no validan cupos, roles ni seguridad de producción. Incluso podrían permitir comportamientos que producción rechazaría. Nunca desplegar estas reglas.
- Faltan las Cloud Functions originales; correos, notificaciones push y tareas del servidor no se reproducen. El código desactiva FCM en emulación.
- Para conservar el bloqueo de conexiones, utiliza `npm.cmd start`; no sirvas esta copia con otro servidor sin sus cabeceras.

## Verificación

Con servicios arrancados y seed cargado:

```powershell
npm.cmd run verify
```

Comprueba integridad del original, configuración forzada, cabeceras de aislamiento, endpoints locales, operaciones CRUD y acceso con las dos cuentas. Guarda resultados en `data/verification.json`. No es una prueba visual ni una validación integral de los torneos.

## Archivos principales

- `web/`: copia de la aplicación adaptada al entorno local.
- `firebase.json`: servicios y puertos locales.
- `database.rules.json`: reglas exclusivas de pruebas.
- `scripts/start.mjs`: arranque y restauración de datos.
- `scripts/server.mjs`: servidor web con CSP local.
- `scripts/data.mjs`: datos ficticios e importación JSON.
- `tools/`: Java portátil y componentes del emulador.
- `original-sha256.json`: huellas de los archivos originales.
- `package-lock.json`: versiones instaladas reproducibles.

Si faltan las dependencias Node, ejecuta `npm.cmd ci --cache .\.npm-cache`. Java 21 portátil está en `tools/java/`; el arranque lo detecta sin cambiar el PATH del sistema.

Estado de esta etapa y comandos: [Seguridad y torneos](SEGURIDAD-Y-TORNEOS.md).

Memorice Pokemon con cuenta y ranking local: [USABILIDAD.md](USABILIDAD.md). Requiere iniciar la web con npm.cmd start para disponer de su API; los puntajes se conservan en data/memoria, aparte de la exportacion del emulador.

Salta Magikarp: [MAGIKARP.md](MAGIKARP.md). Buscaminas entre rondas: [BUSCAMINAS.md](BUSCAMINAS.md). Los tres juegos guardan sus marcas en data/memoria, data/salto y data/minas.
