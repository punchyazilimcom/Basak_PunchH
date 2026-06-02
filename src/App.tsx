// ---------------------------------------------------------------------------
// Uygulama kabuğu (App shell) ve oturum koruması.
//
//   - Oturum yoksa  -> PIN giriş ekranı.
//   - Oturum varsa  -> Firma Cari ekranı (Faz 1 çekirdek modülü).
//
// Faz 2'de özet panosu, Faz 3'te dönem yönetimi üst menüye eklenecek.
// ---------------------------------------------------------------------------
import { useAuth } from './hooks/useAuth';
import { DonemProvider } from './hooks/useDonem';
import PinGiris from './pages/PinGiris';
import FirmaCari from './pages/FirmaCari';

function UstBar() {
  const { oturum, cikisYap } = useAuth();
  return (
    <header
      className="basak-baslik"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.svg" alt="Başak" width={32} height={32} style={{ borderRadius: 8 }} />
        <strong>BAŞAK · Ödeme &amp; Cari Takip</strong>
      </span>
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
  );
}

export default function App() {
  const { oturum } = useAuth();

  if (!oturum) return <PinGiris />;

  return (
    <DonemProvider>
      <div style={{ minHeight: '100vh' }}>
        <UstBar />
        <FirmaCari />
      </div>
    </DonemProvider>
  );
}
