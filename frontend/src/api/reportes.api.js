import apiClient from "./client";

// GET /api/reportes/dia?fecha=YYYY-MM-DD
// Si no se pasa fecha, el backend usa "hoy" en hora de Lima.
export async function obtenerResumenDelDia(fecha) {
  const { data } = await apiClient.get("/reportes/dia", {
    params: fecha ? { fecha } : {},
  });
  return data;
}

// GET /api/reportes/rango?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
export async function obtenerResumenPorRango(desde, hasta) {
  const { data } = await apiClient.get("/reportes/rango", {
    params: { desde, hasta },
  });
  return data;
}
