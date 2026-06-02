// ---------------------------------------------------------------------------
// Dönem çubuğu (şartname Bölüm 6).
//
//   - Aktif/seçili dönem göstergesi + dönem seçici (geçmiş dönemleri görüntüleme)
//   - "Yeni Dönem Aç" butonu (yalnızca Yönetici):
//       onay → mevcut dönemi kilitle → kalan borçları yeni döneme devret → aktif yap
//   - Geçmiş (kilitli) dönem seçiliyken "salt görüntüleme" uyarısı gösterilir.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { CalendarDays, CalendarPlus, Lock } from 'lucide-react';
import { useDonem } from '@/hooks/useDonem';
import { useAuth, yoneticiMi } from '@/hooks/useAuth';
import { donemEtiketi, sonrakiAy } from '@/lib/tarih';

export default function DonemBar() {
  const { oturum } = useAuth();
  const { donemler, seciliDonem, aktifDonem, duzenlenebilir, yukleniyor, donemSec, yeniDonemAc } =
    useDonem();
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function yeniDonem() {
    if (!aktifDonem || calisiyor) return;
    const yeniAd = sonrakiAy(aktifDonem.id);
    const onay = confirm(
      `Mevcut dönem (${aktifDonem.ad}) KİLİTLENECEK ve artık düzenlenemeyecek.\n\n` +
        `Her firmanın kalan borcu yeni dönemin (${yeniAd}) DEVİR satırına otomatik ` +
        `aktarılacak.\n\nDevam edilsin mi?`,
    );
    if (!onay) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await yeniDonemAc();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setHata('Yeni dönem açılamadı. Bağlantıyı kontrol edin.');
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0.6rem 1rem',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: '1px solid var(--cizgi)',
        position: 'sticky',
        top: 0,
        zIndex: 15,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700 }}>
        <CalendarDays size={16} /> Dönem:
      </span>

      {/* Dönem seçici */}
      <select
        className="basak-alan"
        value={seciliDonem?.id ?? ''}
        onChange={(e) => donemSec(e.target.value)}
        disabled={yukleniyor || donemler.length === 0}
        style={{ padding: '0.35rem 0.6rem', fontWeight: 700, fontSize: '0.85rem' }}
      >
        {donemler.map((d) => (
          <option key={d.id} value={d.id}>
            {donemEtiketi(d.id)}
            {d.id === aktifDonem?.id ? ' (aktif)' : d.kilitliMi ? ' (kilitli)' : ''}
          </option>
        ))}
      </select>

      {/* Salt görüntüleme uyarısı */}
      {!duzenlenebilir && seciliDonem && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--durum-borclu)', fontWeight: 700 }}>
          <Lock size={13} /> Salt görüntüleme
        </span>
      )}
      {duzenlenebilir && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--durum-temiz)', fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--durum-temiz)' }} /> Aktif dönem
        </span>
      )}

      <span style={{ flex: 1 }} />

      {hata && <span style={{ color: 'var(--durum-borclu)', fontSize: '0.8rem' }}>{hata}</span>}

      {/* Yeni Dönem Aç — yalnızca Yönetici */}
      {yoneticiMi(oturum) && (
        <button
          className="basak-btn"
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}
          onClick={yeniDonem}
          disabled={calisiyor || !aktifDonem}
          title="Mevcut dönemi kilitler ve kalan borçları yeni döneme devreder"
        >
          <CalendarPlus size={16} /> {calisiyor ? 'Açılıyor…' : 'Yeni Dönem Aç'}
        </button>
      )}
    </div>
  );
}
