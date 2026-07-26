export default function AlertasStockBajo({ productos }) {
  if (productos.length === 0) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1.5">
        <span>⚠️</span>
        <span>{productos.length} producto(s) con stock bajo — hora de reabastecer</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {productos.map((p) => (
          <span
            key={p.id}
            className="text-xs bg-white border border-amber-200 text-amber-700 rounded-full px-2.5 py-1"
          >
            {p.nombre} · quedan {p.stock_actual}
          </span>
        ))}
      </div>
    </div>
  );
}
