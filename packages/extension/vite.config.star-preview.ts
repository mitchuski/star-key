import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// The web experiment contains only the local reader, never the extension bridge.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-star-preview',
    emptyOutDir: true,
    rollupOptions: { input: { star: resolve(__dirname, 'star.html') } },
  },
});
