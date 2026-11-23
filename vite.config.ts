import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves this project from /Guilded-Frontend/, not the domain root.
  // Relative asset paths also keep preview/custom deployment paths portable.
  base: './',
  plugins: [react()],
  server: { host: '0.0.0.0' },
})
