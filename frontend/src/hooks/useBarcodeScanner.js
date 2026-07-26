import { useEffect, useRef, useCallback } from "react";

/**
 * useBarcodeScanner
 *
 * Las pistolas lectoras de código de barras funcionan como un teclado:
 * "escriben" cada carácter del código muy rápido y al final envían un Enter.
 * No hay una API especial del navegador para "detectar una pistola" —
 * la diferenciamos de una persona escribiendo por dos señales:
 *
 *   1. Velocidad: una pistola escribe un código de ~13 caracteres en
 *      milisegundos. Una persona tipeando tarda muchísimo más entre tecla y tecla.
 *   2. Termina con Enter: casi todas las pistolas configuradas en modo
 *      "teclado" (HID) envían un Enter automático al final del escaneo.
 *
 * Estrategia: escuchamos keydown a nivel de documento (así no depende de
 * qué elemento tenga foco), vamos acumulando caracteres en un buffer, y
 * si pasa más de `resetTimeoutMs` sin una tecla nueva, se asume que el
 * buffer quedó "viejo" (alguien tipeando normal) y se limpia.
 *
 * @param {(codigo: string) => void} onScan - callback disparado con el código completo al detectar Enter
 * @param {object} options
 * @param {boolean} options.enabled - permite pausar el listener (ej. cuando hay un modal abierto)
 * @param {number} options.resetTimeoutMs - ms de inactividad para descartar el buffer (default 50ms)
 * @param {number} options.minLength - largo mínimo para considerar el buffer un código válido (default 3)
 */
export function useBarcodeScanner(onScan, options = {}) {
  const { enabled = true, resetTimeoutMs = 50, minLength = 3 } = options;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  // Mantenemos la referencia al callback actualizada sin tener que
  // re-suscribir el listener cada vez que el componente padre re-renderiza.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event) {
      // Si el usuario está escribiendo dentro de un input/textarea normal
      // (ej. el campo de búsqueda manual, o un formulario de producto),
      // no interceptamos esas teclas como si fueran de la pistola.
      const target = event.target;
      const isEditableField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isEditableField && !target.dataset.barcodeCapture) {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si pasó demasiado tiempo desde la última tecla, el buffer anterior
      // ya no es confiable (probablemente eran teclas sueltas, no un escaneo).
      if (elapsed > resetTimeoutMs) {
        bufferRef.current = "";
      }

      if (event.key === "Enter") {
        const codigo = bufferRef.current.trim();
        bufferRef.current = "";

        if (codigo.length >= minLength) {
          event.preventDefault();
          onScanRef.current(codigo);
        }
        return;
      }

      // Ignoramos teclas de control (Shift, Tab, flechas, etc.) que no
      // forman parte del código en sí.
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, resetTimeoutMs, minLength]);

  return { resetBuffer };
}
