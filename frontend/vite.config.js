import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // In sviluppo il backend gira separatamente (es. `npm run dev` in backend/);
      // in produzione questo non serve, e' nginx a fare da proxy (vedi nginx.conf).
      "/api": "http://localhost:4000",
    },
  },
});
