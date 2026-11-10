# Registro y recuperación de cuentas

## Comportamiento

El registro comparte una misma implementación para la portada y la página de cuenta. Se comprueba el acceso a la beta antes de crear la identidad. El cambio de nombre de Auth y la escritura del perfil participan del mismo manejo de errores.

Si guardar falla definitivamente y el servidor confirma que no existe perfil, se intenta borrar únicamente la identidad que acaba de crearse. Se usa `deleteUser` del SDK modular, también en registros con invitación.

Una interrupción o timeout no demuestra que el guardado haya fallado. En ese caso se consulta el servidor sin usar el caché local: si el perfil está completo, el alta continúa; si no hay certeza, se conserva la cuenta y se ofrece recuperarla. Una respuesta perdida después del guardado no provoca la eliminación de una cuenta válida.

La recuperación usa el mismo UID. Puede reintentar una escritura todavía pendiente sin enviarla dos veces; conserva la fecha de alta y actualiza campos concretos, sin reemplazar las tiendas u otros IDs ya existentes. Si el perfil ya está completo, no lo sobrescribe.

Los datos necesarios para reanudar se guardan temporalmente en `sessionStorage`, por UID, y se eliminan al terminar. La lista de campos es explícita y excluye contraseñas y tokens. Si el almacenamiento del navegador no está disponible, la recuperación puede completarse manualmente al iniciar sesión.

La portada, la cuenta y el acceso directo al muro reconocen perfiles pendientes. Los ajustes permiten completar los datos; si el servidor no responde, se ofrece volver a comprobarlos antes de escribir. Las cuentas antiguas que guardaron el año de nacimiento siguen siendo reconocidas.

Los fallos al enviar la verificación de correo no revierten un perfil guardado. La cuenta permanece pendiente de verificar y el muro conserva su opción para reenviar el correo.

## Archivos

- `web/registro.js`: coordinación del alta, reversión y recuperación; independiente del SDK para inyectar fallos en pruebas.
- `web/sesion.js`: adaptador Firebase y confirmación del perfil mediante REST autenticado.
- `web/cuenta.html`: formulario de recuperación y comprobación de perfiles.
- `web/portada-auth.js` y `web/muro.html`: acceso de cuentas pendientes a la recuperación.
- `rules/registro.rules.json`: reglas restrictivas exclusivas del laboratorio de registro.
- `firebase.registro.json`: emuladores separados en puertos 9003/9093, proyecto ficticio `demo-byepass-registro`.

## Pruebas

```powershell
npm.cmd run test:registro
npm.cmd run test:registro:emuladores
npm.cmd run verify
npm.cmd run verify:ui
```

Hay 17 pruebas del coordinador con fallos inyectados y 6 escenarios contra Auth y Realtime Database reales en emulación. Cubren rechazo de reglas, errores de nombre, reversión fallida, respuesta perdida, datos pendientes tras recargar, concurrencia, cupo de invitación único, acceso a otro perfil y escritura de privilegios. La suite de emuladores arranca y detiene sus propias instancias desechables y limpia sus cuentas ficticias; no usa la base de navegación de los puertos 9000/9099.

En navegador se comprobó una cuenta ficticia sin perfil, el acceso directo al muro, la validación del formulario, la recuperación, la persistencia al recargar y un perfil parcial con IDs adicionales. Se conservaron UID, fecha de alta y datos adicionales. Los reportes se guardan en `data/`.

## Alcance pendiente

No se dispone de las reglas completas ni de las Cloud Functions originales. Estas reglas de laboratorio NO son una reconstrucción del sistema completo y no deben sustituir las reglas de producción. El entorno de navegación conserva sus reglas permisivas; la suite de registro tiene una configuración separada y restrictiva.

Para reproducir todo el sistema falta reconstruir y verificar permisos de tiendas, torneos e inscripciones y recuperar o reimplementar las funciones de correos y notificaciones. Estas pruebas no acreditan los permisos del sistema publicado ni todos los flujos de invitaciones de producción.

La confirmación utiliza el [mecanismo de autenticación REST de Realtime Database](https://firebase.google.com/docs/database/rest/auth); la reversión usa la [eliminación de usuarios del SDK de Authentication](https://firebase.google.com/docs/auth/web/manage-users).
