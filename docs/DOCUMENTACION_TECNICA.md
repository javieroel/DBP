# **DOCUMENTACIÓN TÉCNICA – PLATAFORMA DE GESTIÓN DE INCIDENTES DE CIBERSEGURIDAD**

| | |
|---|---|
| **Asignatura** | Desarrollo Basado en Plataformas – Unidad 8 (Reto 4) |
| **Estudiante** | Javier Elías Arteaga Pinargote |
| **Versión** | 2.0.0 |
| **Fecha** | 24/10/2026 |
| **URL de producción** | https://dbp-incidentes.onrender.com |
| **Repositorio** | https://github.com/javieroel/DBP |

> **Aviso para la revisión:** la plataforma usa el plan gratuito de Render. Si nadie la visita durante 15 minutos, el servicio se suspende y **la primera carga tarda cerca de un minuto** en despertar, mostrando la pantalla de abajo. Basta con esperar sin recargar; después responde con normalidad.

<p align="center">
    <img src="../assets/repo_images/render_arranque_en_frio.png" alt="Pantalla de carga de Render mientras el servicio despierta: solicitud detectada, servicio despertando, asignación de recursos y aplicación casi lista" style="width: 600px;">
    <br><em>Figura D0. Pantalla de Render mientras el servicio despierta.</em>
</p>

___

## 1. Problema y propósito

Una organización recibe reportes de incidentes de ciberseguridad por canales distintos (correo, chat, notas), incompletos y sin control de quién los consulta o modifica. La plataforma centraliza ese registro: permite **registrar, clasificar, dar seguimiento y cerrar incidentes**, con identidad verificada, permisos por rol, datos validados y persistentes, y trazabilidad de lo que ocurre en el servidor.

Usuarios previstos:

| Rol | Perfil | Puede |
|---|---|---|
| `admin` | Responsable del SOC | Todo: consultar, crear, cambiar estado, reemplazar y eliminar |
| `analista` | Analista del SOC | Consultar, crear y cambiar el estado |
| `lector` | Auditor | Solo consultar |

___

## 2. Arquitectura

La aplicación sigue una **arquitectura n-capas** con el patrón **MVC** tanto en el cliente como en el servidor. El mismo servicio Express entrega la interfaz (archivos estáticos) y la API REST, por lo que el navegador siempre habla con un único origen.

```mermaid
flowchart LR
    U[Usuario<br/>navegador] -- HTTPS --> R[Render<br/>proxy TLS]
    R -- HTTP interno --> A
    subgraph A[Servicio web: contenedor Docker]
        direction TB
        M1[Logs + id de solicitud] --> M2[Helmet / CORS / límite de tamaño / limpieza]
        M2 --> RT[Rutas]
        RT --> AU[auth: JWT + roles]
        AU --> C[Controladores]
        C --> S[Servicios<br/>reglas de negocio]
        S --> MO[Modelos Sequelize]
    end
    MO -- red privada --> DB[(PostgreSQL 16<br/>sin acceso público)]
    A -. /api/salud .-> R
```

| Capa | Componentes | Responsabilidad |
|---|---|---|
| Presentación | `index.html`, `css/styles.css`, `js/model.js`, `js/view.js`, `js/controller.js` | Interfaz semántica y accesible; MVC del cliente; envía el token en cada petición |
| Lógica / API | `app.js`, `src/routes`, `src/middleware`, `src/controllers`, `src/services` | Seguridad transversal, rutas REST, reglas de negocio |
| Datos | `src/models`, `migrations`, `seeders`, PostgreSQL | Persistencia, validaciones del modelo y restricciones `CHECK` en la base |

### 2.1 Entornos

Cada entorno usa **credenciales distintas**; ninguna credencial se comparte entre ellos ni se escribe en el código.

| Entorno | Dónde | Para qué | Cómo se configura |
|---|---|---|---|
| Desarrollo | PC del estudiante | Editar código, `npm test`, `npm run lint` | Archivo `.env` local (ignorado por Git) |
| Pruebas (staging) | Servidor Ubuntu propio, red local, Docker Compose | Probar cambios con datos de demostración antes de producción | `.env` del servidor (`chmod 600`) |
| **Producción** | **Render** (región Virginia) | URL pública evaluada | Variables del panel de Render, definidas en `render.yaml` |

