import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/**
 * useCart
 *
 * Maneja el estado del carrito de venta: agregar productos (respetando el
 * stock disponible), aumentar/disminuir cantidad, quitar productos, y
 * calcular subtotal/total.
 *
 * Nota importante: la validación de stock aquí es "de cortesía" — evita que
 * el cajero arme un carrito imposible de vender. La validación REAL y
 * definitiva ocurre en el backend (con bloqueo de fila y transacción) al
 * confirmar la venta, porque el stock pudo cambiar entre que se escaneó el
 * producto y que se confirma el pago.
 */
export function useCart() {
  const [items, setItems] = useState([]);

  // Espejo síncrono del estado, para poder validar stock disponible en el
  // mismo instante en que se escanea (sin esperar al próximo render).
  const itemsRef = useRef([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * Agrega un producto (viene de la respuesta de buscarProductoPorCodigoBarras).
   * Si ya existe en el carrito, aumenta su cantidad en 1.
   * Devuelve { ok: true } o { ok: false, motivo } para que la UI muestre
   * un mensaje claro (ej. "sin stock suficiente").
   */
  const agregarProducto = useCallback((producto) => {
    const enCarrito = itemsRef.current.find((i) => i.producto_id === producto.id);
    const cantidadDeseada = (enCarrito?.cantidad || 0) + 1;

    if (producto.stock_actual <= 0) {
      return { ok: false, motivo: `"${producto.nombre}" no tiene stock disponible` };
    }

    if (cantidadDeseada > producto.stock_actual) {
      return {
        ok: false,
        motivo: `Solo quedan ${producto.stock_actual} unidades de "${producto.nombre}"`,
      };
    }

    setItems((prev) => {
      const index = prev.findIndex((i) => i.producto_id === producto.id);
      if (index >= 0) {
        const copia = [...prev];
        copia[index] = { ...copia[index], cantidad: copia[index].cantidad + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          codigo_barras: producto.codigo_barras,
          nombre: producto.nombre,
          precio_venta: Number(producto.precio_venta),
          precio_compra: Number(producto.precio_compra),
          cantidad: 1,
          stock_disponible: producto.stock_actual,
        },
      ];
    });

    return { ok: true };
  }, []);

  const incrementarCantidad = useCallback((productoId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.producto_id === productoId && item.cantidad < item.stock_disponible
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      )
    );
  }, []);

  const decrementarCantidad = useCallback((productoId) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.producto_id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        // si la cantidad llega a 0, el producto sale solo del carrito
        .filter((item) => item.cantidad > 0)
    );
  }, []);

  const eliminarProducto = useCallback((productoId) => {
    setItems((prev) => prev.filter((item) => item.producto_id !== productoId));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0),
    [items]
  );

  const cantidadTotalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items]
  );

  return {
    items,
    subtotal,
    cantidadTotalItems,
    agregarProducto,
    incrementarCantidad,
    decrementarCantidad,
    eliminarProducto,
    limpiarCarrito,
  };
}
