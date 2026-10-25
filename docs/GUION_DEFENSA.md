# **GUION DE LA DEFENSA (≈10 minutos)**

Versión 2.0.0 · https://dbp-incidentes.onrender.com · Enfoque: ciberseguridad · Puntos 16.1 a 16.5

## Antes de grabar (checklist)

- [ ] Abrir https://dbp-incidentes.onrender.com **5 minutos antes**, para que el servicio esté despierto.
- [ ] Tener a mano las contraseñas de admin, analista y lector (sin mostrarlas en pantalla).
- [ ] Pestañas listas: 1) la plataforma, 2) `https://dbp-incidentes.onrender.com/api/salud`, 3) panel de Render → Logs.
- [ ] Borrar del listado cualquier incidente de prueba sobrante.
- [ ] Cerrar notificaciones, el gestor de contraseñas y cualquier ventana con el `.env`.
- [ ] **Plan B:** si Render no responde, mostrar el servidor de pruebas (`http://192.168.1.76:3000`) y explicar el diagnóstico (16.4 pide no ocultar un fallo).

## Guion por diapositiva

| Tiempo | Diapositiva | Qué decir (resumen; el texto completo está en las notas de cada diapositiva) |
|---|---|---|
| 0:00–0:30 | 1. Portada | Presentación, versión 2.0.0, URL y qué se va a cubrir |
| 0:30–1:30 | 2. Problema | Reportes dispersos y sin control de acceso; tres roles aplicados en el servidor |
| 1:30–2:30 | 3. Arquitectura | N-capas + MVC; cadena de middlewares; base sin acceso público; tres entornos |
| 2:30–3:30 | 4. Despliegue | Por qué Render y no el servidor propio: aislamiento de la información personal |
| 3:30–6:00 | 5. **Demo en vivo** | Analista crea (con error de validación) → filtra → cambia estado · Lector bloqueado · API sin token = 401 · Admin resuelve y elimina · Recargar = persistencia |
| 6:00–7:00 | 6. Seguridad | Defensa en profundidad por categoría OWASP |
| 7:00–7:45 | 7. Secretos | El incidente del `.env`: detección, alcance, respuesta, verificación |
| 7:45–8:30 | 8. Logs | Línea JSON, id de solicitud, eventos de seguridad, lo que nunca se registra, health check |
| 8:30–9:15 | 9. Pruebas | 39/39 en producción, 60 unitarias, ESLint 0; la anécdota del 32/39 |
| 9:15–9:45 | 10. Limitaciones | Plan gratuito, MFA, revocación, Redis, SIEM, auditoría |
| 9:45–10:15 | 11. Lecciones | Cuatro lecciones con ejemplos propios; siguiente paso: CI |
| 10:15–10:30 | 12. Cierre | Plan de retiro después de la nota; preguntas |

## Demo: pasos exactos (diapositiva 5)

1. **Analista** → iniciar sesión. Llenar el formulario con el correo `soc.ejemplo.com` (sin @): aparece el error junto al campo. Corregirlo a `soc@ejemplo.com` y guardar → aparece `INC-###` en estado **Abierto**.
2. Buscar por una palabra del título y filtrar prioridad **Alta** → **Ver detalle** → **Pasar a revisión**.
3. **Cerrar sesión** → entrar como **lector**: formulario bloqueado, sin botones de acción.
4. En la segunda pestaña abrir `https://dbp-incidentes.onrender.com/api/incidentes` → **401** en JSON, con el campo `solicitud`.
5. **Admin** → **Marcar resuelto** (explicar que ya no se puede reabrir: la API responde 409) → **Eliminar** → **Confirmar eliminación**.
6. Recargar la página (F5): los demás datos siguen ahí.

## Preguntas probables y respuestas cortas

**Arquitectura**
- *¿Por qué un solo servicio para la interfaz y la API?* Un solo origen: CORS estricto sin excepciones, menos superficie de ataque y un despliegue más simple. Separarlos tendría sentido con varios clientes.
- *¿Dónde está la lógica de negocio?* En `src/services/`. Los controladores solo leen la petición y responden, y los modelos solo consultan la base. Por eso las reglas se prueban sin base de datos.
- *¿Por qué PostgreSQL y no MongoDB?* Un incidente tiene una estructura fija, y una base relacional permite que la propia base rechace valores inválidos con `CHECK`, como segunda barrera.

**Seguridad**
- *¿Qué pasa si roban un token?* Vale hasta 1 hora y no se puede revocar antes. Es una limitación declarada; la mejora son tokens cortos con renovación revocable.
- *¿Por qué el rol se lee de la base si ya viene en el token?* Si se cambia o se elimina un usuario, el cambio aplica de inmediato y no cuando vence su token.
- *¿Por qué `sessionStorage` y no cookies?* Se borra al cerrar la pestaña y no se envía solo en cada petición, así que no hay CSRF. El riesgo es XSS, mitigado con CSP, limpieza de entradas y escape en la vista.
- *¿Cómo protege las contraseñas?* bcrypt de 12 rondas con sal, un `CHECK` en la base que impide texto plano, el mismo mensaje y el mismo tiempo si el correo no existe, y un límite de 10 intentos.
- *¿La base está expuesta?* No: `ipAllowList: []` en Render; solo la alcanza el servicio por la red privada.

**Pruebas**
- *¿Cómo sabe que funciona en producción y no solo en local?* El mismo script de 39 casos se ejecutó contra la URL pública (`reportes/pruebas-produccion.txt`).
- *¿Qué cubren las pruebas unitarias?* Reglas de estado, seguridad (tokens alterados y limpieza de entradas), el manejador de errores y, nuevo en esta unidad, la configuración y los logs.

**Limitaciones y operación**
- *¿Qué hace si un despliegue falla?* Render → Events → Rollback al despliegue anterior. Si el problema es una migración, `db:migrate:undo`, porque cada una tiene `down`.
- *¿Cómo encuentra un error que reporta un usuario?* Con el id de solicitud que muestra el error, buscándolo en los logs.
- *¿Qué haría antes de usarla con datos reales?* MFA, respaldos, un SIEM con alertas, una tabla de auditoría, análisis de dependencias en CI y una prueba de penetración.
