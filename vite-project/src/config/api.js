// Configuración de la API
// Cambia entre desarrollo y producción aquí
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5000'
  },
  production: {
    API_BASE_URL: 'https://api-restaurante-nu.vercel.app'
  }
}

// Cambiar entre 'development' y 'production' según necesites
const CURRENT_ENV = 'production' // Cambia a 'development' para desarrollo local

export const API_BASE_URL = config[CURRENT_ENV].API_BASE_URL

// Función helper para construir URLs de endpoints
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`

console.log('🌐 API configurada para:', CURRENT_ENV, '- URL:', API_BASE_URL)