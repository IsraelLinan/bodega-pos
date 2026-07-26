export default function Navbar() {
  const hoy = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
      <span className="text-sm text-slate-500 capitalize">{hoy}</span>
      {/* Aquí más adelante podemos mostrar, por ejemplo, un indicador
          de conexión con el backend o el total de ventas del día en vivo. */}
    </header>
  );
}
