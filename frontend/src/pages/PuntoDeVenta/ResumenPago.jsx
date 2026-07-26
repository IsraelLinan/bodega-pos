import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../../utils/formatCurrency";

export default function ResumenPago({
  subtotal,
  montoPagado,
  onCambiarMontoPagado,
  onConfirmarVenta,
  confirmando,
  carritoVacio,
}) {
  const total = subtotal; // sin impuestos por ahora; si se agrega IGV, solo se toca aquí
  const montoPagadoNumero = Number(montoPagado) || 0;
  const cambio = montoPagadoNumero - total;

  const puedeConfirmar =
    !carritoVacio && !confirmando && montoPagadoNumero >= total && total > 0;

  return (
    <div className="border-t border-slate-200 bg-white p-5 space-y-4">
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold text-slate-800 pt-1 border-t border-slate-100">
          <span>Total a pagar</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Monto pagado por el cliente
        </label>
        <input
          type="number"
          step="0.10"
          min="0"
          value={montoPagado}
          onChange={(e) => onCambiarMontoPagado(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3">
        <span className="text-sm font-medium text-slate-500">Cambio a devolver</span>
        {/* key={cambio}: al cambiar el valor, re-monta el span y dispara el
            "pop" — feedback visual inmediato de que el cálculo se actualizó. */}
        <AnimatePresence mode="popLayout">
          <motion.span
            key={cambio.toFixed(2)}
            initial={{ scale: 1.25, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className={`text-xl font-bold inline-block ${
              cambio < 0 ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {formatCurrency(cambio > 0 ? cambio : 0)}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onConfirmarVenta}
        disabled={!puedeConfirmar}
        className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {confirmando ? "Confirmando venta..." : "Confirmar Venta"}
      </motion.button>
    </div>
  );
}
