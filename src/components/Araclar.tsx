// ---------------------------------------------------------------------------
// Araçlar paneli (Özet sayfası üstünde).
// Dışa aktarma (Excel/PDF) ve yedekleme butonlarını toplar.
//   - Excel/PDF: seçili dönemin verisini indirir (Şube rolü yalnızca kendi şubesi).
//   - Yedek al / geri yükle: yalnızca Yönetici (sonraki adımda eklenecek).
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useAuth, subeyiGorebilir, yoneticiMi } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';
import { donemVerisiniGetir } from '@/lib/veri';
import { donemiExcelAktar } from '@/lib/excel';
import { donemiPdfAktar } from '@/lib/pdf';
import { yedekIndir, yedegiAyrıştır, yedektenYukle, yedekOzeti } from '@/lib/yedek';

export default function Araclar() {
  const { oturum } = useAuth();
  const { seciliDonem, yenidenYukle } = useDonem();
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);

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

  async function pdfAktar() {
    if (!seciliDonem || mesgul) return;
    setMesgul('pdf');
    setHata(null);
    try {
      const { firmalar, hareketler, devirler } = await veriHazirla();
      donemiPdfAktar(seciliDonem, firmalar, hareketler, devirler);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setHata('PDF dışa aktarma başarısız.');
    } finally {
      setMesgul(null);
    }
  }

  // --- Yedek (yalnızca Yönetici) ---

  async function yedekAl() {
    if (mesgul) return;
    setMesgul('yedek');
    setHata(null);
    setBilgi(null);
    try {
      await yedekIndir();
      setBilgi('Yedek indirildi.');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setHata('Yedek alınamadı.');
    } finally {
      setMesgul(null);
    }
  }

  /** Gizli dosya seçicisini açar. */
  function geriYukleSec() {
    setHata(null);
    setBilgi(null);
    dosyaRef.current?.click();
  }

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = ''; // aynı dosya tekrar seçilebilsin
    if (!dosya) return;
    setMesgul('geriyukle');
    setHata(null);
    setBilgi(null);
    try {
      const metin = await dosya.text();
      const yedek = yedegiAyrıştır(metin);
      const onay = confirm(
        '⚠ DİKKAT — ÜZERİNE YAZMA\n\n' +
          `Seçilen yedek: ${yedekOzeti(yedek)}\n` +
          `(Tarih: ${yedek.olusturulma?.slice(0, 10) || '—'})\n\n` +
          'Bu işlem yedekteki kayıtları mevcut veritabanına YAZAR ve aynı kimlikli ' +
          'kayıtların ÜZERİNE YAZAR. Bu işlem geri alınamaz.\n\nDevam edilsin mi?',
      );
      if (!onay) {
        setMesgul(null);
        return;
      }
      await yedektenYukle(yedek);
      setBilgi('Geri yükleme tamamlandı.');
      yenidenYukle(); // dönem listesini tazele
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setHata(err instanceof Error ? err.message : 'Geri yükleme başarısız.');
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
      <button className="basak-btn" style={btn} onClick={pdfAktar} disabled={!!mesgul || !seciliDonem}>
        {mesgul === 'pdf' ? 'Hazırlanıyor…' : '⬇ PDF İndir'}
      </button>

      {yoneticiMi(oturum) && (
        <>
          <span style={ayrac} />
          <button className="basak-btn" style={btn} onClick={yedekAl} disabled={!!mesgul}>
            {mesgul === 'yedek' ? 'Alınıyor…' : '🗄 Şimdi Yedek Al'}
          </button>
          <button className="basak-btn" style={btn} onClick={geriYukleSec} disabled={!!mesgul}>
            {mesgul === 'geriyukle' ? 'Yükleniyor…' : '↺ Yedekten Geri Yükle'}
          </button>
          <input
            ref={dosyaRef}
            type="file"
            accept="application/json,.json"
            onChange={dosyaSecildi}
            style={{ display: 'none' }}
          />
        </>
      )}

      {hata && <span style={{ color: 'var(--durum-borclu)', fontSize: '0.8rem', fontWeight: 700 }}>{hata}</span>}
      {bilgi && <span style={{ color: 'var(--durum-temiz)', fontSize: '0.8rem', fontWeight: 700 }}>{bilgi}</span>}
    </div>
  );
}

const ayrac: React.CSSProperties = {
  width: 1,
  alignSelf: 'stretch',
  background: 'var(--gri-cizgi)',
  margin: '0 2px',
};

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
