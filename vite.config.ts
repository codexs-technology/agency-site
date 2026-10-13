import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: 'src/web/entry.tsx',
      output: { entryFileNames: 'assets/app.js', assetFileNames: 'assets/[name][extname]' },
    },
  },
});