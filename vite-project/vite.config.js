import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuración para GitHub Pages
  // La URL será: https://BRYAN-FMV.github.io/restaurenteWeb/
  base: '/restaurenteWeb/',
})
