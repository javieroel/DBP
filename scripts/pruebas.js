// PRUEBAS DE LA API (Unidad 6): funcionamiento, autenticación, autorización, validación y CORS.
// Uso: con el servidor encendido -> npm run probar
//      contra otro servidor       -> API_URL=http://IP:3000 npm run probar
//      contra producción          -> API_URL=https://<servicio>.onrender.com npm run probar
// Credenciales: ADMIN_PASSWORD, ANALISTA_PASSWORD y LECTOR_PASSWORD, o en su defecto las SEED_*_PASSWORD
// del .env. No hay contraseñas escritas en el código: el repositorio es público.
require("dotenv").config({ quiet: true });
const crypto = require("crypto");

const BASE = process.env.API_URL || "http://localhost:3000";
const PASSWORDS = {
  admin: process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD,
  analista: process.env.ANALISTA_PASSWORD || process.env.SEED_ANALISTA_PASSWORD,
  lector: process.env.LECTOR_PASSWORD || process.env.SEED_LECTOR_PASSWORD
};
const missingPasswords = Object.entries(PASSWORDS).filter(([, value]) => !value).map(([role]) => role);
if (missingPasswords.length) {
  console.error(`Faltan las contraseñas de: ${missingPasswords.join(", ")}. Defina ADMIN_PASSWORD, ANALISTA_PASSWORD y LECTOR_PASSWORD.`);
  process.exit(1);
}

const valid = {
  title: "Intento de acceso por fuerza bruta",
  description: "Se detectaron más de 200 intentos fallidos de inicio de sesión desde una misma IP en 5 minutos.",
  category: "acceso",
  priority: "alta",
  date: "2026-10-01",
  reporter: "soc@universidad.edu.ec",
  area: "Seguridad de la información"
};

async function call(method, path, { body, token, raw, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = raw ? body : JSON.stringify(body);
  }
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}