**Decisión de seguridad:** producción se publicó en Render y **no** en el servidor propio porque este aloja otros servicios con información personal. Así el tráfico de internet nunca llega a la red doméstica: no se abrieron puertos ni se instalaron túneles.

___

## 3. Tecnologías y requisitos

| Componente | Tecnología |
|---|---|
| Entorno de ejecución | Node.js 22 (imagen `node:22-alpine`) |
| Servidor web / API | Express 4 |
| Base de datos | PostgreSQL 16 |
| ORM y migraciones | Sequelize 6 + sequelize-cli |
| Seguridad | jsonwebtoken (HS256), bcryptjs (12 rondas), helmet, cors, express-rate-limit |
| Rendimiento | compression (gzip/Brotli), índices `pg_trgm` |
| Calidad | Jest 30, ESLint 9 |
| Contenedores | Docker, Docker Compose |
| Hosting | Render (servicio web Docker + PostgreSQL administrado) |

Requisitos para desarrollar: Node.js 22 o superior y Git. Para levantar la base en local: Docker.

___

## 4. Estructura del proyecto

```
DBP/
├── app.js                    # arranque: middlewares, rutas, health check, apagado ordenado
├── index.html, css/, js/     # cliente (MVC: model.js, view.js, controller.js)
├── src/
│   ├── config/               # config.js (base por entorno, DATABASE_URL) · security.js (JWT, CORS, HTTPS)
│   ├── constants/            # valores permitidos y transiciones de estado
│   ├── controllers/          # leen la petición y responden
│   ├── services/             # reglas de negocio (incidentes, autenticación)
│   ├── models/               # Incident, User (Sequelize) y repositorio de incidentes
│   ├── middleware/           # auth, sanitize, logger, errorHandler, asyncHandler, httpError
│   ├── routes/               # /api/auth, /api/incidentes
│   ├── utils/log.js          # logs estructurados (JSON) con campos sensibles ocultos
│   └── db/sequelize.js       # pool de conexiones
├── migrations/               # 4 migraciones versionadas (up/down)
├── seeders/                  # usuarios por rol e incidentes de ejemplo (idempotentes)
├── tests/                    # 61 pruebas unitarias (Jest)
├── scripts/                  # pruebas.js (39 casos de integración), medir-consulta.js
├── reportes/                 # reportes de ESLint, Jest, mediciones y pruebas en producción
├── docs/                     # esta documentación y el manual de usuario
├── Dockerfile                # imagen única para staging y producción
├── docker-compose.yml        # entorno de pruebas (db, adminer, app, caddy)
├── render.yaml               # infraestructura de producción como código (Blueprint)
└── .env.example              # plantilla de variables SIN valores reales
```

___

## 5. Configuración por entorno

Toda la configuración se lee de variables de entorno. **Si falta un valor obligatorio, la aplicación se detiene antes de aceptar tráfico** con un mensaje claro (por ejemplo, `JWT_SECRET falta o es débil`).

