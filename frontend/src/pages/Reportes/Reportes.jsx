import { useState, useEffect, useCallback } from "react";

import { obtenerResumenDelDia } from "../../api/reportes.api";
import { listarVentasDelDia, anularVenta } from "../../api/ventas.api";
import { formatCurrency } from "../../utils/formatCurrency";
import { exportarReporteExcel } from "../../utils/exportarReporte";
import Toast from "../../components/ui/Toast";

function formatearFecha(fechaISO) {
  const soloFecha = String(fechaISO).slice(0, 10);
  const [anio, mes, dia] = soloFecha.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Reportes() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(""); // "" = hoy
  const [resumen, setResumen] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [anulandoId, setAnulandoId] = useState(null);

  const cargarTodo = useCallback(async (fecha) => {
    setCargando(true);
    setMensaje(null);
    try {
      const [datosResumen, datosVentas] = await Promise.all([
        obtenerResumenDelDia(fecha || undefined),
        listarVentasDelDia(fecha || undefined),
      ]);
      setResumen(datosResumen);
      setVentas(datosVentas);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.mensaje });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo(fechaSeleccionada);
  }, [fechaSeleccionada, cargarTodo]);

  const esHoyMostrado = !fechaSeleccionada;

  async function manejarAnular(venta) {
    const confirmar = window.confirm(
      `¿Anular la venta #${venta.id} por ${formatCurrency(venta.total)}? Esto devuelve el stock vendido.`
    );
    if (!confirmar) return;

    setAnulandoId(venta.id);
    try {
      await anularVenta(venta.id, "Anulada desde Reportes");
      setMensaje({ tipo: "exito", texto: `Venta #${venta.id} anulada y stock revertido` });
      await cargarTodo(fechaSeleccionada);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.mensaje });
    } finally {
      setAnulandoId(null);
    }
  }

  async function manejarExportar() {
    if (!resumen) return;
    await exportarReporteExcel({
      resumen,
      ventas,
      fechaLabel: formatearFecha(resumen.fecha),
    });
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reportes</h1>
          {resumen && (
            <p className="text-slate-500 mt-0.5 text-sm capitalize">
              {formatearFecha(resumen.fecha)}
              {esHoyMostrado && <span className="text-emerald-600 font-medium"> · hoy</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {!esHoyMostrado && (
            <button
              onClick={() => setFechaSeleccionada("")}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Ver hoy
            </button>
          )}
          <button
            onClick={manejarExportar}
            disabled={!resumen || cargando}
            className="text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 py-2 disabled:opacity-40"
          >
            ⬇ Exportar a Excel
          </button>
        </div>
      </div>

      {mensaje && (
        <Toast
          tipo={mensaje.tipo === "exito" ? "exito" : "error"}
          mensaje={mensaje.texto}
          onClose={() => setMensaje(null)}
        />
      )}

      {cargando ? (
        <div className="text-slate-400 text-sm">Cargando reporte...</div>
      ) : (
        resumen && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-sm text-slate-500">Ventas realizadas</div>
                <div className="text-3xl font-bold text-slate-800 mt-1">
                  {resumen.cantidad_ventas}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-sm text-slate-500">Ingresos del día</div>
                <div className="text-3xl font-bold text-slate-800 mt-1">
                  {formatCurrency(resumen.total_ingresos)}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-sm text-emerald-700">Ganancia del día</div>
                <div className="text-3xl font-bold text-emerald-700 mt-1">
                  {formatCurrency(resumen.ganancia_total)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700 text-sm">
                  Productos más vendidos {esHoyMostrado ? "hoy" : "ese día"}
                </h2>
              </div>

              {resumen.top_productos.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  No hubo ventas registradas {esHoyMostrado ? "hoy todavía" : "ese día"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Producto</th>
                      <th className="px-4 py-2 font-medium text-center">Unidades vendidas</th>
                      <th className="px-4 py-2 font-medium text-right">Total generado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.top_productos.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-800 font-medium">{p.nombre}</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {p.unidades_vendidas}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatCurrency(p.total_generado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ventas del día, con opción de anular */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700 text-sm">
                  Ventas {esHoyMostrado ? "de hoy" : "de ese día"}
                </h2>
              </div>

              {ventas.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  Sin ventas registradas
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Hora</th>
                      <th className="px-4 py-2 font-medium text-right">Total</th>
                      <th className="px-4 py-2 font-medium text-center">Estado</th>
                      <th className="px-4 py-2 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => (
                      <tr
                        key={v.id}
                        className={`border-t border-slate-100 ${v.anulada ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3 text-slate-500">#{v.id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(v.creado_en).toLocaleTimeString("es-PE")}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatCurrency(v.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.anulada ? (
                            <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                              Anulada
                            </span>
                          ) : (
                            <span className="text-xs bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">
                              Válida
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!v.anulada && (
                            <button
                              onClick={() => manejarAnular(v)}
                              disabled={anulandoId === v.id}
                              className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
                            >
                              {anulandoId === v.id ? "Anulando..." : "Anular"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
