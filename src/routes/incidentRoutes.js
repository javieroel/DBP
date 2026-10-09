const express = require("express");
const incidentController = require("../controllers/incidentController");

const router = express.Router();

router.get("/", incidentController.listIncidents);
router.get("/:id", incidentController.getIncident);
router.post("/", incidentController.createIncident);
router.put("/:id", incidentController.updateIncident);     // reemplazo completo
router.patch("/:id", incidentController.patchIncident);    // cambio parcial (ej. estado)
router.delete("/:id", incidentController.deleteIncident);

module.exports = router;
