# Identidad de tiendas y espera entre rondas

Implementado exclusivamente en tests. El original y Firebase de producción no se modificaron.

## Identidad

En el panel, Tienda > Perfil público > Identidad de tu tienda permite subir PNG, JPG o WebP, extraer un color dominante, revisar la vista previa y ajustar el color antes de Guardar perfil. El logo sigue siendo opcional. Hay alternativa con iniciales.

Se admiten archivos de hasta 5 MB y 4096 píxeles por lado; se rasterizan y reducen hasta 384 píxeles para guardar una versión ligera de hasta 180.000 caracteres. Se ignoran transparencias y fondos casi blancos o negros al proponer el color, con respaldo para logos monocromáticos. La propuesta es editable y el texto de botones usa contraste claro u oscuro.

El color se aplica al perfil público, al panel y a los controles de la vista del torneo. El logo usa el nodo de fotos ya existente. La opción Aplicar también al diseño de este timer cambia su paleta, logo y versión de medios mediante la misma escritura del perfil. No reemplaza automáticamente los diseños de otros timers ni los fondos personalizados de afiches y calendarios. El alta de una tienda no se bloquea si todavía no tiene logo; se completa desde su perfil.

Las reglas candidatas del laboratorio incluyen lectura pública del logo y escritura restringida al dueño o administrador, con validación de formato y tamaño. La navegación principal mantiene las reglas permisivas ya documentadas. No se certifican los permisos de producción.

## Memorice Pokemon con cuenta y ranking

Esta etapa reemplaza el selector manual y las criaturas originales del piloto anterior. El juego reconoce la sesion de Firebase local, toma el nombre del perfil y vincula las marcas al UID autenticado. Para habilitarlo, el nombre del perfil debe coincidir con un jugador unico de la ultima ronda y tener resultado publicado. Si hay duplicados o el organizador uso otro nombre, no se ofrece elegir otra identidad: se debe corregir la vinculacion del perfil. Todavia falta un vinculo explicito por UID entre todos los formatos de torneos e inscripciones.

El tablero utiliza seis ilustraciones de cartas Pokemon del catalogo TCGdex ya usado por la web. Se verifico respuesta HTTP 200 para las seis imagenes. Son imagenes externas; se necesita conexion para cargarlas. Los nombres se mantienen como alternativa cuando una imagen falla. No se incorporaron sprites, musica ni recursos descargados de juegos comerciales.

### Puntajes y privacidad

El servidor local genera el tablero, revela solo las cartas correspondientes a cada movimiento, cuenta intentos y mide el tiempo. El cliente no envia puntos aceptados ni el UID a premiar: el servidor verifica el ID token con Authentication local. Otra cuenta no puede jugar una sesion ajena.

Formula: maximo entre 50 y 1000 menos 35 por cada intento sobre los seis minimos menos 2 por segundo. La partida vence a los 15 minutos. Se guarda la mejor marca, el contador de partidas completadas y las diez mas recientes. Reintentar el ultimo movimiento no duplica el historial. Las escrituras se serializan y se reemplaza el archivo de datos de forma atomica.

La marca personal se conserva sin publicarse. La casilla de ranking permite mostrar el nombre del perfil y la mejor marca a otras cuentas. Se puede desactivar sin perder la marca privada. El ranking muestra hasta veinte mejores marcas personales, ordenadas por puntos y luego tiempo. No se publican correo, token ni UID en sus respuestas. Solo las cuentas autenticadas pueden consultarlo.

### Persistencia local y despliegue

Los registros estan en tests/data/memoria/resultados.json, fuera de la carpeta web, indexados por UID del emulador. Persisten entre recargas y reinicios y no estan disponibles como archivo publico. No se guardan tokens ni contrasenas. Las sesiones de juego en curso viven en memoria y se pierden al reiniciar el servidor; una partida interrumpida no recibe puntuacion.

El archivo del ranking es independiente de la exportacion de Firebase. Debe respaldarse junto con los datos locales. No se escribe en la base de produccion ni se habilita escritura de puntuaciones desde el SDK del navegador. La navegacion principal conserva sus reglas permisivas anteriores, pero no controla este archivo privado.

Para publicar la funcion habra que desplegar un backend autenticado, almacenamiento adecuado y reglas de acceso equivalentes, migrar la persistencia y verificar autorizaciones de uso de imagenes. Un alojamiento solo estatico no ejecuta esta API. No se presenta este piloto como un sistema competitivo contra bots; el tablero en el servidor evita aceptar puntuaciones arbitrarias, pero no impide automatizar partidas.

### Comprobaciones de esta etapa

- npm.cmd run test:memoria: nueve casos de tablero, movimientos, tiempo, puntuacion y mejores marcas.
- npm.cmd run test:memoria:api: siete escenarios reales con Auth y base local, incluyendo partida completa, puntos y UID falsificados, acceso ajeno, reintentos, historial, preferencia publica y cierre de inscripciones de juego al retirarse el resultado. Las cuentas ficticias de la prueba se eliminan.
- Navegador: entrada con jugador@example.test, retorno al torneo, reconocimiento automatico del perfil, partida completa de 856 puntos y persistencia al volver a entrar. La marca ficticia queda como demostracion en el ranking local.
- Repeticion de partida tras cerrar y regreso al buscador con el nombre del perfil.
- Cartas y controles comprobados a 390 pixeles, sin desbordamiento horizontal en el estado revisado.
- Verificaciones de originales, aislamiento y CSS de veinte paginas aprobadas.

Prueba manual: http://127.0.0.1:8001/timer-view.html?sala=memoria-cuentas-demo#mesas con jugador@example.test o organizador@example.test y la contrasena ficticia documentada en ENTORNO-LOCAL.md. Ambas cuentas tienen resultado publicado en esa sala separada; no se modificaron los emparejamientos del torneo archivado anterior.

Archivos: web/espera.js (interfaz), web/memoria-pokemon.json (imagenes), scripts/memoria-motor.mjs (reglas del juego), scripts/memoria-api.mjs (cuentas y persistencia). Reporte de API en data/memoria-api-verification.json y capturas en data/screenshots/memoria-cuentas.

## Celebracion al completar el memorice

El resultado confirmado reemplaza visualmente el tablero por una pantalla de victoria con medalla, confeti breve, contador de puntos y resumen de intentos, tiempo y parejas. Se distingue la primera marca, una nueva mejor marca o la posicion publica cuando corresponde. La confirmacion de guardado sigue visible y se anuncia al lector de pantalla.

Los botones permiten jugar otra vez, volver al ranking o desplegar las parejas completadas. La celebracion cancela sus efectos al cerrar o empezar otra partida y respeta prefers-reduced-motion. No agrega sonido. Se comprobo con una partida completa de 857 puntos, revision de parejas, reinicio y vista de 390 pixeles sin desbordamiento horizontal. Capturas en data/screenshots/celebracion.
