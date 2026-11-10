# Prototipo de Salta Magikarp

Todo corresponde a tests. No se modifico la web ni Firebase de produccion.

## Jugar

En timer-view.html, Mesas > Jugar mientras espero > Salta, Magikarp. Requiere una cuenta con perfil que coincida con un jugador unico de la ronda y resultado publicado, igual que el memorice. La sala memoria-cuentas-demo permite probar con las dos cuentas ficticias del README.

Un lanzamiento y tres impulsos. En cada paso el indicador recorre una barra: tocar o activar el boton con Enter o Espacio cerca del centro coral mejora la precision. Se da un tiempo inicial para preparar la cana y una pausa entre impulsos. Si se deja pasar un paso, cuenta como precision cero; la aventura puede terminar igualmente. Cerrar el juego o cambiar de pestana del navegador abandona la partida sin guardar un resultado incompleto.

El servidor define el tiempo de cada paso y mide la recepcion de la solicitud antes de comprobar la cuenta y el contexto. La altura se calcula a partir de las cuatro precisiones; el cliente no puede enviar una altura valida ni elegir otro UID. Hay control de secuencias, reintentos y vencimiento de 90 segundos. La altura maxima de esta version es 100 metros. Es un prototipo de precision local; no hay compensacion de latencia para una competicion por internet ni proteccion completa contra bots.

## Cuenta y ranking

Mejor salto, contador de aventuras y las diez marcas recientes se conservan en data/salto/resultados.json. La API autentica con Firebase local; el archivo no es servido al navegador. El ranking optativo de veinte marcas es independiente del memorice y se puede abandonar sin borrar la marca personal. Los reintentos no duplican resultados y el tiempo final queda fijo.

No hay monedas, compras, mejoras de cana o estanque ni recompensas de torneo. El dibujo pixelado de Magikarp y el estanque se construyeron con SVG y CSS; no se agregaron descargas externas de imagenes o musica.

## Escritorio y telefono

Botones tactiles grandes, selector de juegos con teclado, controles nativos de boton y opcion de salir en cualquier momento. El dialogo tiene altura limitada, desplazamiento interno y cabecera fija. En telefonos horizontales se organiza en dos columnas para mantener indicador y boton visibles. Hay valores de respaldo vh para navegadores sin dvh. Las animaciones decorativas respetan movimiento reducido; el indicador de precision conserva el movimiento necesario para jugar.

Revisado en navegador a 1280 por 720, 390 por 844, 360 por 640 y 844 por 390. En las vistas de telefono comprobadas no hubo desbordamiento horizontal y los botones de accion y cierre permanecieron accesibles. Son comprobaciones de tamanos en el navegador de pruebas, no una certificacion en dispositivos fisicos ni en todos los navegadores.

## Verificacion

- npm.cmd run test:salto: ocho casos del motor.
- npm.cmd run test:salto:api: siete escenarios de cuenta, partida completa, privacidad, reintentos, ranking, nueva ronda y resultado retirado. Se usan un servidor temporal en 8002 y registros separados en data/salto-api-fixture; las marcas del usuario no se tocan.
- npm.cmd run verify, verify:ui y test:memoria: regresiones del entorno y del juego anterior.
- En navegador se probaron lanzamiento, saltos, expiracion de pasos, resultado guardado y una nueva ronda que cerro el juego y deshabilito su inicio. Los emparejamientos de demostracion se restauraron despues.

Capturas en data/screenshots/magikarp y reporte en data/salto-api-verification.json.

## Publicacion pendiente

El ranking sigue siendo local. Publicarlo requiere un backend y almacenamiento de produccion, revisar latencia y vincular jugadores de forma explicita por UID. La vinculacion actual de participacion usa el nombre del perfil, con rechazo de duplicados. Mantener los datos de juegos fuera de reglas permisivas y respaldar data/salto junto con los datos locales.
