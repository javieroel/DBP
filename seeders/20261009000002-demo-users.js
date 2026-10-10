"use strict";

// SEEDER: crea un usuario por rol. Las contraseñas se leen del .env y se guardan como hash bcrypt.
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");

const users = [
  { name: "Administrador SOC", email: "admin@incidentes.local", role: "admin", env: "SEED_ADMIN_PASSWORD" },
  { name: "Analista SOC", email: "analista@incidentes.local", role: "analista", env: "SEED_ANALISTA_PASSWORD" },
  { name: "Auditor (solo lectura)", email: "lector@incidentes.local", role: "lector", env: "SEED_LECTOR_PASSWORD" }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [];
    for (const user of users) {
      const password = process.env[user.env];
      if (!password || password.length < 10) {
        throw new Error(`${user.env} falta en el .env o tiene menos de 10 caracteres.`);
      }
      rows.push({
        name: user.name,
        email: user.email,
        role: user.role,
        password_hash: await bcrypt.hash(password, 12),
        created_at: now,
        updated_at: now
      });
    }
    await queryInterface.bulkInsert("users", rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { email: users.map((u) => u.email) });
  }
};
