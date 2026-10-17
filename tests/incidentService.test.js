// PRUEBAS UNITARIAS de las reglas de negocio de incidentes (Jest).
// El modelo se reemplaza por un "mock": no se usa la base de datos.
jest.mock("../src/models/incidentModel", () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
}));

const incidentModel = require("../src/models/incidentModel");
const service = require("../src/services/incidentService");

beforeEach(() => jest.clearAllMocks());

describe("Regla de transición de estados", () => {
  test.each([
    ["open", "progress"],
    ["open", "closed"],
    ["progress", "open"],
    ["progress", "closed"],
    ["closed", "closed"]
  ])("permite pasar de %s a %s", (from, to) => {
    expect(service.canChangeStatus(from, to)).toBe(true);
  });

  test("rechaza reabrir un incidente resuelto (closed -> open)", () => {
    expect(service.canChangeStatus("closed", "open")).toBe(false);
  });

  test("assertStatusChange lanza 409 al reabrir un resuelto", () => {
    expect(() => service.assertStatusChange("closed", "progress")).toThrow(
      expect.objectContaining({ status: 409 })
    );
  });

  test("assertStatusChange ignora estados inexistentes (los rechaza el modelo con 400)", () => {
    expect(() => service.assertStatusChange("open", "hackeado")).not.toThrow();
  });
});

describe("Identificador INC-###", () => {
  test("acepta INC-005 y 5", () => {
    expect(service.parseId("INC-005")).toBe(5);
    expect(service.parseId("5")).toBe(5);
  });

  test.each(["abc", "INC-", "-1", "1 OR 1=1"])("rechaza %p con 400", (raw) => {
    expect(() => service.parseId(raw)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("Filtros de búsqueda", () => {
  test("aplica valores por defecto de paginación", () => {
    expect(service.parseFilters({})).toEqual({ limit: 100, offset: 0 });
  });

  test("conserva filtros válidos", () => {
    expect(service.parseFilters({ status: "open", priority: "alta", q: " phishing " })).toMatchObject({
      status: "open",
      priority: "alta",
      q: "phishing"
    });
  });

  test("rechaza un estado fuera de la lista", () => {
    expect(() => service.parseFilters({ status: "borrado" })).toThrow(expect.objectContaining({ status: 400 }));
  });

  test.each([["0"], ["101"], ["abc"]])("rechaza limit=%s", (limit) => {
    expect(() => service.parseFilters({ limit })).toThrow(expect.objectContaining({ status: 400 }));
  });

  test("rechaza búsquedas de más de 100 caracteres", () => {
    expect(() => service.parseFilters({ q: "x".repeat(101) })).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("Cuerpo de la petición", () => {
  test("traduce email del formulario a reporter", () => {
    expect(service.normalizeBody({ email: "a@b.ec" }).reporter).toBe("a@b.ec");
  });

  test.each([[null], [[]], ["texto"]])("rechaza un cuerpo que no es objeto: %p", (body) => {
    expect(() => service.normalizeBody(body)).toThrow(expect.objectContaining({ status: 400 }));
  });

  test("detecta los campos obligatorios que faltan para PUT", () => {
    expect(service.missingRequiredFields({ title: "x", status: "open" })).toEqual([
      "description",
      "category",
      "priority",
      "date",
      "reporter"
    ]);
  });
});

describe("Casos de uso con el modelo simulado", () => {
  test("PATCH sin campos responde 400 y no consulta la base", async () => {
    await expect(service.patch("INC-001", {})).rejects.toMatchObject({ status: 400 });
    expect(incidentModel.getById).not.toHaveBeenCalled();
  });

  test("PATCH de un incidente inexistente responde 404", async () => {
    incidentModel.getById.mockResolvedValue(null);
    await expect(service.patch("INC-999", { status: "closed" })).rejects.toMatchObject({ status: 404 });
  });

  test("PATCH para reabrir un resuelto responde 409 y no guarda", async () => {
    incidentModel.getById.mockResolvedValue({ status: "closed" });
    await expect(service.patch("INC-001", { status: "open" })).rejects.toMatchObject({ status: 409 });
    expect(incidentModel.update).not.toHaveBeenCalled();
  });

  test("PATCH válido guarda el cambio", async () => {
    const current = { status: "open" };
    incidentModel.getById.mockResolvedValue(current);
    incidentModel.update.mockResolvedValue({ status: "progress" });
    await expect(service.patch("INC-001", { status: "progress" })).resolves.toEqual({ status: "progress" });
    expect(incidentModel.update).toHaveBeenCalledWith(current, expect.objectContaining({ status: "progress" }));
  });

  test("PUT incompleto responde 400", async () => {
    await expect(service.replace("INC-001", { status: "open" })).rejects.toMatchObject({ status: 400 });
  });

  test("DELETE de un incidente inexistente responde 404", async () => {
    incidentModel.remove.mockResolvedValue(false);
    await expect(service.remove("INC-999")).rejects.toMatchObject({ status: 404 });
  });
});
