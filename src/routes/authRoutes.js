const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Máximo 10 contraseñas incorrectas por IP cada 15 minutos (frena la fuerza bruta).
// Solo cuentan los intentos fallidos (401); un inicio de sesión correcto no suma.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
  message: { error: "Demasiados intentos de inicio de sesión. Espere 15 minutos." }
});

router.post("/login", loginLimiter, authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;
