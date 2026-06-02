// ---------------------------------------------------------------------------
// Firebase bağlantısı (tek merkez).
// Tüm Firestore/Auth erişimi bu dosyadan dışa aktarılan nesneler üzerinden olur.
// Yapılandırma .env dosyasından okunur (anahtarlar repoya girmez).
//
// Kullanılan servisler: Firestore + Authentication (Anonymous). Analytics YOK.
//
// Modülerlik notu: Tauri (.exe) ve Capacitor (mobil) fazlarında da aynı Firebase
// yapılandırması kullanılacağı için bağlantı burada izole edildi.
// ---------------------------------------------------------------------------
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

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
export const auth: Auth = getAuth(app);

// ---------------------------------------------------------------------------
// Anonim oturum.
// Firestore kurallarını ileride "request.auth != null" ile sıkılaştırabilmek
// için her cihaz uygulama açılışında anonim olarak oturum açar. Anonim kullanıcı
// kalıcıdır (aynı tarayıcıda aynı uid). PIN mantığı bunun ÜSTÜNDE çalışır:
// anonim oturum yalnızca Firestore erişimi içindir, yetkilendirme PIN ile olur.
//
// NOT: Firebase Console > Authentication > Sign-in method bölümünden
// "Anonymous" sağlayıcısının ETKİN olması gerekir.
// ---------------------------------------------------------------------------
let anonimSozu: Promise<void> | null = null;

export function anonimGirisSagla(): Promise<void> {
  if (!firebaseConfigured) return Promise.resolve();
  if (auth.currentUser) return Promise.resolve();
  if (!anonimSozu) {
    anonimSozu = signInAnonymously(auth)
      .then(() => undefined)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(
          '[Firebase] Anonim giriş başarısız. Console > Authentication > ' +
            'Sign-in method > Anonymous etkin mi?',
          e,
        );
        // Hata olsa da uygulamayı kilitleme; kurallar "if true" iken yine çalışır.
        anonimSozu = null;
      });
  }
  return anonimSozu;
}
