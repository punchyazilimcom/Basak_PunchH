// ---------------------------------------------------------------------------
// Araçlar paneli (Özet sayfası üstünde).
// Dışa aktarma (Excel/PDF) ve yedekleme butonlarını toplar.
//   - Excel/PDF: seçili dönemin verisini indirir (Şube rolü yalnızca kendi şubesi).
//   - Yedek al / geri yükle: yalnızca Yönetici (sonraki adımda eklenecek).
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useAuth, subeyiGorebilir } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';
import { donemVerisiniGetir } from '@/lib/veri';
import { donemiExcelAktar } from '@/lib/excel';

export default function Araclar() {
  const { oturum } = useAuth();
  const { seciliDonem } = useDonem();
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  /** Seçili dönemin verisini çeker ve role göre filtreler. */
  async function veriHazirla() {
    if (!seciliDonem) throw new Error('Dönem seçili değil.');
    const { firmalar, hareketler, devirler } = await donemVerisiniGetir(seciliDonem.id);
    const gorunenFirmalar = firmalar.filter((f) => subeyiGorebilir(oturum, f.sube));
    const idler = new Set(gorunenFirmalar.map((f) => f.id));
    return {
      firmalar: gorunenFirmalar,
      hareketler: hareketler.filter((h) => idler.has(h.firmaId)),
      devirler: devirler.filter((d) => idler.has(d.firmaId)),
    };
  }

  async function excelAktar() {
    if (!seciliDonem || mesgul) return;
    setMesgul('excel');
    setHata(null);
    try {
      const { firmalar, hareketler, devirler } = await veriHazirla();
      donemiExcelAktar(seciliDonem, firmalar, hareketler, devirler);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setHata('Excel dışa aktarma başarısız.');
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div style={kutu}>
      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Araçlar:</span>
      <button className="basak-btn" style={btn} onClick={excelAktar} disabled={!!mesgul || !seciliDonem}>
        {mesgul === 'excel' ? 'Hazırlanıyor…' : '⬇ Excel’e Aktar'}
      </button>
      {hata && <span style={{ color: 'var(--durum-borclu)', fontSize: '0.8rem' }}>{hata}</span>}
    </div>
  );
}

const kutu: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  padding: '0.6rem 0.9rem',
  border: '2px solid var(--basak-siyah)',
  borderRadius: 10,
  background: 'var(--basak-beyaz)',
};
const btn: React.CSSProperties = { padding: '0.4rem 0.8rem', fontSize: '0.85rem' };
