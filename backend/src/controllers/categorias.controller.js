const pool = require("../db/pool");

// GET /api/categorias
async function listarCategorias(req, res) {
  try {
    const result = await pool.query(`SELECT id, nombre FROM categorias ORDER BY nombre ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar categorías:", error);
    res.status(500).json({ error: "Error al listar categorías" });
  }
}

// POST /api/categorias
// payload: { nombre }
async function crearCategoria(req, res) {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categorias (nombre) VALUES ($1) RETURNING *`,
      [nombre.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
    console.error("Error al crear categoría:", error);
    res.status(500).json({ error: "Error al crear categoría" });
  }
}

module.exports = { listarCategorias, crearCategoria };
