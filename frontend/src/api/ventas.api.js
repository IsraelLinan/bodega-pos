import apiClient from "./client";

// POST /api/ventas
// payload: { items: [{ producto_id, cantidad }], monto_pagado }
// El backend recalcula todo (precios, stock, ganancia) contra la base de
// datos real — este payload solo indica QUÉ se quiere vender, nunca precios.
export async function confirmarVenta({ items, monto_pagado }) {
  const { data } = await apiClient.post("/ventas", { items, monto_pagado });
  return data;
}

// GET /api/ventas/:id
export async function obtenerVenta(ventaId) {
  const { data } = await apiClient.get(`/ventas/${ventaId}`);
  return data;
}

// GET /api/ventas?fecha=YYYY-MM-DD
export async function listarVentasDelDia(fecha) {
  const { data } = await apiClient.get("/ventas", {
    params: fecha ? { fecha } : {},
  });
  return data;
}

// POST /api/ventas/:id/anular
export async function anularVenta(ventaId, motivo) {
  const { data } = await apiClient.post(`/ventas/${ventaId}/anular`, { motivo });
  return data;
}
