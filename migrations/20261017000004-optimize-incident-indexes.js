"use strict";

// MIGRACIÓN 4 (Unidad 7): índices que coinciden con las consultas reales de la API.
// Medido con scripts/medir-consulta.js (EXPLAIN ANALYZE sobre 20 000 filas):
//  - Listado y filtro por estado: el índice compuesto evita ordenar ("Sort") los resultados.
//  - Búsqueda ?q= (ILIKE '%texto%'): sin índice recorre toda la tabla ("Seq Scan");
//    con índices de trigramas (pg_trgm + GIN) usa "Bitmap Index Scan".
// Los índices simples de la migración 2 (date) y (status) quedan cubiertos por los compuestos.
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_date_id ON incidents (date DESC, id DESC)");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_status_date_id ON incidents (status, date DESC, id DESC)");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_title_trgm ON incidents USING gin (title gin_trgm_ops)");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_description_trgm ON incidents USING gin (description gin_trgm_ops)");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_reporter_trgm ON incidents USING gin (reporter gin_trgm_ops)");
    await q("DROP INDEX IF EXISTS idx_incidents_date");
    await q("DROP INDEX IF EXISTS idx_incidents_status");
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents (date)");
    await q("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status)");
    await q("DROP INDEX IF EXISTS idx_incidents_reporter_trgm");
    await q("DROP INDEX IF EXISTS idx_incidents_description_trgm");
    await q("DROP INDEX IF EXISTS idx_incidents_title_trgm");
    await q("DROP INDEX IF EXISTS idx_incidents_status_date_id");
    await q("DROP INDEX IF EXISTS idx_incidents_date_id");
  }
};
