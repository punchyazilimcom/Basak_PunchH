// ---------------------------------------------------------------------------
// Uygulama kabuğu (App shell) ve oturum koruması.
//
//   - Oturum yoksa  -> PIN giriş ekranı.
//   - Oturum varsa  -> uygulama (Faz 1: Firma Cari ekranı geldiğinde bağlanacak).
//
// Adım 4'te Firma Cari ekranı buraya korumalı route olarak eklenecek.
// ---------------------------------------------------------------------------
import { useAuth } from './hooks/useAuth';
import PinGiris from './pages/PinGiris';

/** Giriş sonrası geçici ana ekran (Adım 4'te Firma Cari ile değişecek). */
function AnaEkran() {
  const { oturum, cikisYap } = useAuth();
  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        className="basak-baslik"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
        }}
      >
        <strong>BAŞAK · Ödeme &amp; Cari Takip</strong>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <small>
            {oturum?.rol}
            {oturum?.sube ? ` · ${oturum.sube}` : ''}
          </small>
          <button className="basak-btn" style={{ padding: '0.3rem 0.7rem' }} onClick={cikisYap}>
            Çıkış
          </button>
        </span>
      </header>
      <main style={{ padding: '1.5rem' }}>
        <p>
          <strong>Giriş başarılı.</strong> Firma Cari ekranı bir sonraki adımda (Adım 4) buraya
          eklenecek.
        </p>
      </main>
    </div>
  );
}

export default function App() {
  const { oturum } = useAuth();
  return oturum ? <AnaEkran /> : <PinGiris />;
}
