const express = require("express");
const incidentController = require("../controllers/incidentController");

const router = express.Router();

router.get("/", incidentController.listIncidents);
router.get("/:id", incidentController.getIncident);
router.post("/", incidentController.createIncident);
router.put("/:id", incidentController.updateIncident);
router.delete("/:id", incidentController.deleteIncident);

module.exports = router;