| Variable | Obligatoria | Descripción | Producción (Render) |
|---|:-:|---|---|
| `DATABASE_URL` | Sí* | Cadena de conexión `postgresql://usuario:clave@host:puerto/base` | Generada por Render (URL interna) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Sí* | Alternativa a `DATABASE_URL` | — |
| `DB_SSL` | No | `true` si la base exige TLS | No aplica (red privada) |
| `JWT_SECRET` | Sí | Clave de firma de los tokens, mínimo 32 caracteres | Generada por Render (256 bits) |
| `JWT_EXPIRES_IN` | No | Vigencia del token | `1h` |
| `HTTPS_PROXY_ENABLED` | No | `true` detrás de un proxy HTTPS: activa HSTS e IP real del cliente | `true` |
| `TRUST_PROXY` | No | Cantidad exacta de proxies delante de la app (1 a 10; nunca `true`). Se calibra con el campo `xff` de los logs | `3` (medido en producción) |
| `CORS_ORIGINS` | No | Orígenes externos autorizados, separados por comas | Vacío (solo la propia interfaz) |
| `NODE_ENV` | No | `development` / `production` | `production` |
| `PORT` | No | Puerto de escucha | Lo asigna Render |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` | `info` |
| `SEED_ON_START` | No | Carga usuarios y datos de ejemplo al arrancar | `true` |
| `SEED_ADMIN_PASSWORD`, `SEED_ANALISTA_PASSWORD`, `SEED_LECTOR_PASSWORD` | Con `SEED_ON_START` | Contraseñas iniciales de los usuarios de prueba (mín. 10 caracteres) | Ingresadas en el panel; no están en el repositorio |

\* Se requiere `DATABASE_URL` **o** el grupo `DB_*`.

Reglas aplicadas:
- El archivo `.env` está en `.gitignore`; el historial de Git fue revisado y no contiene ninguna versión de `.env`.
- Solo se publica `.env.example`, con valores de ejemplo.
- Las evidencias muestran nombres de variables, nunca sus valores.

___

## 6. Instalación y ejecución

### 6.1 Desarrollo (PC)

```bash
git clone https://github.com/javieroel/DBP.git && cd DBP
cp .env.example .env              # completar valores propios
npm install
npm test                          # 61 pruebas unitarias (no requieren base)
npm run lint                      # análisis estático
# Con Docker disponible, levantar la base y la API:
docker compose up -d db adminer
npm run db:migrate && npm run db:seed
npm start                         # http://localhost:3000
```

### 6.2 Pruebas (servidor Ubuntu con Docker Compose)

```bash
cd ~/DBP && git pull
docker compose --profile full up -d --build      # migra al arrancar
docker compose --profile full ps
curl -i http://localhost:3000/api/salud
docker compose logs --tail=50 app
```

Con HTTPS local mediante Caddy: `docker compose --profile full --profile https up -d --build`.

### 6.3 Producción (Render)

La infraestructura está descrita en `render.yaml`:

1. Render → **New → Blueprint** → repositorio `javieroel/DBP`, rama `main`.
2. Ingresar `SEED_ADMIN_PASSWORD`, `SEED_ANALISTA_PASSWORD` y `SEED_LECTOR_PASSWORD`.
3. **Apply**: Render crea la base `dbp-incidentes-db` y el servicio `dbp-incidentes`, construye la imagen con el `Dockerfile`, aplica las migraciones, carga los datos iniciales y arranca la API.
4. Render solo envía tráfico cuando `/api/salud` responde `200`.

<p align="center">
    <img src="../assets/repo_images/render_servicios_desplegados.png" alt="Panel de Render con el servicio web desplegado y la base PostgreSQL 16 disponible en Virginia" style="width: 700px;">
    <br><em>Figura D2. Producción en Render: servicio web Docker y base PostgreSQL 16 en la misma región.</em>
</p>

Al arrancar, el contenedor ejecuta: `migraciones → seeders (si SEED_ON_START=true) → node app.js`. Si un paso falla, el servidor no arranca.

___

## 7. Modelo de datos

```mermaid
erDiagram
    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash "CHECK: empieza con $2 (bcrypt)"
        varchar role "CHECK: admin, analista, lector"
        timestamp created_at
        timestamp updated_at
    }
    INCIDENTS {
        int id PK "se presenta como INC-###"
        varchar title "5-120"
        text description "20-2000"
        varchar category "acceso, sistema, red, otro"
        varchar priority "alta, media, baja"
        varchar status "open, progress, closed"
        date date "no futura"
        varchar reporter "correo"
        varchar area "opcional"
        timestamp created_at
        timestamp updated_at
    }
