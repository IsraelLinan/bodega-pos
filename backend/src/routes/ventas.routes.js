const express = require("express");
const router = express.Router();

const {
  confirmarVenta,
  obtenerVenta,
  anularVenta,
  listarVentasDelDia,
} = require("../controllers/ventas.controller");

router.get("/", listarVentasDelDia);
router.post("/", confirmarVenta);
router.post("/:id/anular", anularVenta);
router.get("/:id", obtenerVenta);

module.exports = router;
