# 🏪 Bodega POS — Sistema de Inventario y Ventas

Sistema completo de punto de venta (POS) y gestión de inventarios para bodegas, diseñado para **evitar pérdidas de productos**, llevar un **control exacto de entradas/salidas** de stock, y **agilizar el cobro** mediante una pistola lectora de código de barras.

## ✨ Características

### 📦 Módulo de Inventario
- CRUD de productos (nombre, precio de compra, precio de venta, categoría, código de barras)
- Alertas automáticas de stock bajo (configurable por producto)
- Historial completo y auditable de entradas y salidas de stock
- Categorías creables sobre la marcha desde el mismo formulario de producto

### 🧾 Módulo de Ventas (Caja / POS)
- Interfaz optimizada para pistola lectora de código de barras (detección automática por velocidad de tecleo, sin necesidad de que el input tenga foco)
- El producto escaneado se agrega solo al carrito; si se vuelve a escanear, aumenta la cantidad
- Cálculo automático de subtotal, total y cambio a devolver
- Confirmación de venta transaccional: descuenta stock real en base de datos con bloqueo de fila (evita condiciones de carrera entre ventas simultáneas)
- **Anulación de ventas**: revierte el stock automáticamente y deja registro auditable (nunca se borra ni edita la venta original)

### 📊 Módulo de Reportes
- Ventas del día (ingresos totales)
- Ganancia del día (ventas − costo de productos vendidos)
- Top de productos más vendidos
- Selector de fecha para consultar cualquier día pasado
- Exportación a Excel (`.xlsx`) con resumen + detalle de ventas

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TailwindCSS v4 + Framer Motion |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 (vía Docker) |
| Comunicación | REST API (Axios) |

## 📁 Estructura del proyecto

```
bodega-pos/
├── docker-compose.yml       # Levanta PostgreSQL + backend
├── schema.sql               # Esquema completo de la base de datos
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db/pool.js
│       ├── controllers/     # productos, ventas, reportes, categorias
│       └── routes/
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/              # cliente HTTP + funciones por módulo
        ├── hooks/            # useBarcodeScanner, useCart
        ├── components/       # layout (Sidebar, Navbar) y ui (Modal, Toast)
        ├── pages/
        │   ├── PuntoDeVenta/
        │   ├── Inventario/
        │   └── Reportes/
        └── utils/
```

## 🚀 Cómo correrlo localmente

### Requisitos previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 18+ (solo para correr el frontend fuera de Docker)

### 1. Backend + base de datos

```bash
docker compose up --build
```

Esto levanta PostgreSQL (aplicando `schema.sql` automáticamente la primera vez) y el backend en `http://localhost:4000`.

Verifica que esté vivo:
```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**.

### 3. Simular la pistola de código de barras (sin hardware)

En la pantalla de Punto de Venta, abre la consola del navegador (`Cmd+Option+I` en Mac) y ejecuta:

```javascript
function simularEscaneo(codigo) {
  let i = 0;
  function enviarSiguienteTecla() {
    if (i < codigo.length) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: codigo[i], bubbles: true }));
      i++;
      setTimeout(enviarSiguienteTecla, 5);
    } else {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
  }
  enviarSiguienteTecla();
}

simularEscaneo("7501234567890"); // usa un código de barras ya registrado
```

Con una pistola física (cualquier lector USB en modo teclado/HID) no se necesita ningún truco: funciona automáticamente.

## 📡 Endpoints principales de la API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/productos` | Lista productos activos |
| `GET` | `/api/productos/buscar/:codigo_barras` | Búsqueda por escaneo |
| `GET` | `/api/productos/alertas/stock-bajo` | Productos bajo su stock mínimo |
| `POST` | `/api/productos` | Crear producto |
| `PUT` | `/api/productos/:id` | Editar producto |
| `POST` | `/api/productos/:id/entradas` | Registrar reabastecimiento |
| `GET` | `/api/productos/:id/movimientos` | Historial de stock de un producto |
| `GET` / `POST` | `/api/categorias` | Listar / crear categorías |
| `POST` | `/api/ventas` | Confirmar una venta (transaccional) |
| `GET` | `/api/ventas?fecha=` | Ventas de un día |
| `GET` | `/api/ventas/:id` | Detalle de una venta |
| `POST` | `/api/ventas/:id/anular` | Anular venta y revertir stock |
| `GET` | `/api/reportes/dia?fecha=` | Resumen de ventas/ganancia del día |
| `GET` | `/api/reportes/rango?desde=&hasta=` | Resumen por rango de fechas |

## 🗄️ Modelo de datos

5 tablas relacionales: `categorias`, `productos`, `movimientos_inventario` (auditoría de todo cambio de stock), `ventas`, `detalle_ventas`. Ver `schema.sql` para el detalle completo, incluyendo comentarios sobre las decisiones de diseño (soft delete, precios "congelados" por venta, tipos de movimiento, etc.).

## 🔒 Decisiones de diseño clave

- **El stock nunca se edita directamente**: todo cambio pasa por `movimientos_inventario`, dejando trazabilidad completa (útil para detectar mermas/pérdidas).
- **Los precios se calculan siempre en el backend**, nunca se confía en lo que mande el frontend — evita manipulación de precios desde el cliente.
- **Transacciones con bloqueo de fila (`FOR UPDATE`)** en ventas, entradas de stock y anulaciones, para evitar condiciones de carrera si hay más de una caja operando a la vez.
- **Zona horaria explícita (`America/Lima`)** en los reportes, para que "ventas del día" refleje el día real de la bodega sin importar cómo esté configurado el servidor.

## 📌 Pendientes / posibles siguientes pasos

- Autenticación de usuarios/cajeros (actualmente de un solo usuario)
- Impresión de comprobante/ticket
- Despliegue en servidor de producción

---

Desarrollado por [Israel Linan](https://github.com/IsraelLinan).
