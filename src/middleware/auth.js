// AUTENTICACIÓN y AUTORIZACIÓN
//  authenticate      -> ¿quién eres?  (sin token o token inválido: 401)
//  authorize(roles)  -> ¿qué puedes hacer? (rol sin permiso: 403)
const HttpError = require("./httpError");
const asyncHandler = require("./asyncHandler");
const authService = require("../services/authService");

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.get("Authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.set("WWW-Authenticate", 'Bearer realm="api"');
    throw new HttpError(401, "Se requiere autenticación: envíe el encabezado Authorization: Bearer <token>.");
  }

  let payload;
  try {
    payload = authService.verifyToken(token);
  } catch (error) {
    res.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    throw new HttpError(401, error.name === "TokenExpiredError" ? "El token expiró. Inicie sesión de nuevo." : "Token inválido.");
  }

  // El usuario debe seguir existiendo; el rol se toma de la base, no solo del token
  const user = await authService.findUserById(Number(payload.sub));
  if (!user) throw new HttpError(401, "El usuario del token ya no existe.");

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new HttpError(403, `Permisos insuficientes: la acción requiere rol ${allowedRoles.join(" o ")}.`)
      );
    }
    next();
  };
}

module.exports = { authenticate, authorize };
