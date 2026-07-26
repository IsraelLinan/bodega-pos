import { useState, useCallback } from "react";

import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useCart } from "../../hooks/useCart";
import { buscarProductoPorCodigoBarras } from "../../api/productos.api";
import { confirmarVenta } from "../../api/ventas.api";

import CarritoVenta from "./CarritoVenta";
import ResumenPago from "./ResumenPago";
import Toast from "../../components/ui/Toast";

export default function PuntoDeVenta() {
  const {
    items,
    subtotal,
    agregarProducto,
    incrementarCantidad,
    decrementarCantidad,
    eliminarProducto,
    limpiarCarrito,
  } = useCart();

  const [mensaje, setMensaje] = useState(null); // { tipo: 'error'|'exito', texto }
  const [montoPagado, setMontoPagado] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  // --- Escaneo con la pistola ---
  const manejarEscaneo = useCallback(
    async (codigoBarras) => {
      setMensaje(null);
      setBuscando(true);
      try {
        const producto = await buscarProductoPorCodigoBarras(codigoBarras);
        const resultado = agregarProducto(producto);

        if (!resultado.ok) {
          setMensaje({ tipo: "error", texto: resultado.motivo });
        }
      } catch (err) {
        // err.mensaje viene normalizado por el interceptor en api/client.js
        // (ej. "Producto no encontrado" con código 404)
        setMensaje({ tipo: "error", texto: err.mensaje });
      } finally {
        setBuscando(false);
      }
    },
    [agregarProducto]
  );

  // Se pausa el listener mientras se está confirmando una venta, para que
  // un escaneo accidental no altere el carrito a mitad de la transacción.
  useBarcodeScanner(manejarEscaneo, { enabled: !confirmando });

  // --- Confirmar venta ---
  const manejarConfirmarVenta = useCallback(async () => {
    setMensaje(null);
    setConfirmando(true);
    try {
      const payloadItems = items.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
      }));

      const resultado = await confirmarVenta({
        items: payloadItems,
        monto_pagado: Number(montoPagado),
      });

      const cambio = Number(resultado.venta.cambio);
      setMensaje({
        tipo: "exito",
        texto: `Venta #${resultado.venta.id} confirmada. Cambio a devolver: S/ ${cambio.toFixed(2)}`,
      });

      limpiarCarrito();
      setMontoPagado("");
    } catch (err) {
      // Ej: "Stock insuficiente para X" si el stock cambió justo antes de
      // confirmar, o "Monto pagado insuficiente" — el backend siempre
      // manda el mensaje exacto, así que solo lo mostramos tal cual.
      setMensaje({ tipo: "error", texto: err.mensaje });
    } finally {
      setConfirmando(false);
    }
  }, [items, montoPagado, limpiarCarrito]);

  return (
    <div className="h-full flex">
      {/* Columna izquierda: carrito */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="p-4 pb-0">
          <h1 className="text-xl font-semibold text-slate-800">Punto de Venta</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {buscando ? "Buscando producto..." : "Listo para escanear"}
          </p>
        </div>

        {mensaje && (
          <div className="px-4 pt-3">
            <Toast
              tipo={mensaje.tipo === "exito" ? "exito" : "error"}
              mensaje={mensaje.texto}
              onClose={() => setMensaje(null)}
            />
          </div>
        )}

        <CarritoVenta
          items={items}
          onIncrementar={incrementarCantidad}
          onDecrementar={decrementarCantidad}
          onEliminar={eliminarProducto}
        />
      </div>

      {/* Columna derecha: resumen de pago */}
      <div className="w-96 shrink-0 flex flex-col">
        <ResumenPago
          subtotal={subtotal}
          montoPagado={montoPagado}
          onCambiarMontoPagado={setMontoPagado}
          onConfirmarVenta={manejarConfirmarVenta}
          confirmando={confirmando}
          carritoVacio={items.length === 0}
        />
      </div>
    </div>
  );
}
