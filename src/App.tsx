// ---------------------------------------------------------------------------
// Uygulama kabuğu (App shell) ve oturum koruması.
//
//   - Oturum yoksa  -> PIN giriş ekranı.
//   - Oturum varsa  -> Özet Panosu (varsayılan) + Firma Cari + dönem yönetimi.
//
// Sayfa geçişi basit durum (state) ile yapılır; react-router ileride gerekirse
// genişletilebilir.
// ---------------------------------------------------------------------------
import { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, LogOut } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { DonemProvider } from './hooks/useDonem';
import { otomatikYedek } from './lib/yedek';
import PinGiris from './pages/PinGiris';
import FirmaCari from './pages/FirmaCari';
import Ozet from './pages/Ozet';
import DonemBar from './components/DonemBar';

type Sayfa = 'ozet' | 'cari';

function UstBar({ sayfa, setSayfa }: { sayfa: Sayfa; setSayfa: (s: Sayfa) => void }) {
  const { oturum, cikisYap } = useAuth();
  return (
    <header
      className="basak-baslik"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '0.6rem 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Başak Kır Pidesi" height={40} style={{ display: 'block' }} />
        <strong style={{ fontSize: '1.02rem', letterSpacing: '0.3px' }}>Ödeme &amp; Cari Takip</strong>
      </span>

      {/* Sayfa navigasyonu */}
      <nav style={{ display: 'flex', gap: 8 }}>
        <button className="basak-btn" style={navBtn(sayfa === 'ozet')} onClick={() => setSayfa('ozet')}>
          <LayoutDashboard size={16} /> Özet Panosu
        </button>
        <button className="basak-btn" style={navBtn(sayfa === 'cari')} onClick={() => setSayfa('cari')}>
          <Building2 size={16} /> Firmalar / Cari
        </button>
      </nav>

      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <small style={{ opacity: 0.85 }}>
          {oturum?.rol}
          {oturum?.sube ? ` · ${oturum.sube}` : ''}
        </small>
        <button className="basak-btn" style={{ padding: '0.35rem 0.7rem' }} onClick={cikisYap}>
          <LogOut size={15} /> Çıkış
        </button>
      </span>
    </header>
  );
}

function navBtn(aktif: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.8rem',
    fontSize: '0.85rem',
    background: aktif ? 'var(--basak-sari)' : 'transparent',
    color: aktif ? 'var(--basak-siyah)' : 'var(--basak-sari)',
    borderColor: 'var(--basak-sari)',
  };
}

function IcerikKabugu() {
  const [sayfa, setSayfa] = useState<Sayfa>('ozet');
  const [seciliFirmaId, setSeciliFirmaId] = useState<string | null>(null);

  // Otomatik günlük yedek (best-effort, günde 1 kez). Storage etkin değilse atlar.
  useEffect(() => {
    otomatikYedek();
  }, []);

  // Özet'te bir firmaya tıklanınca cari ekranına geç ve o firmayı seç
  function firmayaGit(firmaId: string) {
    setSeciliFirmaId(firmaId);
    setSayfa('cari');
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <UstBar sayfa={sayfa} setSayfa={setSayfa} />
      <DonemBar />
      {sayfa === 'ozet' ? (
        <Ozet onFirmaSec={firmayaGit} />
      ) : (
        <FirmaCari baslangicFirmaId={seciliFirmaId} />
      )}
    </div>
  );
}

export default function App() {
  const { oturum } = useAuth();
  if (!oturum) return <PinGiris />;
  return (
    <DonemProvider>
      <IcerikKabugu />
    </DonemProvider>
  );
}
