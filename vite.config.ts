import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite yapılandırması.
// NOT: Sonraki fazlarda Tauri (.exe) ve Capacitor (mobil) eklenebilecek
// şekilde modüler tutuldu. Tauri için base './' ve sabit port gerekebilir;
// o faza gelince burası genişletilecek.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @/ kısayolu src/ klasörünü işaret eder
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
