import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiUrl = process.env.VITE_API_URL?.trim() || (mode === 'production' ? '/api' : '')
  return {
  plugins: [react(), tailwindcss()],
  base: './', // Use relative paths for assets to work on GitHub Pages
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
  },
  server: {
    // Con VITE_API_URL=/api el front llama /api/auth/login → se reenvía a :4000/auth/login
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}})
