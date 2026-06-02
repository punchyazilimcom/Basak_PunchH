// ---------------------------------------------------------------------------
// Firma ekleme/düzenleme formu (modal içinde kullanılır).
// "Yeni Taşeron Ekle" durumunda bölüm varsayılan olarak "Taşeron" gelir.
// Düzenlenebilir alanlar marka kuralı gereği sarı zemin/siyah yazı (.basak-alan).
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { BOLUMLER, type Bolum, type Firma } from '@/types';
import { firmaEkle, firmaGuncelle } from '@/lib/veri';

interface Props {
  /** Düzenleme modu için mevcut firma; yeni kayıt için undefined. */
  mevcut?: Firma;
  /** Varsayılan bölüm (ör. "Yeni Taşeron" butonu için "Taşeron"). */
  varsayilanBolum?: Bolum;
  onBitti: () => void;
}

export default function FirmaFormu({ mevcut, varsayilanBolum, onBitti }: Props) {
  const [ad, setAd] = useState(mevcut?.ad ?? '');
  const [bolum, setBolum] = useState<Bolum>(mevcut?.bolum ?? varsayilanBolum ?? 'Diğer');
  const [sube, setSube] = useState(mevcut?.sube ?? '');
  const [telefon, setTelefon] = useState(mevcut?.telefon ?? '');
  const [iban, setIban] = useState(mevcut?.iban ?? '');
  const [not, setNot] = useState(mevcut?.not ?? '');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) {
      setHata('Firma adı zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const veri = {
        ad: ad.trim(),
        bolum,
        ...(sube.trim() ? { sube: sube.trim() } : {}),
        ...(telefon.trim() ? { telefon: telefon.trim() } : {}),
        ...(iban.trim() ? { iban: iban.trim() } : {}),
        ...(not.trim() ? { not: not.trim() } : {}),
      };
      if (mevcut) await firmaGuncelle(mevcut.id, veri);
      else await firmaEkle(veri);
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
      <label style={etiket}>
        Firma Adı *
        <input
          className="basak-alan"
          style={alan}
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          autoFocus
        />
      </label>

      <label style={etiket}>
        Bölüm / Kategori
        <select
          className="basak-alan"
          style={alan}
          value={bolum}
          onChange={(e) => setBolum(e.target.value as Bolum)}
        >
          {BOLUMLER.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label style={etiket}>
        Şube (opsiyonel)
        <input className="basak-alan" style={alan} value={sube} onChange={(e) => setSube(e.target.value)} />
      </label>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ ...etiket, flex: 1, minWidth: 140 }}>
          Telefon
          <input
            className="basak-alan"
            style={alan}
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
          />
        </label>
        <label style={{ ...etiket, flex: 1, minWidth: 140 }}>
          IBAN
          <input className="basak-alan" style={alan} value={iban} onChange={(e) => setIban(e.target.value)} />
        </label>
      </div>

      <label style={etiket}>
        Not
        <textarea
          className="basak-alan"
          style={{ ...alan, minHeight: 60, resize: 'vertical' }}
          value={not}
          onChange={(e) => setNot(e.target.value)}
        />
      </label>

      {hata && <p style={{ color: 'var(--durum-borclu)', margin: 0, fontWeight: 700 }}>{hata}</p>}

      <button className="basak-btn" type="submit" disabled={kaydediliyor} style={{ marginTop: '0.25rem' }}>
        {kaydediliyor ? 'Kaydediliyor…' : mevcut ? 'Güncelle' : 'Kaydet'}
      </button>
    </form>
  );
}

const etiket: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  fontSize: '0.85rem',
  fontWeight: 700,
};
const alan: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: 6,
};
