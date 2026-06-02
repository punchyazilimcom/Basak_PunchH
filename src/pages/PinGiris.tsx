// ---------------------------------------------------------------------------
// PIN Giriş Ekranı (şartname Bölüm 3 + Bölüm 8 tasarım).
//
//   - 4-6 haneli PIN, sayısal tuş takımı.
//   - 3 rol: Yönetici / Muhasebe / Şube (rol PIN'in kendisinden çözülür).
//   - Yanlış deneme sınırı useAuth tarafından yönetilir.
//   - İLK KURULUM: Sistemde hiç PIN yoksa, ilk kez yönetici PIN'i belirlenir.
//
// Tasarım: siyah zemin başlık + sarı tuşlar (marka renkleri).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { pinKaydiVarMi, pinKaydiEkle, pinGecerliMi } from '@/lib/pin';
import { firebaseConfigured } from '@/lib/firebase';

export default function PinGiris() {
  const { girisYap } = useAuth();
  const [pin, setPin] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesajTuru, setMesajTuru] = useState<'hata' | 'bilgi'>('hata');
  const [mesgul, setMesgul] = useState(false);

  // İlk kurulum modu: sistemde hiç PIN var mı?
  const [ilkKurulum, setIlkKurulum] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setIlkKurulum(null);
      return;
    }
    pinKaydiVarMi()
      .then((varMi) => setIlkKurulum(!varMi))
      .catch(() => setIlkKurulum(null));
  }, []);

  function rakamEkle(r: string) {
    setMesaj(null);
    setPin((p) => (p.length < 6 ? p + r : p));
  }
  function sil() {
    setMesaj(null);
    setPin((p) => p.slice(0, -1));
  }
  function temizle() {
    setMesaj(null);
    setPin('');
  }

  async function onayla() {
    if (mesgul) return;
    if (!pinGecerliMi(pin)) {
      setMesajTuru('hata');
      setMesaj('PIN 4-6 haneli olmalı.');
      return;
    }
    setMesgul(true);
    try {
      if (ilkKurulum) {
        // İlk kurulum: bu PIN yönetici PIN'i olarak kaydedilir
        await pinKaydiEkle(pin, 'Yönetici');
        setIlkKurulum(false);
        setMesajTuru('bilgi');
        setMesaj('Yönetici PIN belirlendi. Şimdi bu PIN ile giriş yapın.');
        setPin('');
      } else {
        const sonuc = await girisYap(pin);
        if (!sonuc.ok) {
          setMesajTuru('hata');
          setMesaj(sonuc.mesaj ?? 'Giriş başarısız.');
          setPin('');
        }
        // Başarılıysa App yönlendirmesi otomatik devreye girer
      }
    } catch (e) {
      setMesajTuru('hata');
      setMesaj('İşlem sırasında hata oluştu. Bağlantıyı kontrol edin.');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setMesgul(false);
    }
  }

  // Fiziksel klavye desteği
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') rakamEkle(e.key);
      else if (e.key === 'Backspace') sil();
      else if (e.key === 'Enter') onayla();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, ilkKurulum, mesgul]);

  return (
    <div style={s.kapsayici}>
      <motion.div
        style={s.kart}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="basak-baslik" style={s.baslik}>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Başak Kır Pidesi"
            style={{ width: 188, maxWidth: '70%', display: 'block', margin: '0 auto' }}
          />
          <p style={s.altBaslik}>ÖDEME &amp; CARİ TAKİP</p>
        </div>

        <div style={s.govde}>
          {!firebaseConfigured && (
            <p style={s.uyari}>
              Firebase .env yapılandırması eksik. Giriş için <code>.env</code> dosyasını doldurun.
            </p>
          )}

          <p style={s.talimat}>
            {ilkKurulum
              ? 'İlk kurulum: Yönetici PIN belirleyin (4-6 hane)'
              : 'PIN giriniz (4-6 hane)'}
          </p>

          {/* PIN gösterge noktaları */}
          <div style={s.noktalar}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...s.nokta,
                  background: i < pin.length ? 'var(--basak-siyah)' : 'transparent',
                }}
              />
            ))}
          </div>

          {mesaj && (
            <p style={{ ...s.mesaj, color: mesajTuru === 'hata' ? 'var(--durum-borclu)' : 'var(--durum-temiz)' }}>
              {mesaj}
            </p>
          )}

          {/* Tuş takımı */}
          <div style={s.tuslar}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((r) => (
              <button key={r} className="basak-btn" style={s.tus} onClick={() => rakamEkle(r)}>
                {r}
              </button>
            ))}
            <button className="basak-btn" style={s.tusIkincil} onClick={temizle}>
              C
            </button>
            <button key="0" className="basak-btn" style={s.tus} onClick={() => rakamEkle('0')}>
              0
            </button>
            <button className="basak-btn" style={s.tusIkincil} onClick={sil}>
              ⌫
            </button>
          </div>

          <button
            className="basak-btn"
            style={s.onayBtn}
            onClick={onayla}
            disabled={mesgul || !pinGecerliMi(pin) || !firebaseConfigured}
          >
            {mesgul ? 'Lütfen bekleyin…' : ilkKurulum ? 'PIN Belirle' : 'Giriş Yap'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Basit satır-içi stiller (Faz 1 sade tutuldu; gerekirse CSS modülüne taşınır)
const s: Record<string, React.CSSProperties> = {
  kapsayici: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' },
  kart: {
    width: '100%',
    maxWidth: 380,
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 18,
    overflow: 'hidden',
    background: 'var(--basak-beyaz)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
  },
  baslik: { padding: '1.6rem 1.25rem 1.4rem', textAlign: 'center' },
  altBaslik: {
    margin: '0.6rem 0 0',
    fontSize: '0.72rem',
    letterSpacing: '3px',
    fontWeight: 600,
    opacity: 0.85,
  },
  govde: { padding: '1.4rem' },
  uyari: {
    background: '#fff4d6',
    border: '1px solid var(--basak-siyah)',
    borderRadius: 6,
    padding: '0.5rem',
    fontSize: '0.8rem',
    marginTop: 0,
  },
  talimat: { textAlign: 'center', fontWeight: 700, margin: '0.25rem 0 0.75rem' },
  noktalar: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: '0.5rem' },
  nokta: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid var(--basak-siyah)',
    display: 'inline-block',
  },
  mesaj: { textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', margin: '0.25rem 0' },
  tuslar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginTop: '0.75rem',
  },
  tus: { fontSize: '1.3rem', padding: '0.75rem 0' },
  tusIkincil: { fontSize: '1.1rem', padding: '0.75rem 0', background: 'var(--gri-zemin)' },
  onayBtn: { width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '1.05rem' },
};
