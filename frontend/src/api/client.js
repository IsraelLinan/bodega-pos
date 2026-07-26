import axios from "axios";

// La URL del backend se lee de una variable de entorno de Vite, para que
// en producción (o si despliegas el backend en otra máquina/puerto) solo
// tengas que cambiar el .env, sin tocar código.
// Vite expone al frontend únicamente las variables que empiezan con VITE_.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10s: si el backend no responde en ese tiempo, mejor fallar rápido que dejar la caja "colgada"
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de respuesta: centraliza el manejo de errores para que cada
// archivo de api/*.api.js no tenga que repetir la misma lógica de
// "¿vino un mensaje de error del backend, o fue un fallo de red?".
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El backend respondió, pero con un status de error (400, 404, 409, 500...)
      // Nuestros controllers de Express siempre mandan { error: "mensaje" },
      // así que lo normalizamos para que los componentes puedan hacer
      // simplemente: catch(err) => mostrar err.mensaje
      const mensaje = error.response.data?.error || "Ocurrió un error inesperado";
      return Promise.reject({ mensaje, status: error.response.status, original: error });
    }

    if (error.request) {
      // La request salió pero nunca hubo respuesta (backend caído, sin red, CORS, etc.)
      return Promise.reject({
        mensaje: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.",
        status: null,
        original: error,
      });
    }

    return Promise.reject({ mensaje: error.message, status: null, original: error });
  }
);

export default apiClient;
