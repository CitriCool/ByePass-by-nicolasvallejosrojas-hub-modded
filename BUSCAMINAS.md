# Buscaminas entre rondas

Todo corresponde a tests. No se modificó la web ni Firebase de producción.

## Jugar

En timer-view.html, Mesas > Jugar mientras espero > Buscaminas. Igual que el memorice y Salta, Magikarp, requiere una cuenta cuyo nombre de perfil coincida con un jugador único de la ronda y con resultado publicado. La sala memoria-cuentas-demo permite probar con las cuentas ficticias del README.

Campo de pasto alto de 6 × 6 con seis Voltorb escondidos (las minas). Las casillas abiertas son un sendero de tierra y cada número aparece dentro de un Rattata, que indica cuántos Voltorb hay alrededor. Las marcas son Poké Balls (seis como máximo). Al ganar, los Voltorb aparecen atrapados en Poké Balls; al perder, el que explotó se destaca. Los dibujos de Voltorb, Rattata y Poké Ball son SVG propios, sin sprites de los juegos.

La primera casilla y sus vecinas siempre son seguras: las minas se siembran en el servidor después del primer toque. Los botones Explorar y Poké Ball eligen la acción al tocar; en escritorio también sirve el clic derecho y la tecla F. Las flechas mueven el foco por el campo. Cerrar, cambiar de pestaña o empezar una ronda nueva abandona la partida sin guardar.

## Puntaje y servidor

El servidor guarda el campo y las minas; el navegador solo recibe las casillas abiertas y sus números. Al terminar, el servidor calcula la duración y los puntos: máximo entre 100 y 1000 menos 3 por segundo. Perder no suma puntos ni reemplaza la mejor victoria, pero cuenta como partida. Cada movimiento lleva número de secuencia: reintentar el último movimiento no lo duplica. La partida vence a los 15 minutos.

## Cuenta y ranking

Mejor victoria, contador de partidas y las diez más recientes se conservan en data/minas/resultados.json, indexadas por UID. El ranking optativo de veinte marcas es independiente del de los otros juegos y se puede abandonar sin perder la marca personal. No se publican correo, token ni UID.

## Escritorio y teléfono

Revisado en navegador a 390 × 844, 844 × 390 y 1280 × 720, sin desbordamiento horizontal. En teléfonos horizontales el campo pasa a la izquierda y los controles a la derecha. Las animaciones respetan movimiento reducido.

## Verificación

- npm.cmd run test:minas: ocho casos del motor.
- npm.cmd run test:minas:api: nueve escenarios de cuenta, privacidad, banderas, reintentos, victoria, ranking, derrota, nueva ronda y resultado retirado. Usa un servidor temporal y data/minas-api-fixture.
- Navegador: partidas ganadas y perdidas, guardado de la marca y cierre del diálogo.

Capturas en data/screenshots/buscaminas y reporte en data/minas-api-verification.json.

## Publicación pendiente

Como los otros juegos, el ranking es local: publicarlo requiere un backend autenticado y almacenamiento de producción. La vinculación con el torneo usa el nombre del perfil; falta un vínculo explícito por UID.
