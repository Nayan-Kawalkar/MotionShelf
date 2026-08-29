import { fileURLToPath, URL } from "node:url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Showcased components are Framer code components and import from
      // "framer". See src/lib/framer-shim.js.
      framer: fileURLToPath(new URL("./src/lib/framer-shim.js", import.meta.url)),
    },
  },
})
