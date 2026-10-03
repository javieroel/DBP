// PRUEBAS DE LA API: ejecuta casos correctos y casos de error contra el servidor.
// Uso: con el servidor encendido (npm start), en otra terminal: npm run probar
const BASE = process.env.API_URL || "http://localhost:3000";

const valid = {
  title: "Intento de acceso por fuerza bruta",
  description: "Se detectaron más de 200 intentos fallidos de inicio de sesión desde una misma IP en 5 minutos.",
  category: "acceso",
  priority: "alta",
  date: "2026-10-01",
  reporter: "soc@universidad.edu.ec",
  area: "Seguridad de la información"
};

async function call(method, path, body, raw) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = raw ? body : JSON.stringify(body);
  }
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

const results = [];
function check(name, expected, res, note = "") {
  const ok = res.status === expected;
  results.push({ ok, name, expected, got: res.status, note });
  const mark = ok ? "OK  " : "FALLA";
  console.log(`${mark} [${res.status}] ${name}${note ? " -> " + note : ""}`);
  if (!ok) console.log("      respuesta:", JSON.stringify(res.data));
}

function short(data) {
  if (data && data.detalles) return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join(" | ");
  if (data && data.error) return data.error;
  return "";
}

(async () => {
  console.log(`\n=== CASOS CORRECTOS (${BASE}) ===`);
  let r = await call("GET", "/api/salud");
  check("GET /api/salud", 200, r, `baseDatos: ${r.data && r.data.baseDatos}`);

  r = await call("GET", "/api/incidentes");
  check("GET /api/incidentes (listar)", 200, r, `${r.data.length} registros`);

  r = await call("GET", "/api/incidentes?status=open");
  check("Filtro por estado ?status=open", 200, r, `${r.data.length} registros, todos open: ${r.data.every((i) => i.status === "open")}`);

  r = await call("GET", "/api/incidentes?priority=alta");
  check("Filtro por prioridad ?priority=alta", 200, r, `${r.data.length} registros, todos alta: ${r.data.every((i) => i.priority === "alta")}`);

  r = await call("GET", "/api/incidentes?status=open&priority=alta");
  check("Filtro combinado estado + prioridad", 200, r, `${r.data.length} registros`);

  r = await call("POST", "/api/incidentes", valid);
  check("POST crear incidente válido", 201, r, `creado ${r.data.id}`);
  const id = r.data.id;

  r = await call("GET", `/api/incidentes/${id}`);
  check(`GET /api/incidentes/${id}`, 200, r, r.data.title);

  r = await call("PUT", `/api/incidentes/${id}`, { status: "progress", area: "SOC" });
  check(`PUT actualizar ${id}`, 200, r, `status=${r.data.status}, area=${r.data.area}`);

  r = await call("DELETE", `/api/incidentes/${id}`);
  check(`DELETE ${id}`, 204, r);

  r = await call("GET", `/api/incidentes/${id}`);
  check(`GET ${id} después de borrar`, 404, r, short(r.data));

  console.log("\n=== CASOS DE ERROR (deben ser rechazados) ===");
  r = await call("POST", "/api/incidentes", {});
  check("POST cuerpo vacío", 400, r, short(r.data));

  r = await call("POST", "/api/incidentes", { ...valid, reporter: "no-es-correo" });
  check("POST correo inválido", 400, r, short(r.data));

  r = await call("POST", "/api/incidentes", { ...valid, category: "malware" });
  check("POST categoría fuera de la lista", 400, r, short(r.data));

  r = await call("POST", "/api/incidentes", { ...valid, date: "2099-01-01" });
  check("POST fecha en el futuro", 400, r, short(r.data));

  r = await call("POST", "/api/incidentes", '{"title": "roto",', true);
  check("POST JSON mal formado", 400, r, short(r.data));

  r = await call("PUT", "/api/incidentes/INC-001", { status: "hackeado" });
  check("PUT estado no permitido", 400, r, short(r.data));

  r = await call("GET", "/api/incidentes?status=hackeado");
  check("Filtro con estado no permitido", 400, r, short(r.data));

  r = await call("GET", "/api/incidentes/abc");
  check("GET id con formato incorrecto", 400, r, short(r.data));

  r = await call("GET", "/api/incidentes/INC-999");
  check("GET id inexistente", 404, r, short(r.data));

  r = await call("DELETE", "/api/incidentes/INC-999");
  check("DELETE id inexistente", 404, r, short(r.data));

  r = await call("GET", "/api/no-existe");
  check("Ruta inexistente", 404, r, short(r.data));

  console.log("\n=== CASOS DE SEGURIDAD ===");
  r = await call("GET", "/api/incidentes?q=" + encodeURIComponent("' OR '1'='1"));
  check("Inyección SQL en búsqueda ?q=' OR '1'='1", 200, r, `${r.data.length} registros (debe ser 0: se trató como texto)`);

  r = await call("POST", "/api/incidentes", { ...valid, id: 1, createdAt: "2000-01-01" });
  check("Asignación masiva (envía id=1)", 201, r, `la base asignó ${r.data.id}; id del cliente ignorado`);
  if (r.status === 201) await call("DELETE", `/api/incidentes/${r.data.id}`);

  const passed = results.filter((x) => x.ok).length;
  console.log(`\nResultado: ${passed}/${results.length} pruebas con el código HTTP esperado.\n`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => {
  console.error("No se pudo ejecutar las pruebas. ¿Está encendido el servidor?", error.message);
  process.exit(1);
});
