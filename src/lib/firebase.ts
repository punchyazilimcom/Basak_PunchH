// ---------------------------------------------------------------------------
// Firebase bağlantısı (tek merkez).
// Tüm Firestore/Auth erişimi bu dosyadan dışa aktarılan nesneler üzerinden olur.
// Yapılandırma .env dosyasından okunur (anahtarlar repoya girmez).
//
// Modülerlik notu: Tauri (.exe) ve Capacitor (mobil) fazlarında da aynı Firebase
// yapılandırması kullanılacağı için bağlantı burada izole edildi.
// ---------------------------------------------------------------------------
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Vite, "import.meta.env" üzerinden "VITE_" ön ekli değişkenleri sağlar.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// .env doldurulmamışsa geliştiriciyi erkenden uyar (uygulama yine açılır).
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!firebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Firebase] .env yapılandırması eksik. ".env.example" dosyasını ".env" olarak ' +
      'kopyalayıp Firebase anahtarlarını doldurun.',
  );
}

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
