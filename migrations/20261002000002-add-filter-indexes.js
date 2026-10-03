"use strict";

// MIGRACIÓN 2: agrega índices para que los filtros por estado y prioridad
// no tengan que recorrer toda la tabla. Muestra cómo el esquema evoluciona por versiones.
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("incidents", ["status"], { name: "idx_incidents_status" });
    await queryInterface.addIndex("incidents", ["priority"], { name: "idx_incidents_priority" });
    await queryInterface.addIndex("incidents", ["date"], { name: "idx_incidents_date" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("incidents", "idx_incidents_date");
    await queryInterface.removeIndex("incidents", "idx_incidents_priority");
    await queryInterface.removeIndex("incidents", "idx_incidents_status");
  }
};
