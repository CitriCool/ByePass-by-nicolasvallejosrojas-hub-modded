# Estado del entorno de pruebas

| Componente | Estado |
| --- | --- |
| Copia web, servidor y emuladores de navegación | Disponibles en tests, aislados del proyecto original. |
| Reglas completas originales de Firebase | No disponibles; confirmado por el usuario. |
| Cloud Functions originales | No disponibles. |
| Reglas permisivas de navegación | Solo facilitan pruebas funcionales; no validan seguridad. |
| Laboratorio restrictivo de registro | Configurado y probado aparte con firebase.registro.json. |
| Correos y push reales | Sin reproducir; faltan funciones y configuración originales. |
| Recuperación de cuentas incompletas | Implementada; detalles y pruebas en REGISTRO.md. |

No se cambió la configuración ni se publicaron reglas o funciones en Firebase real. El laboratorio nuevo no habilita acceso público: se enlaza exclusivamente a 127.0.0.1.

## Etapa de torneos y seguridad

Hay un segundo laboratorio restrictivo con reglas candidatas y tres funciones de notificación simulada. No sustituye la navegación permisiva ni certifica todos los permisos del sitio. Consulta [SEGURIDAD-Y-TORNEOS.md](SEGURIDAD-Y-TORNEOS.md) para pruebas y límites.