```

| Migración | Cambio |
|---|---|
| `20261002000001-create-incidents` | Tabla `incidents` con restricciones `CHECK` |
| `20261002000002-add-filter-indexes` | Índices para filtros |
| `20261009000003-create-users` | Tabla `users`; `CHECK` de rol y de hash bcrypt |
| `20261017000004-optimize-incident-indexes` | Índices compuestos e índices de trigramas (`pg_trgm`) |

**Regla de negocio de estados:** `open → progress | closed`, `progress → open | closed`, `closed →` ninguno. Un incidente resuelto no se reabre (`409`); se registra uno nuevo.

___

## 8. API REST

Todas las respuestas son JSON. Los errores tienen la forma `{ "error", "detalles?", "ruta", "solicitud" }`, donde `solicitud` es el id que permite ubicar el evento en los logs.

| Método | Ruta | Acceso | Respuestas |
|---|---|---|---|
| `GET` | `/api/salud` | Público | `200` ok · `503` base sin conexión |
| `POST` | `/api/auth/login` | Público (límite 10 fallos / 15 min por IP) | `200` token · `400` · `401` · `429` |
| `GET` | `/api/auth/me` | Autenticado | `200` · `401` |
| `GET` | `/api/incidentes` | admin, analista, lector | `200` · `400` filtros inválidos · `401` |
| `GET` | `/api/incidentes/:id` | admin, analista, lector | `200` · `400` · `404` |
| `POST` | `/api/incidentes` | admin, analista | `201` · `400` · `403` |
| `PATCH` | `/api/incidentes/:id` | admin, analista | `200` · `400` · `403` · `404` · `409` |
| `PUT` | `/api/incidentes/:id` | admin | `200` · `400` · `403` · `404` · `409` |
| `DELETE` | `/api/incidentes/:id` | admin | `204` · `403` · `404` |

Filtros de `GET /api/incidentes`: `status`, `priority`, `category`, `q` (texto, máx. 100 caracteres), `limit` (1-100) y `offset`.

Ejemplo:

```bash
TOKEN=$(curl -s -X POST https://dbp-incidentes.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analista@incidentes.local","password":"<clave>"}' | jq -r .token)

curl -s "https://dbp-incidentes.onrender.com/api/incidentes?status=open&priority=alta" \
  -H "Authorization: Bearer $TOKEN"
```

___

## 9. Seguridad

Los controles se aplican en capas (defensa en profundidad). Se relacionan con las categorías de OWASP Top 10 revisadas en la Unidad 6.

| Riesgo | Control implementado | Dónde |
|---|---|---|
| Control de acceso roto (A01) | JWT obligatorio (`401`) y roles verificados en el servidor (`403`). El rol se lee de la base, no solo del token | `src/middleware/auth.js`, `src/routes/incidentRoutes.js` |
| Fallas criptográficas (A02) | HTTPS con certificado válido + HSTS; contraseñas con bcrypt (12 rondas) y `CHECK` que impide texto plano; JWT HS256 con emisor, audiencia y vencimiento de 1 h | Render, `app.js`, `src/services/authService.js` |
| Inyección (A03) | Consultas parametrizadas por Sequelize; limpieza de etiquetas HTML, caracteres de control y `__proto__`; escape en la vista; lista blanca de campos | `src/middleware/sanitize.js`, `src/constants/incident.js`, `js/view.js` |
| Diseño inseguro (A04) | Regla de transición de estados en el servicio; límite de intentos de login; cuerpo limitado a 10 kB | `src/services/incidentService.js`, `src/routes/authRoutes.js` |
| Configuración incorrecta (A05) | Cabeceras con Helmet (CSP, X-Frame-Options, nosniff, Referrer-Policy); `X-Powered-By` oculto; CORS restringido; la app no arranca con secretos débiles; base de producción sin acceso público (`ipAllowList: []`) | `app.js`, `src/config/security.js`, `render.yaml` |
| Fallas de identificación (A07) | Mismo mensaje para correo inexistente o clave incorrecta, con comparación contra un hash de relleno; se rechaza `alg: none`; el token se guarda en `sessionStorage` y se descarta al cerrar la pestaña o ante un `401` | `src/services/authService.js`, `js/model.js` |
| Registro y monitoreo (A09) | Logs JSON con id de solicitud; eventos de seguridad marcados (`seguridad.login_fallido`, `seguridad.acceso_denegado`, `seguridad.cors_bloqueado`); campos sensibles ocultos y correos enmascarados | `src/utils/log.js`, `src/middleware/logger.js` |

<p align="center">
    <img src="../assets/repo_images/cabeceras_seguridad_produccion.png" alt="Encabezados de respuesta de producción en DevTools: Content-Security-Policy con upgrade-insecure-requests, Strict-Transport-Security max-age=15552000, X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy no-referrer, X-Request-Id y contenido comprimido con Brotli" style="width: 650px;">
    <br><em>Figura D4. Cabeceras de seguridad en producción: CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy y X-Request-Id.</em>
</p>

Exposición de la información:
- Los errores internos (`500`) se registran completos en el servidor y el cliente solo recibe un mensaje genérico con el id de solicitud.
- El health check no revela tecnologías internas; muestra versión, entorno y estado de la base.
- Las respuestas de la API llevan `Cache-Control: no-store`.

___

## 10. Logs y monitoreo

### 10.1 Formato

Cada evento es una línea JSON. Esto permite filtrarlos en el panel de Render o con `grep`/`jq` en el servidor.

```json
{"time":"2026-10-24T23:57:15.036Z","level":"warn","msg":"login_fallido","event":"seguridad.login_fallido","reqId":"cb6dfc9e-…","email":"ad***@incidentes.local","ip":"…"}
```

| Nivel | Cuándo |
|---|---|
| `info` | Arranque, conexión a la base, solicitudes correctas, login correcto |
| `warn` | Errores del cliente (4xx), login fallido, acceso denegado, CORS bloqueado |
| `error` | Errores internos (5xx), base no disponible, promesas no controladas |

**Nunca se registran:** contraseñas, tokens, la cabecera `Authorization`, cuerpos de petición ni el texto de búsqueda (la ruta se guarda sin la consulta). Un filtro adicional oculta cualquier campo cuyo nombre parezca sensible (`password`, `token`, `secret`, `authorization`, `cookie`).

<p align="center">
    <img src="../assets/repo_images/logs_render_seguridad.png" alt="Logs de Render en JSON con eventos seguridad.login_fallido y seguridad.acceso_denegado, correo enmascarado y reqId compartido" style="width: 700px;">
    <br><em>Figura D5. Eventos de seguridad en los logs de producción.</em>
</p>

### 10.2 Trazabilidad de un error

Cada respuesta incluye la cabecera `X-Request-Id`, y los errores incluyen el campo `solicitud`. Si un usuario reporta un error, ese id se busca en los logs para encontrar la petición exacta, su código, duración y usuario.

### 10.3 IP del cliente detrás de proxies (hallazgo en producción)

Los logs de producción mostraron que un mismo usuario aparecía con IPs internas distintas, porque `trust proxy` estaba fijo en 1. Se agregó el campo `xff` (cantidad de entradas de `X-Forwarded-For`, nunca las IPs) y se midió **`xff: 3`**: Cloudflare más dos balanceadores de Render. Con `TRUST_PROXY=3`:

- los logs y el límite de intentos de login usan la IP real del cliente;
- una IP falsa enviada por el cliente en su propio `X-Forwarded-For` queda fuera de los saltos de confianza y se ignora;
- la aplicación no arranca si `TRUST_PROXY` vale `true` o está fuera de 1 a 10.

Si el proveedor cambia su infraestructura, el campo `xff` de los logs lo hará visible y bastará con ajustar la variable.

Verificado en producción: tras agregar `TRUST_PROXY=3` en el panel de Render, el log de un inicio de sesión fallido registró la IP pública del cliente en lugar de una `10.x` (Figuras P9 y P10 del README). Cambiar `render.yaml` **no** actualiza las variables de un servicio ya creado; hay que confirmarlas en el panel.

Los health checks correctos (`/api/salud` con `200`), que Render consulta cada 5 segundos, se registran en nivel `debug` para no tapar los eventos útiles.

### 10.4 Monitoreo

| Qué | Cómo |
|---|---|
| Disponibilidad | Render consulta `/api/salud`; si responde `503` (base caída) deja de enviar tráfico a la instancia |
| Errores y latencia | Cada solicitud registra `status` y `ms`; el panel **Metrics** de Render muestra solicitudes, tiempos y uso de recursos |
| Eventos de seguridad | Búsqueda de `seguridad.` en **Logs** de Render |
| Versión desplegada | `/api/salud` devuelve `version` y `commit` |

<p align="center">
    <img src="../assets/repo_images/salud_produccion.png" alt="Respuesta de /api/salud en producción: estado ok, versión 2.0.0, commit cec4c49, entorno production, base de datos conectada" style="width: 450px;">
    <br><em>Figura D3. /api/salud en producción: la versión y el commit permiten relacionar el despliegue con el código.</em>
</p>

Ejemplos de consulta en el servidor de pruebas:

```bash
docker compose logs app | grep '"event":"seguridad'           # eventos de seguridad
docker compose logs app | grep '"level":"error"'              # errores internos
docker compose logs app | grep '<id-de-solicitud>'            # rastrear un error reportado
```

___

## 11. Pruebas

| Tipo | Herramienta | Resultado |
|---|---|---|
| Unitarias | Jest (`npm test`, Figura P8 del README) | **61/61**, 4 suites, 90,3 % de sentencias en servicios, middlewares y utilidades |
| Análisis estático | ESLint (`npm run lint`) | **0 problemas** |
| Integración en producción | `scripts/pruebas.js` contra `https://dbp-incidentes.onrender.com` | **39/39** con el código HTTP esperado |
| Simulación de producción | PostgreSQL 16 local + variables de Render (sin `.env`) | Migraciones, seeders idempotentes, HSTS y 39/39 |
| Rendimiento (Unidad 7) | `npm run medir:consulta` | Búsqueda de 46,19 ms a 0,08 ms |

<p align="center">
    <img src="../assets/repo_images/pruebas_produccion_39.png" alt="Terminal con el script de pruebas contra producción: 39 de 39 pruebas con el código HTTP esperado" style="width: 700px;">
    <br><em>Figura D1. Pruebas de integración contra https://dbp-incidentes.onrender.com: 39/39.</em>
</p>

Casos de integración cubiertos: login correcto e incorrecto por rol; acceso sin token, con token falso, sin firma (`alg: none`) y con rol modificado; CRUD completo con los roles correctos; permisos insuficientes; datos inválidos, JSON mal formado y fecha futura; regla de no reabrir un resuelto (`409`); XSS en título y descripción; inyección SQL en la búsqueda; asignación masiva; CORS; eliminación y comprobación de `404`.

Suites unitarias:

| Archivo | Qué prueba |
|---|---|
| `tests/incidentService.test.js` | Transiciones de estado, formato `INC-###`, filtros, paginación y campos obligatorios |
| `tests/security.test.js` | Limpieza de entradas, tokens alterados y middlewares de autenticación y autorización |
| `tests/errorHandler.test.js` | Cada excepción con su código, sin revelar mensajes internos |
| `tests/operacion.test.js` | `DATABASE_URL`, variables obligatorias, logs sin datos sensibles, correo enmascarado e id de solicitud |

Reportes en `reportes/`: `pruebas-produccion.txt`, `jest-cobertura.txt`, `eslint-*.txt`, `medicion-*.txt`.

___

## 12. Despliegue, reversión y respaldo

### 12.1 Publicar una versión

1. En desarrollo: `npm test` y `npm run lint` sin errores.
2. Commit y etiqueta de versión (`git tag v2.0.0`), `git push --tags`.
3. Probar en el servidor de pruebas (`git pull` y `docker compose --profile full up -d --build`).
4. En Render: **Manual Deploy → Deploy latest commit**. Los despliegues automáticos están desactivados (`autoDeployTrigger: "off"`), así la versión evaluada no cambia sin registro.
5. Ventana de observación: revisar `/api/salud` (versión y commit esperados), los logs de error y ejecutar `npm run probar` contra producción.

### 12.2 Reversión

| Si falla | Acción |
|---|---|
| El código | Render → **Events** → **Rollback** al despliegue anterior estable |
| Una migración | `npx sequelize-cli db:migrate:undo` (cada migración tiene `down`), después revertir el código |
| La base | Restaurar el último respaldo (`pg_dump`) |

Revertir el código no revierte los datos. Por eso las migraciones se escriben compatibles hacia atrás y se respalda la base antes de cada cambio de esquema.

### 12.3 Respaldo

```bash
# Servidor de pruebas
docker compose exec -T db pg_dump -U incidentes_app -d incidentes_db > respaldo_$(date +%F).sql
# Producción: desde el panel de Render (Connect → External) o con la URL externa
```

___

## 13. Gestión de secretos e incidente registrado

Durante la preparación de esta entrega se detectó que una copia del `.env` de desarrollo, con la contraseña real de la base local, había sido incluida como material de contexto en una herramienta externa. El repositorio no estaba afectado (`git log --all -- .env` sin resultados). Se retiró el archivo, se reemplazó por la plantilla sin valores y se rotó la contraseña del usuario de la base en el servidor de pruebas, que volvió a responder `200` en `/api/salud`. El riesgo fue bajo, porque la base solo escucha en `127.0.0.1`, pero la credencial se trató como comprometida. Producción nació después con secretos nuevos generados por Render.

**Lección aplicada:** el `.env` no sale de la máquina que lo usa; para compartir configuración se usa `.env.example`.

___

## 14. Limitaciones y mejoras propuestas

| Limitación actual | Impacto | Mejora para un uso real |
|---|---|---|
| Plan gratuito de Render: suspensión tras 15 min sin tráfico | La primera carga tarda cerca de 1 min | Plan pago o servicio siempre activo |
| Base gratuita: expira a los 30 días y sin respaldos automáticos | Apta solo para datos de demostración | Base administrada con respaldos y recuperación a un punto en el tiempo |
| Alta de usuarios solo por seeder | No hay gestión de usuarios desde la interfaz | Módulo de administración de usuarios y restablecimiento de contraseña |
| Sin revocación de tokens antes de su vencimiento | Un token robado vale hasta 1 h | Tokens de acceso cortos + tokens de renovación revocables |
| Sin segundo factor de autenticación | Depende solo de la contraseña | MFA para admin y analista |
| Límite de intentos guardado en memoria | Se reinicia con el servicio y no se comparte entre instancias | Almacén compartido (Redis) |
| Logs en el proveedor con retención limitada | No hay historial largo ni alertas automáticas | Envío a un SIEM o servicio de logs con alertas por umbral |
| Sin registro de auditoría de cambios campo por campo | Se sabe quién hizo cada petición, no el valor anterior | Tabla de auditoría con antes y después |

Antes de tratar información institucional real harían falta, además, una política de clasificación y retención de datos, acuerdos de nivel de servicio, análisis de dependencias en CI y una prueba de penetración.

___

## 15. Historial de versiones

| Versión | Unidad | Cambios principales |
|---|---|---|
| 0.1 | 1 | HTML5 semántico, formulario accesible, CSS responsivo |
| 0.2 | 2 | JavaScript, validación dinámica, Fetch, ARIA, MVC del cliente |
| 0.3 | 3 | Servidor Node.js, `/api/salud`, arquitectura n-capas |
| 0.4 | 4 | Express, API REST, middlewares de log y errores |
| 1.0 | 5 | PostgreSQL, Sequelize, migraciones, Docker |
| 1.2 | 6 | JWT, roles, bcrypt, CORS, Helmet, HTTPS con Caddy |
| 1.3 | 7 | Jest, ESLint, rendimiento, refactorización MVC |
| **2.0.0** | **8** | **Producción en Render, configuración por entorno con `DATABASE_URL`, logs estructurados, health check con versión, apagado ordenado, seeders idempotentes, `TRUST_PROXY` configurable, 61 pruebas unitarias** |
