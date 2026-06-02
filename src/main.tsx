// Uygulamanın giriş noktası: React'i DOM'a bağlar.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { anonimGirisSagla } from './lib/firebase';
import './styles/global.css';

// Açılışta anonim Firebase oturumunu başlat (Firestore erişimi için).
// Yetkilendirme yine PIN ile yapılır; bu sadece veri katmanı bağlantısıdır.
anonimGirisSagla();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
