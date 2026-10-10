// SERVICIO DE AUTENTICACIÓN: verifica credenciales y emite / valida tokens JWT.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const security = require("../config/security");

// Hash de relleno: si el correo no existe se compara igual contra este hash,
// para que el tiempo de respuesta no revele qué correos están registrados.
const DUMMY_HASH = bcrypt.hashSync("contraseña-de-relleno-no-valida", security.bcryptRounds);

async function verifyCredentials(email, password) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  return user && valid ? user : null;
}

function issueToken(user) {
  return jwt.sign({ role: user.role, name: user.name }, security.jwt.secret, {
    subject: String(user.id),
    expiresIn: security.jwt.expiresIn,
    algorithm: security.jwt.algorithm,
    issuer: security.jwt.issuer,
    audience: security.jwt.audience
  });
}

// Lanza TokenExpiredError o JsonWebTokenError si el token no es válido
function verifyToken(token) {
  return jwt.verify(token, security.jwt.secret, {
    algorithms: [security.jwt.algorithm], // evita el ataque "alg: none" o cambio de algoritmo
    issuer: security.jwt.issuer,
    audience: security.jwt.audience
  });
}

async function findUserById(id) {
  return User.findByPk(id);
}

module.exports = { verifyCredentials, issueToken, verifyToken, findUserById };
