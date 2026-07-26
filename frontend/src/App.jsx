import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";

import PuntoDeVenta from "./pages/PuntoDeVenta/PuntoDeVenta";
import Inventario from "./pages/Inventario/Inventario";
import Reportes from "./pages/Reportes/Reportes";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<PuntoDeVenta />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/reportes" element={<Reportes />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
