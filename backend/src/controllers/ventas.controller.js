const pool = require("../db/pool");

// POST /api/ventas
// Confirma una venta completa: valida stock, calcula totales con precios
// reales de la BD, descuenta stock y deja registro en movimientos_inventario.
// Todo ocurre en UNA sola transacción: o se aplica todo, o no se aplica nada.
//
// Body esperado:
// {
//   items: [{ producto_id: number, cantidad: number }, ...],
//   monto_pagado: number
// }
async function confirmarVenta(req, res) {
  const { items, monto_pagado } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "La venta debe tener al menos un producto" });
  }
  if (monto_pagado == null || Number(monto_pagado) < 0) {
    return res.status(400).json({ error: "monto_pagado inválido" });
  }

  // Consolidamos cantidades por si el mismo producto viene repetido en el
  // array (no debería pasar si el frontend agrupa bien el carrito, pero
  // el backend no debe asumirlo).
  const cantidadesPorProducto = new Map();
  for (const item of items) {
    if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
      return res.status(400).json({ error: "Cada item necesita producto_id y cantidad > 0" });
    }
    const actual = cantidadesPorProducto.get(item.producto_id) || 0;
    cantidadesPorProducto.set(item.producto_id, actual + Number(item.cantidad));
  }

  // Orden ascendente por producto_id: previene deadlocks si dos ventas
  // concurrentes tocan los mismos productos en distinto orden.
  const productoIds = [...cantidadesPorProducto.keys()].sort((a, b) => a - b);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lineas = [];
    let subtotal = 0;
    let gananciaTotal = 0;

    for (const productoId of productoIds) {
      const cantidad = cantidadesPorProducto.get(productoId);

      const productoResult = await client.query(
        `SELECT id, nombre, precio_venta, precio_compra, stock_actual
         FROM productos
         WHERE id = $1 AND activo = TRUE
         FOR UPDATE`,
        [productoId]
      );

      if (productoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: `Producto con id ${productoId} no encontrado` });
      }

      const producto = productoResult.rows[0];

      if (producto.stock_actual < cantidad) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual}, solicitado: ${cantidad}`,
        });
      }

      const precioUnitario = Number(producto.precio_venta);
      const precioCompraUnitario = Number(producto.precio_compra);
      const subtotalLinea = precioUnitario * cantidad;
      const gananciaLinea = (precioUnitario - precioCompraUnitario) * cantidad;

      subtotal += subtotalLinea;
      gananciaTotal += gananciaLinea;

      lineas.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        precio_compra_unitario: precioCompraUnitario,
        subtotal_linea: subtotalLinea,
        stock_anterior: producto.stock_actual,
      });
    }

    // Por ahora total = subtotal (sin impuestos). Si más adelante necesitas
    // IGV u otro cargo, este es el único lugar que hay que tocar.
    const total = subtotal;

    if (Number(monto_pagado) < total) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Monto pagado insuficiente. Total: ${total.toFixed(2)}, pagado: ${Number(monto_pagado).toFixed(2)}`,
      });
    }

    const cambio = Number(monto_pagado) - total;

    const ventaResult = await client.query(
      `INSERT INTO ventas (subtotal, total, monto_pagado, cambio, ganancia_total)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [subtotal, total, monto_pagado, cambio, gananciaTotal]
    );
    const venta = ventaResult.rows[0];

    for (const linea of lineas) {
      await client.query(
        `INSERT INTO detalle_ventas
           (venta_id, producto_id, precio_unitario, precio_compra_unitario, cantidad, subtotal_linea)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          venta.id,
          linea.producto_id,
          linea.precio_unitario,
          linea.precio_compra_unitario,
          linea.cantidad,
          linea.subtotal_linea,
        ]
      );

      const nuevoStock = linea.stock_anterior - linea.cantidad;

      await client.query(
        `UPDATE productos SET stock_actual = $1, actualizado_en = NOW() WHERE id = $2`,
        [nuevoStock, linea.producto_id]
      );

      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, tipo, cantidad, stock_resultante, motivo, referencia_venta_id)
         VALUES ($1, 'SALIDA_VENTA', $2, $3, $4, $5)`,
        [linea.producto_id, linea.cantidad, nuevoStock, `Venta #${venta.id}`, venta.id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      venta,
      items: lineas.map(({ stock_anterior, ...resto }) => resto),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al confirmar venta:", error);
    res.status(500).json({ error: "Error al confirmar la venta" });
  } finally {
    client.release();
  }
}

