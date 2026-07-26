const { Pool } = require("pg");

// El Pool reutiliza conexiones en vez de abrir/cerrar una por cada query.
// Esto es importante en un POS: durante una venta activa puede haber
// varias consultas casi simultáneas (buscar producto, insertar detalle, etc).
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "bodega_user",
  password: process.env.DB_PASSWORD || "bodega_pass",
  database: process.env.DB_NAME || "bodega_pos",
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

module.exports = pool;
