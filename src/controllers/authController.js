// CONTROLADOR DE AUTENTICACIÓN
const HttpError = require("../middleware/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const authService = require("../services/authService");
const log = require("../utils/log");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/login  { email, password }
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email) || email.length > 120) {
    throw new HttpError(400, "Ingrese un correo válido.");
  }
  if (typeof password !== "string" || password.length < 1 || password.length > 72) {
    throw new HttpError(400, "Ingrese la contraseña (máximo 72 caracteres).");
  }

  const user = await authService.verifyCredentials(email, password);
  if (!user) {
    // Mismo mensaje para correo inexistente o contraseña incorrecta: no revela qué falló
    log.warn("login_fallido", { event: "seguridad.login_fallido", reqId: req.id, email: log.maskEmail(email), ip: req.ip });
    throw new HttpError(401, "Credenciales inválidas.");
  }

  log.info("login_correcto", { event: "seguridad.login_correcto", reqId: req.id, userId: user.id, role: user.role, ip: req.ip });
  res.json({ token: authService.issueToken(user), user: user.toJSON() });
});

// GET /api/auth/me  -> datos del usuario autenticado
const me = (req, res) => res.json({ user: req.user });

module.exports = { login, me };