// GET /api/ventas/:id
// Detalle completo de una venta puntual (útil para un historial/recibo).
async function obtenerVenta(req, res) {
  const { id } = req.params;
  try {
    const ventaResult = await pool.query(`SELECT * FROM ventas WHERE id = $1`, [id]);
    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const detalleResult = await pool.query(
      `SELECT dv.*, p.nombre AS producto_nombre, p.codigo_barras
       FROM detalle_ventas dv
       JOIN productos p ON p.id = dv.producto_id
       WHERE dv.venta_id = $1`,
      [id]
    );

    res.json({ venta: ventaResult.rows[0], items: detalleResult.rows });
  } catch (error) {
    console.error("Error al obtener venta:", error);
    res.status(500).json({ error: "Error al obtener venta" });
  }
}

// POST /api/ventas/:id/anular
// Anula una venta: NO se borra ni se edita el registro original (la
// auditoría se preserva intacta), se marca anulada = TRUE y se revierte
// el stock de cada producto vendido, dejando un movimiento AJUSTE_POSITIVO
// que referencia la venta anulada. Todo dentro de una transacción.
async function anularVenta(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ventaResult = await client.query(
      `SELECT * FROM ventas WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (ventaResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const venta = ventaResult.rows[0];

    if (venta.anulada) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Esta venta ya estaba anulada" });
    }

    const detalleResult = await client.query(
      `SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1`,
      [id]
    );

    // Ordenamos por producto_id para mantener el mismo criterio anti-deadlock
    // que usamos al confirmar la venta original.
    const detalles = [...detalleResult.rows].sort((a, b) => a.producto_id - b.producto_id);

    for (const detalle of detalles) {
      const productoResult = await client.query(
        `SELECT id, nombre, stock_actual FROM productos WHERE id = $1 FOR UPDATE`,
        [detalle.producto_id]
      );

      if (productoResult.rows.length === 0) {
        // El producto pudo haberse desactivado después; igual revertimos
        // el stock sobre su registro, que sigue existiendo aunque inactivo.
        continue;
      }

      const producto = productoResult.rows[0];
      const nuevoStock = producto.stock_actual + detalle.cantidad;

      await client.query(
        `UPDATE productos SET stock_actual = $1, actualizado_en = NOW() WHERE id = $2`,
        [nuevoStock, producto.id]
      );

      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, tipo, cantidad, stock_resultante, motivo, referencia_venta_id)
         VALUES ($1, 'AJUSTE_POSITIVO', $2, $3, $4, $5)`,
        [producto.id, detalle.cantidad, nuevoStock, `Anulación de venta #${id}`, id]
      );
    }

    const actualizarVentaResult = await client.query(
      `UPDATE ventas
       SET anulada = TRUE, anulada_en = NOW(), motivo_anulacion = $1
       WHERE id = $2
       RETURNING *`,
      [motivo || "Sin motivo especificado", id]
    );

    await client.query("COMMIT");
    res.json(actualizarVentaResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al anular venta:", error);
    res.status(500).json({ error: "Error al anular la venta" });
  } finally {
    client.release();
  }
}

// GET /api/ventas?fecha=YYYY-MM-DD
// Lista las ventas de un día (para mostrarlas en Reportes con opción de anular).
// Si no se manda fecha, usa "hoy" en hora de Lima (mismo criterio que /reportes/dia).
async function listarVentasDelDia(req, res) {
  const { fecha } = req.query;
  const ZONA_HORARIA = "America/Lima";

  try {
    const fechaObjetivo = fecha
      ? fecha
      : (await pool.query(`SELECT (NOW() AT TIME ZONE $1)::date AS hoy`, [ZONA_HORARIA])).rows[0]
          .hoy;

    const result = await pool.query(
      `SELECT id, subtotal, total, monto_pagado, cambio, ganancia_total,
              anulada, anulada_en, motivo_anulacion, creado_en
       FROM ventas
       WHERE (creado_en AT TIME ZONE $2)::date = $1::date
       ORDER BY creado_en DESC`,
      [fechaObjetivo, ZONA_HORARIA]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar ventas del día:", error);
    res.status(500).json({ error: "Error al listar ventas del día" });
  }
}

module.exports = {
  confirmarVenta,
  obtenerVenta,
  anularVenta,
  listarVentasDelDia,
};
