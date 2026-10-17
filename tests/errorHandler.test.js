// PRUEBAS UNITARIAS del manejador central de errores: cada excepción -> su código HTTP,
// sin filtrar detalles internos al cliente.
const { ValidationError, ValidationErrorItem, ConnectionError } = require("sequelize");
const HttpError = require("../src/middleware/httpError");
const { errorHandler, notFound } = require("../src/middleware/errorHandler");

function respond(err) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  errorHandler(err, { method: "GET", originalUrl: "/api/incidentes" }, res, () => {});
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

test("un HttpError conserva su código y mensaje", () => {
  expect(respond(new HttpError(409, "Conflicto"))).toMatchObject({ status: 409, body: { error: "Conflicto" } });
});

test("una validación de Sequelize responde 400 con el detalle por campo", () => {
  const err = new ValidationError("x", [new ValidationErrorItem("El título es obligatorio.", "notNull Violation", "title")]);
  const { status, body } = respond(err);
  expect(status).toBe(400);
  expect(body.detalles).toEqual([{ campo: "title", mensaje: "El título es obligatorio." }]);
});

test("JSON mal formado responde 400", () => {
  expect(respond(Object.assign(new SyntaxError("x"), { type: "entity.parse.failed" })).status).toBe(400);
});

test("base de datos caída responde 503", () => {
  expect(respond(new ConnectionError(new Error("ECONNREFUSED"))).status).toBe(503);
});

test("un error inesperado responde 500 sin revelar el mensaje interno", () => {
  const { status, body } = respond(new Error("password authentication failed for user admin"));
  expect(status).toBe(500);
  expect(JSON.stringify(body)).not.toContain("password");
});

test("una ruta inexistente genera 404", () => {
  const next = jest.fn();
  notFound({ method: "GET", originalUrl: "/api/x" }, {}, next);
  expect(next.mock.calls[0][0].status).toBe(404);
});
