import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) so phone can access via Wi-Fi & Tunnel
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5070',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5070',
        ws: true,
      },
    },
  },
});
