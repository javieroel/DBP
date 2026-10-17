// Configuración de ESLint (Unidad 7): análisis estático del código.
// Usa las reglas recomendadas y añade algunas que previenen errores comunes.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "coverage/", "assets/", "database/"] },

  js.configs.recommended,

  // Reglas de calidad comunes a todo el proyecto
  {
    rules: {
      eqeqeq: ["error", "always"],          // obliga === en lugar de == (comparaciones ambiguas)
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",
      "no-console": "off"                   // el servidor registra eventos de auditoría en consola
    }
  },

  // Back-end, migraciones, seeders, scripts y pruebas: CommonJS en Node
  {
    files: ["app.js", "src/**/*.js", "migrations/**/*.js", "seeders/**/*.js", "scripts/**/*.js", "eslint.config.js", "tests/**/*.js", ".sequelizerc"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: 2022,
      globals: { ...globals.node }
    }
  },

  // Pruebas con Jest
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.jest } }
  },

  // Front-end: scripts clásicos del navegador (patrón módulo). Cada archivo declara su objeto
  // con /* exported ... */ y el controlador usa los del modelo y la vista como globales de solo lectura.
  {
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      globals: { ...globals.browser }
    }
  },
  {
    files: ["js/controller.js"],
    languageOptions: { globals: { IncidentModel: "readonly", IncidentView: "readonly" } }
  }
];
