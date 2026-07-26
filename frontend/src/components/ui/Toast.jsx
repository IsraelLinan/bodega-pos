import { motion, AnimatePresence } from "framer-motion";

const estilos = {
  error: "bg-red-50 text-red-700 border-red-200",
  exito: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function Toast({ tipo = "info", mensaje, onClose }) {
  return (
    <AnimatePresence>
      {mensaje && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-center justify-between gap-4 border rounded-lg px-4 py-3 text-sm font-medium ${estilos[tipo]}`}
          >
            <span>{mensaje}</span>
            {onClose && (
              <button
                onClick={onClose}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Cerrar"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
