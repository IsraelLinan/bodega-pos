const express = require("express");
const router = express.Router();

const { resumenDelDia, resumenPorRango } = require("../controllers/reportes.controller");

router.get("/dia", resumenDelDia);
router.get("/rango", resumenPorRango);

module.exports = router;
