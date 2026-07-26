import apiClient from "./client";

// GET /api/productos
// Lista todos los productos activos (para la pantalla de Inventario).
export async function listarProductos() {
  const { data } = await apiClient.get("/productos");
  return data;
}

// GET /api/productos/buscar/:codigo_barras
// El corazón del POS: se llama cada vez que la pistola escanea un producto.
// Devuelve el producto encontrado, o lanza un error (mensaje ya normalizado
// por el interceptor de client.js) si no existe.
export async function buscarProductoPorCodigoBarras(codigoBarras) {
  const { data } = await apiClient.get(`/productos/buscar/${encodeURIComponent(codigoBarras)}`);
  return data;
}

// GET /api/productos/alertas/stock-bajo
export async function listarStockBajo() {
  const { data } = await apiClient.get("/productos/alertas/stock-bajo");
  return data;
}

// POST /api/productos
// payload: { codigo_barras, nombre, categoria_id?, precio_compra, precio_venta, stock_inicial?, stock_minimo? }
export async function crearProducto(payload) {
  const { data } = await apiClient.post("/productos", payload);
  return data;
}

// PUT /api/productos/:id
// payload: { nombre, categoria_id?, precio_compra, precio_venta, stock_minimo? }
export async function actualizarProducto(productoId, payload) {
  const { data } = await apiClient.put(`/productos/${productoId}`, payload);
  return data;
}

// POST /api/productos/:id/entradas
// payload: { cantidad, motivo? }
export async function registrarEntradaStock(productoId, payload) {
  const { data } = await apiClient.post(`/productos/${productoId}/entradas`, payload);
  return data;
}

// GET /api/productos/:id/movimientos
export async function listarMovimientosProducto(productoId) {
  const { data } = await apiClient.get(`/productos/${productoId}/movimientos`);
  return data;
}
