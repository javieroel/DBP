"use strict";

// MIGRACIÓN 1: crea la tabla "incidents".
// up   = aplicar el cambio   (npm run db:migrate)
// down = revertir el cambio  (npm run db:migrate:undo)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("incidents", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      category: { type: Sequelize.STRING(20), allowNull: false },
      priority: { type: Sequelize.STRING(10), allowNull: false },
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: "open" },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      reporter: { type: Sequelize.STRING(120), allowNull: false },
      area: { type: Sequelize.STRING(80), allowNull: false, defaultValue: "Sin asignar" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    // Defensa en profundidad: aunque alguien salte la API, la BASE rechaza valores inválidos.
    await queryInterface.sequelize.query(`
      ALTER TABLE incidents
        ADD CONSTRAINT chk_incidents_status   CHECK (status   IN ('open','progress','closed')),
        ADD CONSTRAINT chk_incidents_priority CHECK (priority IN ('alta','media','baja')),
        ADD CONSTRAINT chk_incidents_category CHECK (category IN ('acceso','sistema','red','otro')),
        ADD CONSTRAINT chk_incidents_title    CHECK (char_length(title) >= 5),
        ADD CONSTRAINT chk_incidents_desc     CHECK (char_length(description) >= 20);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("incidents");
  }
};
