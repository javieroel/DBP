const express = require("express");
const incidentController = require("../controllers/incidentController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Todas las rutas de incidentes exigen un token válido
router.use(authenticate);

//          ruta    roles permitidos                          acción
router.get("/",     authorize("admin", "analista", "lector"), incidentController.listIncidents);
router.get("/:id",  authorize("admin", "analista", "lector"), incidentController.getIncident);
router.post("/",    authorize("admin", "analista"),           incidentController.createIncident);
router.patch("/:id", authorize("admin", "analista"),          incidentController.patchIncident);  // cambio parcial (estado)
router.put("/:id",  authorize("admin"),                       incidentController.updateIncident); // reemplazo completo
router.delete("/:id", authorize("admin"),                     incidentController.deleteIncident);

module.exports = router;
