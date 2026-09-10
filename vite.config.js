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

      // Framer resolves bare URL imports itself; Vite does not. The Spherical
      // Gallery pulls three from esm.sh so the file stays paste-ready, so map
      // that exact URL onto the local package — same trick as "framer" above,
      // and the exported source keeps its URL import untouched.
      "https://esm.sh/three@0.160.1": "three",
    },
  },
})
