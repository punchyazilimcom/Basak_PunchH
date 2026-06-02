// ---------------------------------------------------------------------------
// Hareket (fatura/ödeme) ekleme-düzenleme formu.
// Alanlar: tarih, açıklama, şube, fatura tutarı, ödenen, ödeme şekli, durum, not.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import {
  ODEME_SEKILLERI,
  DURUMLAR,
  type OdemeSekli,
  type Durum,
  type Hareket,
} from '@/types';
import { hareketEkle, hareketGuncelle } from '@/lib/veri';

interface Props {
  firmaId: string;
  donemId: string;
  /** Firmanın şubesi (ön doldurma için). */
  firmaSube?: string;
  mevcut?: Hareket;
  onBitti: () => void;
}

export default function HareketFormu({ firmaId, donemId, firmaSube, mevcut, onBitti }: Props) {
  const [tarih, setTarih] = useState(mevcut?.tarih ?? new Date().toISOString().slice(0, 10));
  const [aciklama, setAciklama] = useState(mevcut?.aciklama ?? '');
  const [sube, setSube] = useState(mevcut?.sube ?? firmaSube ?? '');
  const [faturaTutari, setFaturaTutari] = useState(String(mevcut?.faturaTutari ?? ''));
  const [odenenTutar, setOdenenTutar] = useState(String(mevcut?.odenenTutar ?? ''));
  const [odemeSekli, setOdemeSekli] = useState<OdemeSekli>(mevcut?.odemeSekli ?? 'Banka');
  const [durum, setDurum] = useState<Durum>(mevcut?.durum ?? 'Bekliyor');
  const [not, setNot] = useState(mevcut?.not ?? '');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const fatura = Number(faturaTutari) || 0;
    const odenen = Number(odenenTutar) || 0;
    if (!aciklama.trim()) {
      setHata('Açıklama zorunludur.');
      return;
    }
    if (fatura < 0 || odenen < 0) {
      setHata('Tutarlar negatif olamaz.');
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const veri = {
        firmaId,
        donemId,
        tarih,
        aciklama: aciklama.trim(),
        ...(sube.trim() ? { sube: sube.trim() } : {}),
        faturaTutari: fatura,
        odenenTutar: odenen,
        odemeSekli,
        durum,
        ...(not.trim() ? { not: not.trim() } : {}),
      };
      if (mevcut) await hareketGuncelle(mevcut.id, veri);
      else await hareketEkle(veri);
      onBitti();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setHata('Kaydedilemedi. Bağlantıyı kontrol edin.');
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <form onSubmit={kaydet} style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={ikili}>
        <label style={etiket}>
          Tarih
          <input
            className="basak-alan"
            style={alan}
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </label>
        <label style={etiket}>
          Şube
          <input className="basak-alan" style={alan} value={sube} onChange={(e) => setSube(e.target.value)} />
        </label>
      </div>

      <label style={etiket}>
        Açıklama / Malzeme *
        <input
          className="basak-alan"
          style={alan}
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          autoFocus
        />
      </label>

      <div style={ikili}>
        <label style={etiket}>
          Fatura Tutarı (₺)
          <input
            className="basak-alan"
            style={alan}
            type="number"
            min="0"
            step="0.01"
            value={faturaTutari}
            onChange={(e) => setFaturaTutari(e.target.value)}
          />
        </label>
        <label style={etiket}>
          Ödenen Tutar (₺)
          <input
            className="basak-alan"
            style={alan}
            type="number"
            min="0"
            step="0.01"
            value={odenenTutar}
            onChange={(e) => setOdenenTutar(e.target.value)}
          />
        </label>
      </div>

      <div style={ikili}>
        <label style={etiket}>
          Ödeme Şekli
          <select
            className="basak-alan"
            style={alan}
            value={odemeSekli}
            onChange={(e) => setOdemeSekli(e.target.value as OdemeSekli)}
          >
            {ODEME_SEKILLERI.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label style={etiket}>
          Durum
          <select
            className="basak-alan"
            style={alan}
            value={durum}
            onChange={(e) => setDurum(e.target.value as Durum)}
          >
            {DURUMLAR.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={etiket}>
        Not
        <input className="basak-alan" style={alan} value={not} onChange={(e) => setNot(e.target.value)} />
      </label>

      {hata && <p style={{ color: 'var(--durum-borclu)', margin: 0, fontWeight: 700 }}>{hata}</p>}

      <button className="basak-btn" type="submit" disabled={kaydediliyor}>
        {kaydediliyor ? 'Kaydediliyor…' : mevcut ? 'Güncelle' : 'Hareket Ekle'}
      </button>
    </form>
  );
}

const etiket: React.CSSProperties = { display: 'grid', gap: 4, fontSize: '0.85rem', fontWeight: 700 };
const alan: React.CSSProperties = { padding: '0.5rem', borderRadius: 6 };
const ikili: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' };
