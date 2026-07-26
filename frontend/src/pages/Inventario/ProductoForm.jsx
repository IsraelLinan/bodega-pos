import { useState } from "react";
import { crearProducto, actualizarProducto } from "../../api/productos.api";
import { crearCategoria } from "../../api/categorias.api";

export default function ProductoForm({ producto, categorias, onCancel, onGuardado }) {
  const esEdicion = Boolean(producto);

  const [form, setForm] = useState({
    codigo_barras: producto?.codigo_barras || "",
    nombre: producto?.nombre || "",
    categoria_id: producto?.categoria_id || "",
    precio_compra: producto?.precio_compra || "",
    precio_venta: producto?.precio_venta || "",
    stock_inicial: "",
    stock_minimo: producto?.stock_minimo ?? 5,
  });

  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [listaCategorias, setListaCategorias] = useState(categorias);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarAgregarCategoria() {
    if (!categoriaNueva.trim()) return;
    try {
      const nueva = await crearCategoria(categoriaNueva.trim());
      setListaCategorias((prev) => [...prev, nueva]);
      setForm((prev) => ({ ...prev, categoria_id: nueva.id }));
      setCategoriaNueva("");
    } catch (err) {
      setError(err.mensaje);
    }
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      const payloadBase = {
        nombre: form.nombre,
        categoria_id: form.categoria_id || null,
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        stock_minimo: Number(form.stock_minimo),
      };

      if (esEdicion) {
        await actualizarProducto(producto.id, payloadBase);
      } else {
        await crearProducto({
          ...payloadBase,
          codigo_barras: form.codigo_barras,
          stock_inicial: form.stock_inicial ? Number(form.stock_inicial) : 0,
        });
      }

      onGuardado();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {!esEdicion && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Código de barras
          </label>
          <input
            required
            autoFocus
            value={form.codigo_barras}
            onChange={(e) => actualizarCampo("codigo_barras", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Escanea o escribe el código"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
        <input
          required
          value={form.nombre}
          onChange={(e) => actualizarCampo("nombre", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ej. Coca Cola 500ml"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
        <select
          value={form.categoria_id}
          onChange={(e) => actualizarCampo("categoria_id", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Sin categoría</option>
          {listaCategorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>

        <div className="flex gap-2 mt-2">
          <input
            value={categoriaNueva}
            onChange={(e) => setCategoriaNueva(e.target.value)}
            placeholder="Nueva categoría..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={manejarAgregarCategoria}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700"
          >
            + Agregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Precio de compra
          </label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.precio_compra}
            onChange={(e) => actualizarCampo("precio_compra", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Precio de venta
          </label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.precio_venta}
            onChange={(e) => actualizarCampo("precio_venta", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!esEdicion && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Stock inicial
            </label>
            <input
              type="number"
              min="0"
              value={form.stock_inicial}
              onChange={(e) => actualizarCampo("stock_inicial", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Stock mínimo (alerta)
          </label>
          <input
            type="number"
            min="0"
            value={form.stock_minimo}
            onChange={(e) => actualizarCampo("stock_minimo", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
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
          {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
