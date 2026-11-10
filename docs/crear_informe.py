from pathlib import Path
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
D=Document(); sec=D.sections[0];sec.page_height=Inches(11.7);sec.page_width=Inches(8.3);sec.top_margin=sec.bottom_margin=Inches(.72);sec.left_margin=sec.right_margin=Inches(.8)
for n in ['Normal','Title','Subtitle','Heading 1','Heading 2']:
 st=D.styles[n];st.font.name='Calibri';st.font.color.rgb=RGBColor(0,0,0)
D.styles['Normal'].font.size=Pt(11);D.styles['Normal'].paragraph_format.space_after=Pt(7);D.styles['Normal'].paragraph_format.line_spacing=1.08
D.styles['Title'].font.size=Pt(29)
D.styles['Heading 1'].font.size=Pt(20);D.styles['Heading 1'].paragraph_format.space_after=Pt(13)
D.styles['Heading 2'].font.size=Pt(13);D.styles['Heading 2'].paragraph_format.space_before=Pt(12)
D.core_properties.title='ByePass Informe de evolución y estado del proyecto';D.core_properties.author='ByePass';D.core_properties.subject='Estado inicial, decisiones, correcciones y pendientes al 9 de noviembre de 2026'
def p(t):D.add_paragraph(t)
def h(t):D.add_heading(t,2)
def page(t):D.add_page_break();D.add_heading(t,1)
def bullet(t):D.add_paragraph(t,style='List Bullet')
def table(headers,rows,widths):
 t=D.add_table(rows=1, cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 for c,w in zip(t.columns,widths):c.width=Inches(w)
 for c,v in zip(t.rows[0].cells,headers):c.text=v
 pr=t.rows[0]._tr.get_or_add_trPr();pr.append(OxmlElement('w:tblHeader'))
 for row in rows:
  for c,v in zip(t.add_row().cells,row):c.text=v
 for i,row in enumerate(t.rows):
  row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
  for j,c in enumerate(row.cells):
   c.width=Inches(widths[j]);c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   pr=c._tc.get_or_add_tcPr();sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'23354D' if i==0 else ('F1F4F7' if i%2 else 'FFFFFF'));pr.append(sh)
   borders=OxmlElement('w:tcBorders')
   for edge in ['top','left','bottom','right']:
    e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
   pr.append(borders)
   mar=OxmlElement('w:tcMar')
   for edge in ['top','left','bottom','right']:
    e=OxmlElement('w:'+edge);e.set(qn('w:w'),'100');e.set(qn('w:type'),'dxa');mar.append(e)
   pr.append(mar)
   for para in c.paragraphs:
    para.paragraph_format.space_after=Pt(3);para.paragraph_format.space_before=Pt(3)
    for r in para.runs:r.font.size=Pt(10);r.font.bold=i==0;r.font.color.rgb=RGBColor.from_string('FFFFFF' if i==0 else '000000')
 D.add_paragraph().paragraph_format.space_after=Pt(0)
