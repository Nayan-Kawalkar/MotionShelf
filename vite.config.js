import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The Spherical Gallery imports three from a CDN URL so the file stays
      // paste-ready; Vite cannot resolve a bare URL, so map that exact one
      // onto the local package. The exported source keeps its URL import.
      "https://esm.sh/three@0.160.1": "three",
    },
  },
})
