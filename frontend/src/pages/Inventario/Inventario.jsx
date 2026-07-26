import { useEffect, useState, useCallback } from "react";

import { listarProductos, listarStockBajo } from "../../api/productos.api";
import { listarCategorias } from "../../api/categorias.api";

import ProductoForm from "./ProductoForm";
import EntradaStock from "./EntradaStock";
import AlertasStockBajo from "./AlertasStockBajo";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import { formatCurrency } from "../../utils/formatCurrency";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [modalProducto, setModalProducto] = useState(null); // null | { modo: 'crear' } | { modo: 'editar', producto }
  const [modalEntrada, setModalEntrada] = useState(null); // null | producto

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [listaProductos, listaCategorias, listaStockBajo] = await Promise.all([
        listarProductos(),
        listarCategorias(),
        listarStockBajo(),
      ]);
      setProductos(listaProductos);
      setCategorias(listaCategorias);
      setStockBajo(listaStockBajo);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.mensaje });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function cerrarModales() {
    setModalProducto(null);
    setModalEntrada(null);
  }

  function manejarGuardadoProducto() {
    cerrarModales();
    setMensaje({ tipo: "exito", texto: "Producto guardado correctamente" });
    cargarDatos();
  }

  function manejarGuardadoEntrada() {
    cerrarModales();
    setMensaje({ tipo: "exito", texto: "Entrada de stock registrada" });
    cargarDatos();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inventario</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {productos.length} producto(s) activo(s)
          </p>
        </div>
        <button
          onClick={() => setModalProducto({ modo: "crear" })}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
        >
          + Nuevo producto
        </button>
      </div>

      {mensaje && (
        <Toast
          tipo={mensaje.tipo === "exito" ? "exito" : "error"}
          mensaje={mensaje.texto}
          onClose={() => setMensaje(null)}
        />
      )}

      <AlertasStockBajo productos={stockBajo} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium text-right">P. Compra</th>
              <th className="px-4 py-3 font-medium text-right">P. Venta</th>
              <th className="px-4 py-3 font-medium text-center">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}

            {!cargando && productos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Aún no hay productos registrados
                </td>
              </tr>
            )}

            {productos.map((p) => {
              const stockBajoUmbral = p.stock_actual <= p.stock_minimo;
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{p.nombre}</div>
                    <div className="text-xs text-slate-400">{p.codigo_barras}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.categoria_nombre || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(p.precio_compra)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {formatCurrency(p.precio_venta)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full text-xs font-semibold ${
                        stockBajoUmbral
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.stock_actual}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setModalEntrada(p)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        + Stock
                      </button>
                      <button
                        onClick={() => setModalProducto({ modo: "editar", producto: p })}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalProducto && (
        <Modal
          titulo={modalProducto.modo === "crear" ? "Nuevo producto" : "Editar producto"}
          onClose={cerrarModales}
        >
          <ProductoForm
            producto={modalProducto.modo === "editar" ? modalProducto.producto : null}
            categorias={categorias}
            onCancel={cerrarModales}
            onGuardado={manejarGuardadoProducto}
          />
        </Modal>
      )}

      {modalEntrada && (
        <Modal titulo="Registrar entrada de stock" onClose={cerrarModales}>
          <EntradaStock
            producto={modalEntrada}
            onCancel={cerrarModales}
            onGuardado={manejarGuardadoEntrada}
          />
        </Modal>
      )}
    </div>
  );
}