// Fabrica un JWT "falso" con la librería estándar de Node (sin conocer la clave real)
function forgeToken(header, payload, secret) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(payload)}`;
  if (!secret) return `${unsigned}.`;
  const signature = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

const results = [];
function check(name, expected, res, note = "") {
  const ok = res.status === expected;
  results.push(ok);
  console.log(`${ok ? "OK   " : "FALLA"} [${res.status}] ${name}${note ? " -> " + note : ""}`);
  if (!ok) console.log("      respuesta:", JSON.stringify(res.data));
}
const msg = (data) =>
  data && data.detalles ? data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join(" | ") : (data && data.error) || "";

(async () => {
  const tokens = {};

  console.log(`\n=== 1. AUTENTICACIÓN (${BASE}) ===`);
  check("GET /api/salud es pública", 200, await call("GET", "/api/salud"));
  for (const role of ["admin", "analista", "lector"]) {
    const r = await call("POST", "/api/auth/login", { body: { email: `${role}@incidentes.local`, password: PASSWORDS[role] } });
    check(`Login correcto de ${role}`, 200, r, r.data && r.data.user ? `rol=${r.data.user.role}, token emitido` : "");
    tokens[role] = r.data && r.data.token;
  }
  let r = await call("GET", "/api/auth/me", { token: tokens.analista });
  check("GET /api/auth/me con token", 200, r, r.data && r.data.user && r.data.user.email);
  r = await call("POST", "/api/auth/login", { body: { email: "admin@incidentes.local", password: "clave-incorrecta" } });
  check("Login con contraseña incorrecta", 401, r, msg(r.data));
  r = await call("POST", "/api/auth/login", { body: { email: "noexiste@incidentes.local", password: "lo-que-sea" } });
  check("Login con correo inexistente (mismo mensaje)", 401, r, msg(r.data));
  r = await call("POST", "/api/auth/login", { body: { email: "no-es-correo", password: "x" } });
  check("Login con datos inválidos", 400, r, msg(r.data));

  console.log("\n=== 2. ACCESO SIN TOKEN O CON TOKEN FALSO ===");
  r = await call("GET", "/api/incidentes");
  check("GET incidentes sin token", 401, r, msg(r.data));
  r = await call("POST", "/api/incidentes", { body: valid });
  check("POST incidente sin token", 401, r, msg(r.data));
  r = await call("GET", "/api/incidentes", { token: "abc.def.ghi" });
  check("Token mal formado", 401, r, msg(r.data));
  const claims = { role: "admin", sub: "1", iss: "dbp-incidentes", aud: "dbp-incidentes-web", exp: Math.floor(Date.now() / 1000) + 3600 };
  r = await call("DELETE", "/api/incidentes/INC-001", { token: forgeToken({ alg: "HS256", typ: "JWT" }, claims, "clave-del-atacante") });
  check("Token firmado con otra clave (rol admin falso)", 401, r, msg(r.data));
  r = await call("DELETE", "/api/incidentes/INC-001", { token: forgeToken({ alg: "none", typ: "JWT" }, claims) });
  check('Token sin firma (alg "none")', 401, r, msg(r.data));
  const [h, p, s] = tokens.lector.split(".");
  const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url")), role: "admin" })).toString("base64url");
  r = await call("DELETE", "/api/incidentes/INC-001", { token: `${h}.${tampered}.${s}` });
  check("Token de lector modificado a rol admin", 401, r, msg(r.data));

  console.log("\n=== 3. CRUD CON PERMISOS CORRECTOS ===");
  r = await call("GET", "/api/incidentes?status=open&priority=alta", { token: tokens.lector });
  check("Lector consulta y filtra incidentes", 200, r, `${r.data.length} registros`);
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: valid });
  check("Analista crea incidente", 201, r, r.data && r.data.id);
  const id = r.data && r.data.id;
  r = await call("GET", `/api/incidentes/${id}`, { token: tokens.lector });
  check(`Lector consulta ${id}`, 200, r);
  r = await call("PATCH", `/api/incidentes/${id}`, { token: tokens.analista, body: { status: "progress" } });
  check(`Analista cambia estado de ${id} (PATCH)`, 200, r, `status=${r.data && r.data.status}`);
  r = await call("PUT", `/api/incidentes/${id}`, { token: tokens.admin, body: { ...valid, title: "Fuerza bruta contenida en el SOC", status: "closed" } });
  check(`Admin reemplaza ${id} (PUT)`, 200, r, r.data && r.data.title);

  console.log("\n=== 4. PERMISOS INSUFICIENTES ===");
  r = await call("POST", "/api/incidentes", { token: tokens.lector, body: valid });
  check("Lector intenta crear", 403, r, msg(r.data));
  r = await call("PATCH", `/api/incidentes/${id}`, { token: tokens.lector, body: { status: "open" } });
  check("Lector intenta cambiar estado", 403, r, msg(r.data));
  r = await call("PUT", `/api/incidentes/${id}`, { token: tokens.analista, body: valid });
  check("Analista intenta reemplazar (PUT)", 403, r, msg(r.data));
  r = await call("DELETE", `/api/incidentes/${id}`, { token: tokens.analista });
  check("Analista intenta eliminar", 403, r, msg(r.data));

  console.log("\n=== 5. DATOS INVÁLIDOS Y LIMPIEZA DE ENTRADAS ===");
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: {} });
  check("Cuerpo vacío", 400, r, `${r.data && r.data.detalles ? r.data.detalles.length : 0} campos rechazados`);
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: { ...valid, reporter: "no-es-correo", category: "malware" } });
  check("Correo y categoría inválidos", 400, r, msg(r.data));
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: { ...valid, date: "2099-01-01" } });
  check("Fecha en el futuro", 400, r, msg(r.data));
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: '{"title": "roto",', raw: true });
  check("JSON mal formado", 400, r, msg(r.data));
  r = await call("PATCH", `/api/incidentes/${id}`, { token: tokens.analista, body: { status: "open" } });
  check("Reabrir incidente resuelto (regla de negocio)", 409, r, msg(r.data));
  r = await call("GET", "/api/incidentes/abc", { token: tokens.lector });
  check("Identificador con formato incorrecto", 400, r, msg(r.data));
  r = await call("GET", "/api/incidentes/INC-999", { token: tokens.lector });
  check("Incidente inexistente", 404, r, msg(r.data));
  r = await call("POST", "/api/incidentes", {
    token: tokens.analista,
    body: { ...valid, title: '<script>alert("xss")</script>Phishing con enlace', description: '<img src=x onerror=alert(1)>Correo con adjunto malicioso reportado.' }
  });
  const xssId = r.data && r.data.id;
  check("XSS en título y descripción", 201, r, `guardado: "${r.data && r.data.title}" (sin etiquetas)`);
  r = await call("GET", "/api/incidentes?q=" + encodeURIComponent("' OR '1'='1"), { token: tokens.lector });
  check("Inyección SQL en la búsqueda", 200, r, `${r.data.length} registros (se trató como texto)`);
  r = await call("POST", "/api/incidentes", { token: tokens.analista, body: { ...valid, id: 1, createdAt: "2000-01-01" } });
  const massId = r.data && r.data.id;
  check("Asignación masiva (envía id=1)", 201, r, `la base asignó ${massId}`);

  console.log("\n=== 6. CORS ===");
  r = await call("GET", "/api/salud", { headers: { Origin: "http://sitio-malicioso.example" } });
  check("Petición desde un origen no autorizado", 403, r, msg(r.data));
  r = await call("GET", "/api/salud", { headers: { Origin: new URL(BASE).origin } });
  check("Petición desde el origen de la propia interfaz", 200, r, `Access-Control-Allow-Origin: ${r.headers.get("access-control-allow-origin")}`);

  console.log("\n=== 7. ELIMINACIÓN (solo admin) ===");
  for (const target of [id, xssId, massId].filter(Boolean)) {
    r = await call("DELETE", `/api/incidentes/${target}`, { token: tokens.admin });
    check(`Admin elimina ${target}`, 204, r);
  }
  r = await call("GET", `/api/incidentes/${id}`, { token: tokens.admin });
  check(`${id} ya no existe`, 404, r);

  const passed = results.filter(Boolean).length;
  console.log(`\nResultado: ${passed}/${results.length} pruebas con el código HTTP esperado.\n`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error("No se pudo ejecutar las pruebas. ¿Está encendido el servidor?", error.message);
  process.exit(1);
});
