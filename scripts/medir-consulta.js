// MEDICIÓN DE LA CONSULTA PRINCIPAL (Unidad 7)
// Mide con EXPLAIN ANALYZE la misma consulta que ejecuta GET /api/incidentes,
// sobre 20 000 incidentes de prueba creados DENTRO de una transacción que al final
// se revierte (ROLLBACK): la base real no se modifica.
// Uso: npm run medir:consulta   (en el servidor: docker compose exec app npm run medir:consulta)
const { sequelize } = require("../src/db/sequelize");

const ROWS = Number(process.env.FILAS) || 20000;
const REPS = 7;

// Consultas equivalentes a las que genera Sequelize en incidentModel.getAll()
const QUERIES = {
  "Listado (ORDER BY date DESC, id DESC LIMIT 100)":
    'SELECT * FROM incidents ORDER BY date DESC, id DESC LIMIT 100',
  "Filtro por estado (status = 'open')":
    "SELECT * FROM incidents WHERE status = 'open' ORDER BY date DESC, id DESC LIMIT 100",
  "Búsqueda de texto (?q=phishing)":
    "SELECT * FROM incidents WHERE (title ILIKE '%phishing%' OR description ILIKE '%phishing%' OR reporter ILIKE '%phishing%') ORDER BY date DESC, id DESC LIMIT 100"
};

const OLD = [
  "CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents (date)",
  "CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status)"
];
const DROP_NEW = [
  "DROP INDEX IF EXISTS idx_incidents_date_id",
  "DROP INDEX IF EXISTS idx_incidents_status_date_id",
  "DROP INDEX IF EXISTS idx_incidents_title_trgm",
  "DROP INDEX IF EXISTS idx_incidents_description_trgm",
  "DROP INDEX IF EXISTS idx_incidents_reporter_trgm"
];
const NEW = [
  "CREATE EXTENSION IF NOT EXISTS pg_trgm",
  "CREATE INDEX idx_incidents_date_id ON incidents (date DESC, id DESC)",
  "CREATE INDEX idx_incidents_status_date_id ON incidents (status, date DESC, id DESC)",
  "CREATE INDEX idx_incidents_title_trgm ON incidents USING gin (title gin_trgm_ops)",
  "CREATE INDEX idx_incidents_description_trgm ON incidents USING gin (description gin_trgm_ops)",
  "CREATE INDEX idx_incidents_reporter_trgm ON incidents USING gin (reporter gin_trgm_ops)"
];

async function explain(t, sql) {
  const times = [];
  let plan;
  for (let i = 0; i < REPS; i += 1) {
    const [rows] = await sequelize.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, { transaction: t });
    const result = rows[0]["QUERY PLAN"][0];
    times.push(result["Execution Time"]);
    plan = result.Plan;
  }
  times.sort((a, b) => a - b);
  // Nodo principal debajo del LIMIT: "Sort + Seq Scan" (lento) o "Index Scan" (rápido)
  const nodes = [];
  const indexes = new Set();
  (function walk(node) {
    if (node["Node Type"] !== "Limit") nodes.push(node["Node Type"]);
    if (node["Index Name"]) indexes.add(node["Index Name"]);
    (node.Plans || []).forEach(walk);
  })(plan);
  return { mediana: times[Math.floor(REPS / 2)], plan: [...new Set(nodes)].join(" > "), index: [...indexes].join(", ") || "-" };
}

async function measure(t, label) {
  console.log(`\n--- ${label} ---`);
  for (const [name, sql] of Object.entries(QUERIES)) {
    const r = await explain(t, sql);
    console.log(`${name}\n   plan: ${r.plan} | índice: ${r.index} | mediana de ${REPS}: ${r.mediana.toFixed(2)} ms`);
  }
}

(async () => {
  const t = await sequelize.transaction();
  try {
    await sequelize.query(
      // id negativo explícito: así no se consume la secuencia de ids reales (las secuencias no se revierten)
      `INSERT INTO incidents (id, title, description, category, priority, status, date, reporter)
       SELECT -g, 'Incidente de prueba ' || g,
              'Descripción generada para medir el rendimiento de la consulta ' || g,
              (ARRAY['acceso','sistema','red','otro'])[1 + g % 4],
              (ARRAY['alta','media','baja'])[1 + g % 3],
              (ARRAY['open','progress','closed'])[1 + g % 3],
              DATE '2024-01-01' + (g % 900),
              'medicion@incidentes.local'
       FROM generate_series(1, ${ROWS}) AS g`,
      { transaction: t }
    );
    await sequelize.query("ANALYZE incidents", { transaction: t });
    console.log(`Filas de prueba insertadas (temporales): ${ROWS}`);

    // ANTES: solo los índices de la migración 2
    for (const sql of DROP_NEW) await sequelize.query(sql, { transaction: t });
    for (const sql of OLD) await sequelize.query(sql, { transaction: t });
    await sequelize.query("ANALYZE incidents", { transaction: t });
    await measure(t, "ANTES (índices de la migración 2)");

    // DESPUÉS: índices de la migración 4
    for (const sql of NEW) await sequelize.query(sql, { transaction: t });
    await sequelize.query("ANALYZE incidents", { transaction: t });
    await measure(t, "DESPUÉS (índices de la migración 4)");
  } finally {
    await t.rollback(); // nada de lo anterior queda en la base
    await sequelize.close();
    console.log("\nTransacción revertida: la base quedó como estaba.");
  }
})().catch((error) => {
  console.error("No se pudo medir:", error.message);
  process.exit(1);
});
