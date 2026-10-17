// PRUEBAS UNITARIAS de seguridad: limpieza de entradas, tokens JWT y permisos por rol.
const crypto = require("crypto");
const { cleanString, sanitizeBody } = require("../src/middleware/sanitize");

jest.mock("../src/services/authService", () => {
  const real = jest.requireActual("../src/services/authService");
  return { ...real, findUserById: jest.fn() };
});
const authService = require("../src/services/authService");
const { authenticate, authorize } = require("../src/middleware/auth");

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    const res = { set: jest.fn() };
    middleware(req, res, (error) => resolve(error));
  });
}

describe("Limpieza de entradas", () => {
  test("elimina bloques <script> y etiquetas HTML", () => {
    expect(cleanString('<script>alert("x")</script>Phishing <b>urgente</b>')).toBe("Phishing urgente");
  });

  test("elimina caracteres de control y espacios sobrantes", () => {
    expect(cleanString("  texto\u0007  ")).toBe("texto");
  });

  test("descarta __proto__ y no modifica la contraseña", () => {
    const req = { body: JSON.parse('{"__proto__": {"role": "admin"}, "password": " <Clave> 123 ", "title": " <i>t</i> "}') };
    sanitizeBody(req, {}, () => {});
    expect(Object.prototype.hasOwnProperty.call(req.body, "__proto__")).toBe(false);
    expect(req.body.password).toBe(" <Clave> 123 ");
    expect(req.body.title).toBe("t");
  });
});

describe("Tokens JWT", () => {
  const user = { id: 7, role: "analista", name: "Analista" };

  test("un token emitido por el servidor se verifica", () => {
    const payload = authService.verifyToken(authService.issueToken(user));
    expect(payload).toMatchObject({ sub: "7", role: "analista" });
  });

  test("un token con el rol modificado se rechaza", () => {
    const [h, p, s] = authService.issueToken(user).split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url")), role: "admin" })).toString("base64url");
    expect(() => authService.verifyToken(`${h}.${forged}.${s}`)).toThrow();
  });

  test('un token sin firma (alg "none") se rechaza', () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "1", role: "admin" })}.`;
    expect(() => authService.verifyToken(token)).toThrow();
  });

  test("un token firmado con otra clave se rechaza", () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "1", role: "admin" })}`;
    const sig = crypto.createHmac("sha256", "otra-clave").update(unsigned).digest("base64url");
    expect(() => authService.verifyToken(`${unsigned}.${sig}`)).toThrow();
  });
});

describe("Middleware authenticate", () => {
  test("sin encabezado Authorization responde 401", async () => {
    const error = await runMiddleware(authenticate, { get: () => undefined });
    expect(error.status).toBe(401);
  });

  test("con token válido carga el usuario desde la base", async () => {
    authService.findUserById.mockResolvedValue({ id: 7, name: "Analista", email: "a@x.ec", role: "analista" });
    const req = { get: () => `Bearer ${authService.issueToken({ id: 7, role: "analista", name: "Analista" })}` };
    const error = await runMiddleware(authenticate, req);
    expect(error).toBeUndefined();
    expect(req.user.role).toBe("analista");
  });
});

describe("Middleware authorize (roles)", () => {
  test("permite la acción a un rol autorizado", async () => {
    expect(await runMiddleware(authorize("admin", "analista"), { user: { role: "analista" } })).toBeUndefined();
  });

  test("responde 403 a un rol sin permiso", async () => {
    const error = await runMiddleware(authorize("admin"), { user: { role: "lector" } });
    expect(error.status).toBe(403);
  });
});
