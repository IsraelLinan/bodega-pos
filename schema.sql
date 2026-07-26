-- =========================================================
-- SISTEMA DE INVENTARIO Y VENTAS - BODEGA
-- Esquema de Base de Datos (PostgreSQL)
-- =========================================================

-- Extensión para UUIDs (opcional pero recomendable para IDs no secuenciales)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- 1. CATEGORIAS
-- ---------------------------------------------------------
CREATE TABLE categorias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(80) NOT NULL UNIQUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. PRODUCTOS
-- ---------------------------------------------------------
CREATE TABLE productos (
    id                  SERIAL PRIMARY KEY,
    codigo_barras       VARCHAR(50) NOT NULL UNIQUE,   -- lo que lee la pistola
    nombre              VARCHAR(150) NOT NULL,
    categoria_id        INTEGER REFERENCES categorias(id) ON DELETE SET NULL,

    precio_compra       NUMERIC(10,2) NOT NULL CHECK (precio_compra >= 0),
    precio_venta        NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),

    stock_actual        INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo        INTEGER NOT NULL DEFAULT 5,   -- umbral para alerta de stock bajo

    activo              BOOLEAN NOT NULL DEFAULT TRUE, -- soft delete (nunca borrar productos con historial)
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);

-- ---------------------------------------------------------
-- 3. MOVIMIENTOS_INVENTARIO
--    Registro auditable de TODO cambio de stock.
--    Esta tabla es la clave para "evitar pérdidas":
--    nunca se edita stock_actual directamente sin dejar rastro.
-- ---------------------------------------------------------
CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA_VENTA', 'AJUSTE_MERMA', 'AJUSTE_POSITIVO');

CREATE TABLE movimientos_inventario (
    id              SERIAL PRIMARY KEY,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    tipo            tipo_movimiento NOT NULL,
    cantidad        INTEGER NOT NULL,              -- siempre positivo; el 'tipo' indica si suma o resta
    stock_resultante INTEGER NOT NULL,              -- foto del stock luego del movimiento (auditoría)
    motivo          VARCHAR(255),                   -- ej: "Abastecimiento proveedor X", "Producto vencido"
    referencia_venta_id INTEGER,                    -- FK opcional a ventas, se define abajo
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(creado_en);

-- ---------------------------------------------------------
-- 4. VENTAS (cabecera del ticket/comprobante)
-- ---------------------------------------------------------
CREATE TABLE ventas (
    id              SERIAL PRIMARY KEY,
    subtotal        NUMERIC(10,2) NOT NULL,
    total           NUMERIC(10,2) NOT NULL,
    monto_pagado    NUMERIC(10,2) NOT NULL,
    cambio          NUMERIC(10,2) NOT NULL,
    ganancia_total  NUMERIC(10,2) NOT NULL,   -- suma de (precio_venta - precio_compra) * cantidad, calculado al momento de vender

    -- Nunca se borra una venta (rompería el historial/auditoría). En vez de
    -- eso, se marca como anulada y se revierte el stock mediante un
    -- movimiento de inventario nuevo (ver AJUSTE_POSITIVO).
    anulada         BOOLEAN NOT NULL DEFAULT FALSE,
    anulada_en      TIMESTAMPTZ,
    motivo_anulacion VARCHAR(255),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ventas_fecha ON ventas(creado_en);

-- Ahora que 'ventas' existe, agregamos la FK diferida en movimientos_inventario
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT fk_movimientos_venta
    FOREIGN KEY (referencia_venta_id) REFERENCES ventas(id);

-- ---------------------------------------------------------
-- 5. DETALLE_VENTAS (líneas del ticket, 1 por producto vendido)
-- ---------------------------------------------------------
CREATE TABLE detalle_ventas (
    id                  SERIAL PRIMARY KEY,
    venta_id            INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id         INTEGER NOT NULL REFERENCES productos(id),

    -- Se "congelan" estos valores al momento de la venta.
    -- Si mañana cambias el precio_venta del producto, las ventas pasadas
    -- deben seguir mostrando el precio real que se cobró ese día.
    precio_unitario     NUMERIC(10,2) NOT NULL,
    precio_compra_unitario NUMERIC(10,2) NOT NULL,
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    subtotal_linea      NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);
