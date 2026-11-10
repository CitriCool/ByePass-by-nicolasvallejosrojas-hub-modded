# Sistema visual de ByePass

| Archivo | Responsabilidad |
| --- | --- |
| `web/tokens.css` | Paleta clara/oscura, tipografía, radios, espaciado y duración de transiciones. |
| `web/estilo.css` | Componentes funcionales: reloj, medallas, calendario y estados. Importa los tokens. |
| `web/sistema.css` | Controles y superficies compartidos, marca, cabeceras, foco y diálogos. |
| `web/sistema.js` | Selector de tema, página actual y salto al contenido; sin acceso a Firebase. |
| `web/paginas/<pagina>.css` | Composición de cada pantalla, identificada con `data-pagina`. |
| `web/portada.css` | Composición ilustrativa de la portada, con la paleta compartida. |
| `web/armador.css` | Búsqueda, edición y revisión de listas de cartas. |

## Paleta

Usa `--pagina` para el fondo, `--sup` para superficies y `--campo` para agrupaciones. `--texto`, `--apagado` y `--rotulo` definen jerarquía de lectura. Usa `--accion` con `--sobre-accion` en botones principales y `--accion-texto` en enlaces. Los estados usan `--negativo`/`--sobre-negativo` y `--ok`/`--sobre-ok`.

`--lila`, `--menta`, `--coral-suave` y `--amarillo-suave` distinguen contenido. Los QR conservan fondo blanco y el lienzo de torneo su base oscura. Las tiendas pueden seguir eligiendo su diseño. Colores de cartas, medallas y afiches no son necesariamente colores de marca.

Para ajustar la identidad global, cambia los tokens en ambos temas. Evita duplicar la paleta por página.

## Agregar una pantalla

1. Carga `estilo.css`, la composición de la vista y después `sistema.css`.
2. Identifica el cuerpo con `data-pagina="nombre"` y limita sus ajustes a ese selector.
3. Carga `tema.js` antes de pintar y `sistema.js` con `defer` si es una pantalla de aplicación.
4. Reutiliza `btn`, `btn primario` y `btn peligro`; conserva etiquetas, foco y estados deshabilitados.

La portada mantiene su composición propia. `tele.html` conserva una hoja autónoma compatible con navegadores antiguos. El lienzo del afiche conserva sus dimensiones de exportación, mientras su editor comparte el tema.

## Verificar

Con el entorno arrancado, ejecuta `npm.cmd run verify:ui` y `npm.cmd run verify` desde `tests`. Revisa también el navegador, claro y oscuro, teclado y móvil. Las comprobaciones automáticas no sustituyen la revisión visual ni todos los estados con datos.
