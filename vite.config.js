import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src', 'renderer'),
  base: './', // Esto es crucial para que Electron resuelva bien las rutas relativas
  build: {
    outDir: path.join(__dirname, 'dist-react'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
