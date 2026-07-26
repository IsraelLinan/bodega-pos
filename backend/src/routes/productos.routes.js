const express = require("express");
const router = express.Router();

const {
  listarProductos,
  buscarPorCodigoBarras,
  crearProducto,
  actualizarProducto,
  registrarEntrada,
  listarMovimientos,
  listarStockBajo,
} = require("../controllers/productos.controller");

// IMPORTANTE: las rutas específicas (/buscar/:x, /alertas/stock-bajo) deben
// ir ANTES de rutas con parámetros genéricos tipo /:id, para que Express
// no confunda "alertas" o el código de barras con un id numérico.
router.get("/buscar/:codigo_barras", buscarPorCodigoBarras);
router.get("/alertas/stock-bajo", listarStockBajo);

router.get("/", listarProductos);
router.post("/", crearProducto);

router.put("/:id", actualizarProducto);
router.post("/:id/entradas", registrarEntrada);
router.get("/:id/movimientos", listarMovimientos);

module.exports = router;
