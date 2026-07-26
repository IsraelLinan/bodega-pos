const pool = require("../db/pool");

const ZONA_HORARIA = "America/Lima";

// GET /api/reportes/dia?fecha=YYYY-MM-DD
// Si no se manda 'fecha', se usa el día de hoy en hora de Lima (no UTC).
// Devuelve: ingresos totales, cantidad de ventas, ganancia del día,
// y el top de productos más vendidos ese día (útil para reponer stock rápido).
async function resumenDelDia(req, res) {
  const { fecha } = req.query;

  try {
    // Si no viene fecha, calculamos "hoy" en la zona horaria de la bodega
    // directamente en Postgres, para no depender de la hora del servidor Node.
    const fechaObjetivo = fecha
      ? fecha
      : (await pool.query(`SELECT (NOW() AT TIME ZONE $1)::date AS hoy`, [ZONA_HORARIA])).rows[0].hoy;

    const resumenQuery = `
      SELECT
        COUNT(*)::int AS cantidad_ventas,
        COALESCE(SUM(total), 0) AS total_ingresos,
        COALESCE(SUM(ganancia_total), 0) AS ganancia_total
      FROM ventas
      WHERE (creado_en AT TIME ZONE $2)::date = $1::date
        AND anulada = FALSE
    `;
    const resumenResult = await pool.query(resumenQuery, [fechaObjetivo, ZONA_HORARIA]);

    const topProductosQuery = `
      SELECT
        p.id, p.nombre, p.codigo_barras,
        SUM(dv.cantidad)::int AS unidades_vendidas,
        SUM(dv.subtotal_linea) AS total_generado
      FROM detalle_ventas dv
      JOIN ventas v ON v.id = dv.venta_id
      JOIN productos p ON p.id = dv.producto_id
      WHERE (v.creado_en AT TIME ZONE $2)::date = $1::date
        AND v.anulada = FALSE
      GROUP BY p.id, p.nombre, p.codigo_barras
      ORDER BY unidades_vendidas DESC
      LIMIT 5
    `;
    const topProductosResult = await pool.query(topProductosQuery, [fechaObjetivo, ZONA_HORARIA]);

    const resumen = resumenResult.rows[0];

    res.json({
      fecha: fechaObjetivo,
      cantidad_ventas: resumen.cantidad_ventas,
      total_ingresos: Number(resumen.total_ingresos),
      ganancia_total: Number(resumen.ganancia_total),
      top_productos: topProductosResult.rows.map((p) => ({
        ...p,
        total_generado: Number(p.total_generado),
      })),
    });
  } catch (error) {
    console.error("Error al generar resumen del día:", error);
    res.status(500).json({ error: "Error al generar el resumen del día" });
  }
}

// GET /api/reportes/rango?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Extra: útil más adelante para reportes semanales/mensuales sin
// tener que construir un endpoint nuevo desde cero.
async function resumenPorRango(req, res) {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: "Debes enviar 'desde' y 'hasta' (YYYY-MM-DD)" });
  }

  try {
    const query = `
      SELECT
        (creado_en AT TIME ZONE $3)::date AS fecha,
        COUNT(*)::int AS cantidad_ventas,
        COALESCE(SUM(total), 0) AS total_ingresos,
        COALESCE(SUM(ganancia_total), 0) AS ganancia_total
      FROM ventas
      WHERE (creado_en AT TIME ZONE $3)::date BETWEEN $1::date AND $2::date
        AND anulada = FALSE
      GROUP BY (creado_en AT TIME ZONE $3)::date
      ORDER BY fecha ASC
    `;
    const result = await pool.query(query, [desde, hasta, ZONA_HORARIA]);

    res.json(
      result.rows.map((r) => ({
        ...r,
        total_ingresos: Number(r.total_ingresos),
        ganancia_total: Number(r.ganancia_total),
      }))
    );
  } catch (error) {
    console.error("Error al generar resumen por rango:", error);
    res.status(500).json({ error: "Error al generar el resumen por rango" });
  }
}

module.exports = {
  resumenDelDia,
  resumenPorRango,
};