D.add_paragraph('ByePass',style='Title');D.add_paragraph('Informe de evolución y estado del proyecto',style='Subtitle');p('9 de noviembre de 2026')
p('Este informe reúne el punto de partida de la web, las decisiones tomadas durante el trabajo, las mejoras implementadas y los asuntos que siguen abiertos. Su propósito es dejar un registro claro para continuar el desarrollo y preparar una futura publicación.')
p('El resultado principal es una copia local aislada en la carpeta tests, con una identidad visual renovada y correcciones probadas en el registro, las inscripciones y los torneos. Los 61 archivos originales conservan su contenido y no se modificó Firebase de producción.')
h('Qué había al principio')
p('El proyecto estaba disponible como una carpeta y un archivo ZIP. La web combinaba páginas HTML, CSS y JavaScript con Firebase para autenticación y datos. Incluía timer de torneo, emparejamientos, panel de organización, cuentas, muro, tiendas, calendario, historial, mazos y herramientas específicas de Pokémon.')
p('La primera revisión encontró que el entorno de prueba podía conectarse a Firebase real si el emulador no estaba activado. La página 404 también consultaba directamente la base original. No estaban incluidas las reglas de seguridad completas ni las Cloud Functions mencionadas por la aplicación; posteriormente se confirmó que no estaban disponibles.')
h('Problemas iniciales identificados')
bullet('Registro capaz de crear una identidad sin terminar de guardar el perfil y operaciones con errores silenciados.')
bullet('Guardado del torneo y publicación de emparejamientos en pasos separados, con riesgo de desincronización.')
bullet('Panel de unas 5.778 líneas y 352 KB, con interfaz y lógica concentradas; versiones de recursos actualizadas manualmente.')
bullet('Cabeceras dependientes del alojamiento y descarga de un JSON de reglas de aproximadamente 2,1 MB.')
page('Decisiones y evolución visual')
h('Trabajar sin afectar la base original')
p('Se discutió levantar la web localmente, duplicar los datos y usar los emuladores de Firebase. Se eligió una copia independiente dentro de tests, con proyecto ficticio y datos de prueba. La prioridad fue poder experimentar sin escribir en la base original.')
p('Una copia de Realtime Database no equivale a duplicar todo Firebase: los usuarios de Authentication, las reglas y las funciones son componentes separados. Se dejó un procedimiento para importar un JSON únicamente a la base local, con respaldo previo. No se descargó ni importó la base de producción durante el trabajo.')
h('Cambiar la identidad de la web')
p('Se planteó que la estética inicial era demasiado monocolor y no transmitía lo que buscaba el proyecto. Se reorganizaron colores, botones, animaciones y acceso a la cuenta. El ingreso y el registro pasaron a una ventana accesible desde un botón, fuera del contenido principal de la portada.')
p('La estética de la nueva portada fue aprobada y se extendió al proyecto. También se retiró el mensaje de exclusividad de Pokémon: ByePass se presenta como una comunidad de juegos y torneos, mientras que las herramientas propias de un juego conservan su identificación.')
bullet('Paleta crema y azul profundo, coral en las acciones y detalles amarillos, lilas y menta.')
bullet('Temas claro y oscuro, controles, formularios, alertas, cabeceras y diálogos coherentes.')
bullet('Sistema compartido de tokens y componentes, junto con estilos específicos de cada pantalla.')
bullet('Foco visible, salto al contenido, movimiento reducido y revisiones de ancho móvil en los estados comprobados.')
h('Alcance del rediseño')
p('Se adaptaron 20 pantallas. La revisión incluyó vistas públicas y del organizador, reloj, panel, mazos, afiches, reglas y documentos. La verificación de recursos CSS no equivale a comprobar todos los estados funcionales de cada pantalla.')
h('Entorno local disponible')
p('La web se abre en http://127.0.0.1:8001 y el panel de emuladores en http://127.0.0.1:4000. El arranque está preparado mediante tests/iniciar.cmd o npm.cmd start desde tests. Se conserva el estado local mediante exportación e importación de los emuladores.')
p('El emulador es obligatorio incluso sin parámetros o con ?emu=0. La configuración y las cabeceras locales bloquean conexiones de datos a producción; los enlaces cortos también usan el entorno local. Los SDK, fuentes e imágenes externas requieren internet.')
page('Correcciones funcionales realizadas')
h('Registro y recuperación de cuentas')
p('El registro ahora distingue un rechazo confirmado de una interrupción que deja el resultado incierto. Si el servidor confirma que no se guardó el perfil, se intenta eliminar únicamente la identidad recién creada. Si no hay certeza, se conserva la cuenta para permitir su recuperación.')
p('Una cuenta incompleta puede terminar sus datos usando el mismo usuario. Se conservan su identificador, fecha de creación y datos adicionales. Los datos temporales para reanudar excluyen contraseñas y tokens. Una respuesta perdida después de guardar no provoca el borrado de una cuenta válida.')
p('La portada, la cuenta y el acceso directo al muro reconocen perfiles pendientes. Se añadieron validaciones y una acción para completar la cuenta. Un fallo en el correo de verificación no revierte un perfil guardado correctamente.')
h('Inscripciones y cupos')
p('La inscripción, la plaza y el índice de propietario se escriben juntos. Las reglas candidatas del laboratorio exigen que una plaza exista, esté libre y coincida con la inscripción. La prueba concurrente del último cupo admitió exactamente una solicitud.')
p('También se comprobaron la privacidad frente a otros jugadores, el rechazo de privilegios falsos, la anulación que libera la plaza y el cierre de inscripciones. Estas garantías corresponden a los escenarios probados con reglas restrictivas, no a la navegación principal con reglas permisivas.')
h('Torneos y publicación')
p('El torneo y los emparejamientos públicos se actualizan en una única operación atómica. Si la confirmación queda pendiente, el panel mantiene un aviso y permite comprobar el estado. Una espera agotada no da por cancelada una escritura que sigue en curso.')
p('El borrado del historial y de sus IDs también se realiza conjuntamente. Se corrigió un error al leer rondas devueltas por Firebase como arreglos con posiciones nulas. Se probó un torneo suizo completo hasta su archivo.')
h('Errores y mantenimiento')
p('Las acciones administrativas corregidas muestran errores al usuario. Los fallos de operaciones opcionales dejan diagnóstico en consola. Esto mejora la visibilidad, aunque no significa que todas las operaciones tengan recuperación automática.')
p('La coordinación del panel se extrajo a admin-panel.js y se crearon módulos independientes para publicación y errores. Sigue pendiente dividir el coordinador por responsabilidades. La versión de recursos se calcula automáticamente a partir del contenido.')
page('Estado de los problemas originales')
p('Los estados siguientes distinguen una solución local comprobada de un cierre completo para producción. Una mejora parcial conserva tareas concretas pendientes.')
table(['Problema','Estado actual','Qué falta'],[
('Conexión accidental a producción','Resuelto en el entorno local preparado','Mantener el arranque con sus cabeceras; no publicar la configuración de pruebas.'),
('Reglas y funciones ausentes','Avance parcial','Completar permisos de todos los flujos y configurar servicios reales de mensajes.'),
('Cuentas incompletas','Registro recuperable probado','Verificar la adaptación con las reglas definitivas antes de publicar.'),
('Errores silenciados','Correcciones y diagnósticos incorporados','Ampliar cobertura de acciones y recuperación frente a fallos.'),
('Torneo y publicación separados','Escritura atómica probada','Ampliar pruebas de importación, top cut y edición simultánea.'),
('Panel extenso y versiones manuales','Refactorización parcial y versionado automático','Separar la lógica restante por pestaña o responsabilidad.'),
('Protección del navegador','Cabeceras locales verificadas','Aplicar y comprobar la configuración en el alojamiento publicado.'),
('JSON de reglas pesado','Compresión y reutilización de orden implementadas','Medir carga y respuesta en teléfonos reales.')],[1.53,2.08,3.09])
h('Tres entornos con alcances diferentes')
p('La navegación principal usa Auth 9099 y base 9000 con reglas permisivas para pruebas funcionales. El laboratorio de registro usa reglas restrictivas en puertos separados. El laboratorio del sistema incorpora reglas candidatas y Functions en el puerto 5003. Los dos laboratorios restrictivos se ejecutan por separado porque comparten puertos.')
p('Las reglas candidatas no están listas para sustituir las de producción. Los flujos todavía no definidos se rechazan. Las reglas permisivas de navegación tampoco deben desplegarse.')
h('Funciones de reemplazo locales')
p('Se implementaron tres disparadores del emulador: inscripción recibida, mensaje de staff y cambio de admisión. Generan avisos simulados con control de duplicados. Se comprobó el disparador de inscripción y se probaron reintentos del procesamiento de avisos. El inicio fuera del emulador está bloqueado; no hay envío real por correo o FCM.')
page('Pruebas y evidencia de los resultados')
table(['Conjunto','Casos','Cobertura principal'],[
('Registro unitario','17','Reversión, recuperación, confirmaciones inciertas y reintentos.'),('Registro con emuladores','6','Auth, reglas restrictivas, invitaciones y privacidad.'),('Sistema unitario','6','Publicación, avisos y arreglos de Firebase.'),('Sistema con emuladores','8','Cupos, permisos, función local y torneo completo.'),('Total automatizado','37','Casos aprobados en los cuatro conjuntos.')],[2.0,.55,4.15])
p('Además se comprobó la integridad de los 61 archivos originales, la obligatoriedad de los emuladores, las operaciones locales de lectura y escritura, las dos cuentas ficticias y los recursos CSS de 20 páginas. Las cabeceras locales se comprobaron en seis páginas con sesión.')
h('Prueba desde el navegador')
p('Se creó el torneo ficticio Verificación local en tienda-test, se incorporaron Ana de prueba y Bruno de prueba, se emparejó una ronda, se anotó el ganador y se archivó. El torneo se conservó para revisar el resultado.')
img=Path('tests/data/screenshots/sistema/torneo-archivado.png')
if img.exists():
 para=D.add_paragraph();para.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=para.add_run();r.add_picture(str(img),width=Inches(4.7));
 docpr=r._r.xpath('.//wp:docPr')[0];docpr.set('descr','Torneo local archivado con su tabla y confirmación de publicación')
