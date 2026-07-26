require("dotenv").config();
const express = require("express");
const cors = require("cors");

const productosRoutes = require("./routes/productos.routes");
const ventasRoutes = require("./routes/ventas.routes");
const reportesRoutes = require("./routes/reportes.routes");
const categoriasRoutes = require("./routes/categorias.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck simple
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/productos", productosRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/categorias", categoriasRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
