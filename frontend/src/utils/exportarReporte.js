/**
 * Genera y descarga un .xlsx con el resumen del día y el detalle de ventas.
 * Todo ocurre en el navegador (no hay endpoint de backend para esto,
 * porque la data ya la tenemos disponible en el frontend).
 *
 * Import dinámico de 'xlsx': es una librería pesada que solo se necesita
 * cuando el usuario efectivamente hace clic en "Exportar", así que no tiene
 * sentido incluirla en el bundle principal que se carga en cada visita.
 */
export async function exportarReporteExcel({ resumen, ventas, fechaLabel }) {
  const XLSX = await import("xlsx");

  const libro = XLSX.utils.book_new();

  // Hoja 1: resumen del día
  const filasResumen = [
    ["Reporte del día", fechaLabel],
    [],
    ["Ventas realizadas", resumen.cantidad_ventas],
    ["Ingresos totales (S/)", resumen.total_ingresos],
    ["Ganancia total (S/)", resumen.ganancia_total],
    [],
    ["Producto más vendido", "Unidades", "Total generado (S/)"],
    ...resumen.top_productos.map((p) => [p.nombre, p.unidades_vendidas, p.total_generado]),
  ];
  const hojaResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");

  // Hoja 2: detalle de cada venta del día (incluye anuladas, marcadas)
  const filasVentas = [
    ["ID Venta", "Hora", "Subtotal", "Total", "Pagado", "Cambio", "Ganancia", "Estado"],
    ...ventas.map((v) => [
      v.id,
      new Date(v.creado_en).toLocaleTimeString("es-PE"),
      Number(v.subtotal),
      Number(v.total),
      Number(v.monto_pagado),
      Number(v.cambio),
      Number(v.ganancia_total),
      v.anulada ? "ANULADA" : "Válida",
    ]),
  ];
  const hojaVentas = XLSX.utils.aoa_to_sheet(filasVentas);
  XLSX.utils.book_append_sheet(libro, hojaVentas, "Ventas del día");

  const nombreArchivo = `reporte-bodega-${fechaLabel.replace(/\s+/g, "-")}.xlsx`;
  XLSX.writeFile(libro, nombreArchivo);
}