p('Evidencia visual del torneo ficticio completado y archivado en el entorno local.')
page('Pendientes y continuidad del proyecto')
h('Permisos y cobertura de seguridad')
p('Completar la matriz de permisos y sus pruebas para alta de tiendas, invitaciones de organizadores, salas anónimas, chat completo, mazos, insignias y demás nodos. Las reglas originales no están disponibles; las candidatas requieren validación integral antes de cualquier promoción.')
h('Correos y notificaciones reales')
p('Definir proveedores, configuración, plantillas, preferencias y destinatarios. Configurar los secretos necesarios y probar entrega, fallos y reintentos. Los avisos simulados actuales permiten comprobar parte de la lógica, pero no certifican el envío real.')
h('Protección del sitio publicado')
p('La consulta pública mediante HEAD del 9 de noviembre de 2026 encontró respuestas 200 para admin.html y cuenta.html sin CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ni HSTS. El informe de esa consulta se conserva localmente. No se modificó el alojamiento.')
p('Falta aplicar las cabeceras en el alojamiento efectivo y repetir la comprobación. El archivo _headers contiene políticas para Netlify; la configuración debe adaptarse al servicio utilizado. HSTS requiere confirmar el funcionamiento HTTPS de los nombres que cubrirá.')
h('Rendimiento y mantenimiento')
p('El JSON pasó de 2.116.050 bytes a 421.643 bytes transferidos con Brotli, aproximadamente un 80 % menos. La medición local incluyó 1.947 registros. La compresión y los tiempos de Node no sustituyen una medición de carga y búsqueda en un celular real.')
p('Queda por separar el coordinador del panel, ampliar pruebas de importación y top cut y comprobar la edición simultánea de organizadores. La revisión visual tampoco cubre todas las combinaciones de datos y pantallas.')
h('Orden recomendado para continuar')
p('Primero completar permisos y escenarios críticos; luego configurar mensajes reales y cabeceras; después medir en dispositivos reales y realizar una revisión integral de publicación. La promoción debe llevar los cambios seleccionados, con la configuración correcta y un plan de respaldo, sin copiar las reglas permisivas ni las claves ficticias del entorno de pruebas.')
h('Documentación y reportes de consulta')
p('Dentro de tests: README.md explica el entorno; REDISENO.md y ESTILOS.md describen la identidad visual; REGISTRO.md detalla recuperación y pruebas; SEGURIDAD-Y-TORNEOS.md reúne las correcciones recientes y sus límites. Los reportes de verificación, mediciones y capturas están en tests/data.')
p('Estado de cierre: las mejoras están implementadas y verificadas dentro de su alcance local. La publicación, la seguridad completa y los servicios reales conservan los pendientes indicados en este informe.')
out=Path('tests/documentos/ByePass_Informe_de_evolucion_y_pendientes.docx');D.save(out);print(out.resolve())
