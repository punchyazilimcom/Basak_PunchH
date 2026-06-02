// ---------------------------------------------------------------------------
// Uygulama kabuğu (App shell) ve yönlendirme.
//
// Faz 1 ilerledikçe burası genişleyecek:
//   - PIN giriş ekranı  (Adım 3)
//   - Firma Cari ekranı (Adım 4)
//
// Şimdilik (Adım 1) sadece iskeletin çalıştığını doğrulayan bir karşılama
// ekranı gösteriliyor. Yönlendirme altyapısı (react-router) hazır kuruldu.
// ---------------------------------------------------------------------------
import { Routes, Route } from 'react-router-dom';
import { firebaseConfigured } from './lib/firebase';

function KarsilamaEkrani() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          border: '2px solid var(--basak-siyah)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--basak-beyaz)',
        }}
      >
        <div className="basak-baslik" style={{ padding: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>BAŞAK KIR PİDESİ</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Ödeme &amp; Cari Takip</p>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ marginTop: 0 }}>
            <strong>Faz 1 — Web Çekirdeği</strong>
            <br />
            Proje iskeleti hazır. Sıradaki adımlarda PIN girişi ve Firma Cari ekranı eklenecek.
          </p>
          <p
            style={{
              fontSize: '0.85rem',
              color: firebaseConfigured ? 'var(--durum-temiz)' : 'var(--durum-borclu)',
              fontWeight: 700,
            }}
          >
            {firebaseConfigured
              ? '● Firebase yapılandırması bulundu.'
              : '● Firebase .env yapılandırması bekleniyor (.env.example → .env).'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KarsilamaEkrani />} />
    </Routes>
  );
}
