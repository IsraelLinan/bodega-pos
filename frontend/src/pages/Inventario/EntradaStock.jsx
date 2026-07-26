import { useState } from "react";
import { registrarEntradaStock } from "../../api/productos.api";

export default function EntradaStock({ producto, onCancel, onGuardado }) {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!cantidad || Number(cantidad) <= 0) {
      setError("Ingresa una cantidad mayor a 0");
      return;
    }

    setGuardando(true);
    try {
      await registrarEntradaStock(producto.id, {
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
      });
      onGuardado();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <div className="font-medium text-slate-800">{producto.nombre}</div>
        <div className="text-slate-500">Stock actual: {producto.stock_actual} unidades</div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Cantidad que ingresa
        </label>
        <input
          autoFocus
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ej. 20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Motivo (opcional)
        </label>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ej. Compra a proveedor Backus"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {guardando ? "Registrando..." : "Registrar entrada"}
        </button>
      </div>
    </form>
  );
}
