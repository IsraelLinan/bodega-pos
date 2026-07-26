const pool = require("../db/pool");

// GET /api/productos
// Lista todos los productos activos, con el nombre de categoría incluido.
async function listarProductos(req, res) {
  try {
    const { data } = req.query; // permite ?data=bajos para filtrar stock bajo (lo usamos más adelante en reportes)

    const query = `
      SELECT p.id, p.codigo_barras, p.nombre, p.precio_compra, p.precio_venta,
             p.stock_actual, p.stock_minimo, p.activo,
             c.id AS categoria_id, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = TRUE
      ORDER BY p.nombre ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar productos:", error);
    res.status(500).json({ error: "Error al listar productos" });
  }
}

// GET /api/productos/buscar/:codigo_barras
// Este es EL endpoint del POS. Se llama cada vez que la pistola escanea.
async function buscarPorCodigoBarras(req, res) {
  const { codigo_barras } = req.params;

  try {
    const query = `
      SELECT id, codigo_barras, nombre, precio_venta, precio_compra, stock_actual
      FROM productos
      WHERE codigo_barras = $1 AND activo = TRUE
      LIMIT 1
    `;
    const result = await pool.query(query, [codigo_barras]);

    if (result.rows.length === 0) {
      // 404 explícito: el frontend usa esto para mostrar
      // "Producto no encontrado" al cajero de inmediato.
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = result.rows[0];

    if (producto.stock_actual <= 0) {
      // No bloqueamos la búsqueda, pero avisamos: el frontend decide
      // si permite añadir al carrito un producto sin stock o no.
      return res.status(200).json({ ...producto, sinStock: true });
    }

    res.json({ ...producto, sinStock: false });
  } catch (error) {
    console.error("Error al buscar producto por código de barras:", error);
    res.status(500).json({ error: "Error al buscar producto" });
  }
}

// POST /api/productos
// Crea un producto. Si viene con stock inicial > 0, se registra
// automáticamente como un movimiento de tipo ENTRADA (no se toca
// stock_actual "a mano").
async function crearProducto(req, res) {
  const {
    codigo_barras,
    nombre,
    categoria_id,
    precio_compra,
    precio_venta,
    stock_inicial = 0,
    stock_minimo = 5,
  } = req.body;

  if (!codigo_barras || !nombre || precio_compra == null || precio_venta == null) {
    return res.status(400).json({
      error: "codigo_barras, nombre, precio_compra y precio_venta son obligatorios",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertProducto = `
      INSERT INTO productos
        (codigo_barras, nombre, categoria_id, precio_compra, precio_venta, stock_actual, stock_minimo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await client.query(insertProducto, [
      codigo_barras,
      nombre,
      categoria_id || null,
      precio_compra,
      precio_venta,
      stock_inicial,
      stock_minimo,
    ]);
    const producto = rows[0];

    if (stock_inicial > 0) {
      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, tipo, cantidad, stock_resultante, motivo)
         VALUES ($1, 'ENTRADA', $2, $3, 'Stock inicial al crear producto')`,
        [producto.id, stock_inicial, stock_inicial]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(producto);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      // violación de UNIQUE (codigo_barras duplicado)
      return res.status(409).json({ error: "Ya existe un producto con ese código de barras" });
    }

    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  } finally {
    client.release();
  }
}

// POST /api/productos/:id/entradas
// Registra una entrada de mercadería (reabastecimiento).
// Body esperado: { cantidad: number, motivo?: string }
//
// IMPORTANTE: esta es la ÚNICA forma correcta de aumentar stock_actual
// por reabastecimiento. Nunca se debe hacer un UPDATE productos SET
// stock_actual = ... directo desde ningún otro lugar del código, porque
// eso rompería la auditoría de movimientos_inventario.
async function registrarEntrada(req, res) {
  const { id } = req.params;
  const { cantidad, motivo } = req.body;

  if (!cantidad || cantidad <= 0) {
    return res.status(400).json({ error: "La cantidad debe ser un número mayor a 0" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Bloqueamos la fila del producto (FOR UPDATE) para evitar condiciones
    // de carrera si dos personas registran una entrada al mismo producto
    // al mismo tiempo (poco probable en una bodega, pero es gratis prevenirlo).
    const productoResult = await client.query(
      `SELECT id, stock_actual FROM productos WHERE id = $1 AND activo = TRUE FOR UPDATE`,
      [id]
    );

    if (productoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const stockAnterior = productoResult.rows[0].stock_actual;
    const nuevoStock = stockAnterior + Number(cantidad);

    await client.query(
      `UPDATE productos SET stock_actual = $1, actualizado_en = NOW() WHERE id = $2`,
      [nuevoStock, id]
    );

    const movimientoResult = await client.query(
      `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad, stock_resultante, motivo)
       VALUES ($1, 'ENTRADA', $2, $3, $4)
       RETURNING *`,
      [id, cantidad, nuevoStock, motivo || "Reabastecimiento"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      producto_id: Number(id),
      stock_anterior: stockAnterior,
      stock_actual: nuevoStock,
      movimiento: movimientoResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar entrada de stock:", error);
    res.status(500).json({ error: "Error al registrar entrada de stock" });
  } finally {
    client.release();
  }
}

// GET /api/productos/:id/movimientos
// Historial completo de entradas/salidas de un producto, más reciente primero.
async function listarMovimientos(req, res) {
  const { id } = req.params;

  try {
    const query = `
      SELECT m.id, m.tipo, m.cantidad, m.stock_resultante, m.motivo,
             m.referencia_venta_id, m.creado_en
      FROM movimientos_inventario m
      WHERE m.producto_id = $1
      ORDER BY m.creado_en DESC
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar movimientos:", error);
    res.status(500).json({ error: "Error al listar movimientos" });
  }
}

// GET /api/productos/alertas/stock-bajo
// Productos activos cuyo stock_actual está en o por debajo de su stock_minimo.
async function listarStockBajo(req, res) {
  try {
    const query = `
      SELECT p.id, p.codigo_barras, p.nombre, p.stock_actual, p.stock_minimo,
             c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = TRUE AND p.stock_actual <= p.stock_minimo
      ORDER BY p.stock_actual ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar alertas de stock bajo:", error);
    res.status(500).json({ error: "Error al listar alertas de stock bajo" });
  }
}

// PUT /api/productos/:id
// Edita datos "descriptivos" del producto (nombre, precios, categoría, stock mínimo).
// IMPORTANTE: este endpoint NO toca stock_actual — el stock solo cambia
// mediante /entradas o una venta, nunca por edición directa del producto.
async function actualizarProducto(req, res) {
  const { id } = req.params;
  const { nombre, categoria_id, precio_compra, precio_venta, stock_minimo } = req.body;

  if (!nombre || precio_compra == null || precio_venta == null) {
    return res.status(400).json({ error: "nombre, precio_compra y precio_venta son obligatorios" });
  }

  try {
    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, categoria_id = $2, precio_compra = $3, precio_venta = $4,
           stock_minimo = COALESCE($5, stock_minimo), actualizado_en = NOW()
       WHERE id = $6 AND activo = TRUE
       RETURNING *`,
      [nombre, categoria_id || null, precio_compra, precio_venta, stock_minimo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
}

module.exports = {
  listarProductos,
  buscarPorCodigoBarras,
  crearProducto,
  actualizarProducto,
  registrarEntrada,
  listarMovimientos,
  listarStockBajo,
};
