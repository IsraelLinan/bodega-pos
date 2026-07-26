import apiClient from "./client";

export async function listarCategorias() {
  const { data } = await apiClient.get("/categorias");
  return data;
}

export async function crearCategoria(nombre) {
  const { data } = await apiClient.post("/categorias", { nombre });
  return data;
}
