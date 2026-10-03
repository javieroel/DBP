"use strict";

// SEEDER: carga los incidentes de ejemplo (los mismos del Reto 2) en la base.
// Se ejecuta con: npm run db:seed
const now = new Date();

const incidents = [
  {
    title: "Contraseña temporal rechazada",
    description: "La cuenta fue restablecida y el usuario pudo acceder nuevamente sin inconvenientes adicionales.",
    category: "sistema", priority: "baja", date: "2026-09-08", status: "closed",
    reporter: "ana.torres@universidad.edu.ec", area: "Coordinación académica"
  },
  {
    title: "La impresora no aparece en la red",
    description: "El equipo de laboratorio no encuentra la impresora compartida al intentar conectarse desde los equipos del aula 4.",
    category: "red", priority: "media", date: "2026-09-09", status: "open",
    reporter: "carlos.andrade@universidad.edu.ec", area: "Laboratorio de cómputo"
  },
  {
    title: "El acceso al aula virtual se interrumpe",
    description: "La sesión se cierra después de unos minutos y no permite entregar actividades. El problema aparece en dos navegadores distintos.",
    category: "acceso", priority: "alta", date: "2026-09-10", status: "progress",
    reporter: "maria.lopez@universidad.edu.ec", area: "Servicios escolares"
  },
  {
    title: "Correo de phishing reportado por docentes",
    description: "Varios docentes recibieron un correo que suplanta a la mesa de ayuda y solicita validar la contraseña institucional.",
    category: "acceso", priority: "alta", date: "2026-09-28", status: "open",
    reporter: "seguridad@universidad.edu.ec", area: "Seguridad de la información"
  }
].map((item) => ({ ...item, created_at: now, updated_at: now }));

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("incidents", incidents);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("incidents", null, {});
  }
};
