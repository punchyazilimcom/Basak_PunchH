import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite yapılandırması.
// Web + Tauri (masaüstü) ortak çekirdeği. Tauri çalıştığında "TAURI_*" ortam
// değişkenlerini sağlar; bunlara göre küçük uyarlamalar yapılır. Web davranışı
// değişmez (tarayıcıda da aynı şekilde çalışır).
const tauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @/ kısayolu src/ klasörünü işaret eder
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Tauri/Capacitor gibi dosya-protokolü ortamlarında göreli yollar gerekir.
  base: './',
  // Tauri konsol çıktısını ezmesin
  clearScreen: false,
  server: {
    port: 5173,
    // Tauri sabit portu bekler; web'de de sorun çıkarmaz
    strictPort: true,
    host: true,
  },
  build: {
    // Tauri webview'i (WebView2 / WKWebView) modern; küçük çıktı için hedefi yükselt
    target: tauri ? 'es2021' : 'modules',
  },
  // Vite, "VITE_" yanında Tauri değişkenlerini de istemciye sızdırmasın diye
  // varsayılan envPrefix korunur (yalnızca VITE_).
});
