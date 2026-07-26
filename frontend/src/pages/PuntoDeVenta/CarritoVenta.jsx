import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../../utils/formatCurrency";

export default function CarritoVenta({
  items,
  onIncrementar,
  onDecrementar,
  onEliminar,
}) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl m-4"
      >
        Escanea un producto con la pistola para empezar la venta
      </motion.div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-slate-500 text-left z-10">
          <tr>
            <th className="py-2 font-medium">Producto</th>
            <th className="py-2 font-medium text-right">Precio</th>
            <th className="py-2 font-medium text-center">Cantidad</th>
            <th className="py-2 font-medium text-right">Subtotal</th>
            <th className="py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.tr
                key={item.producto_id}
                layout
                initial={{ opacity: 0, y: -10, backgroundColor: "rgba(16,185,129,0.15)" }}
                animate={{ opacity: 1, y: 0, backgroundColor: "rgba(16,185,129,0)" }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="border-t border-slate-100"
              >
                <td className="py-3 text-slate-800 font-medium">{item.nombre}</td>
                <td className="py-3 text-right text-slate-600">
                  {formatCurrency(item.precio_venta)}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onDecrementar(item.producto_id)}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>

                    {/* key={item.cantidad}: al cambiar, React remonta este span y
                        dispara la animación de "pop" — feedback inmediato de que
                        el escaneo (o el clic) sí se registró. */}
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={item.cantidad}
                        initial={{ scale: 1.4, opacity: 0.4 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="w-6 text-center font-medium inline-block"
                      >
                        {item.cantidad}
                      </motion.span>
                    </AnimatePresence>

                    <button
                      onClick={() => onIncrementar(item.producto_id)}
                      disabled={item.cantidad >= item.stock_disponible}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-semibold transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="py-3 text-right font-semibold text-slate-800">
                  {formatCurrency(item.precio_venta * item.cantidad)}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => onEliminar(item.producto_id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Quitar del carrito"
                  >
                    ✕
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
