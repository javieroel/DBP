// PRUEBAS UNITARIAS de operación (Unidad 8): configuración por entorno, logs seguros e id de solicitud.
const log = require("../src/utils/log");
const { requestLogger } = require("../src/middleware/logger");

function loadConfig(env) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  let config;
  jest.isolateModules(() => {
    config = require("../src/config/config").production;
  });
  process.env = saved;
  return config;
}

describe("Configuración por entorno", () => {
  test("DATABASE_URL se descompone en host, puerto, base, usuario y clave", () => {
    const config = loadConfig({ DATABASE_URL: "postgresql://app_user:cl%40ve@db.interno:6543/incidentes_db" });
    expect(config).toMatchObject({
      host: "db.interno",
      port: 6543,
      database: "incidentes_db",
      username: "app_user",
      password: "cl@ve"
    });
  });

  test("sin puerto en DATABASE_URL se usa 5432 (formato de la URL interna de Render)", () => {
    expect(loadConfig({ DATABASE_URL: "postgresql://u:p@dpg-abc-a/base" }).port).toBe(5432);
  });

  test("una DATABASE_URL mal escrita detiene el arranque con un mensaje claro", () => {
    expect(() => loadConfig({ DATABASE_URL: "no-es-una-url" })).toThrow(/DATABASE_URL no tiene un formato válido/);
  });

  test("si falta una variable obligatoria la aplicación no arranca", () => {
    expect(() => loadConfig({ DATABASE_URL: "", DB_PASSWORD: "" })).toThrow(/Faltan variables de entorno: DB_PASSWORD/);
  });
});

describe("Confianza en el proxy (TRUST_PROXY)", () => {
  function loadSecurity(value) {
    const saved = { ...process.env };
    process.env.TRUST_PROXY = value;
    let security;
    try {
      jest.isolateModules(() => {
        security = require("../src/config/security");
      });
    } finally {
      process.env = saved;
    }
    return security;
  }

  test("acepta un número exacto de saltos", () => {
    expect(loadSecurity("3").trustProxyHops).toBe(3);
  });

  test("rechaza true y valores fuera de rango: la app no arranca", () => {
    expect(() => loadSecurity("true")).toThrow(/TRUST_PROXY/);
    expect(() => loadSecurity("0")).toThrow(/TRUST_PROXY/);
    expect(() => loadSecurity("50")).toThrow(/TRUST_PROXY/);
  });
});

describe("Logs estructurados y seguros", () => {
  let output;
  beforeEach(() => {
    output = [];
    for (const method of ["log", "warn", "error"]) {
      jest.spyOn(console, method).mockImplementation((line) => output.push(JSON.parse(line)));
    }
  });
  afterEach(() => jest.restoreAllMocks());

  test("cada evento es una línea JSON con fecha, nivel y mensaje", () => {
    log.warn("prueba", { reqId: "abc" });
    expect(output[0]).toMatchObject({ level: "warn", msg: "prueba", reqId: "abc" });
    expect(new Date(output[0].time).toString()).not.toBe("Invalid Date");
  });

  test("los campos con nombre sensible nunca se escriben", () => {
    log.info("prueba", { password: "secreta", token: "eyJ...", authorization: "Bearer x", userId: 7 });
    expect(output[0]).toMatchObject({ password: "[oculto]", token: "[oculto]", authorization: "[oculto]", userId: 7 });
    expect(JSON.stringify(output[0])).not.toMatch(/secreta|eyJ|Bearer/);
  });

  test("el correo se enmascara en los intentos de inicio de sesión", () => {
    expect(log.maskEmail("analista@incidentes.local")).toBe("an***@incidentes.local");
    expect(log.maskEmail("<script>")).toBe("[correo no válido]");
  });

  test("cada solicitud recibe un id de seguimiento y un 403 se marca como evento de seguridad", () => {
    const handlers = {};
    const req = { get: () => undefined, method: "DELETE", originalUrl: "/api/incidentes/3?x=1", ip: "1.2.3.4" };
    const res = { statusCode: 403, set: jest.fn(), on: (event, fn) => (handlers[event] = fn) };
    const next = jest.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.set).toHaveBeenCalledWith("X-Request-Id", req.id);

    handlers.finish();
    expect(output[0]).toMatchObject({ level: "warn", reqId: req.id, status: 403, path: "/api/incidentes/3", event: "seguridad.acceso_denegado" });
  });

  test("se registra cuántos proxies hay en X-Forwarded-For, pero nunca sus IPs", () => {
    const handlers = {};
    const headers = { "X-Forwarded-For": "203.0.113.7, 10.0.0.1, 10.0.0.2" };
    const req = { get: (h) => headers[h], method: "GET", originalUrl: "/api/salud", ip: "203.0.113.7" };
    const res = { statusCode: 200, set: jest.fn(), on: (event, fn) => (handlers[event] = fn) };
    requestLogger(req, res, () => {});
    handlers.finish();
    expect(output[0].xff).toBe(3);
    expect(JSON.stringify(output[0])).not.toContain("10.0.0.1");
  });

  test("un id de solicitud recibido con formato inválido se reemplaza", () => {
    const req = { get: () => "<inyeccion>\n", method: "GET", originalUrl: "/", ip: "x" };
    const res = { statusCode: 200, set: jest.fn(), on: () => {} };
    requestLogger(req, res, () => {});
    expect(req.id).not.toContain("<");
  });
});
