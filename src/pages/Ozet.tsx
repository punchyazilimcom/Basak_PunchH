// ---------------------------------------------------------------------------
// Özet Panosu / Dashboard (şartname Bölüm 5).
//
//   - Üstte büyük kart: TOPLAM KALAN BORÇ + Bekleyen/Gecikmiş (kırmızı vurgu)
//   - Bölüm bazında toplam + Şube bazında toplam
//   - Tüm firmaların kalan borcu tek listede (durum rozeti: TEMİZ / BORÇLU)
//
// Veriler seçili döneme göre canlı dinlenir. Şube rolü yalnızca kendi şubesini
// görür (Faz 1 yetki kuralıyla tutarlı).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import type { Firma, Hareket, Devir } from '@/types';
import { firmalariDinle, donemHareketleriDinle, donemDevirleriDinle } from '@/lib/veri';
import {
  firmaOzetleriHesapla,
  bolumBazindaToplam,
  subeBazindaToplam,
  toplamKalan,
  bekleyenGecikmisToplam,
} from '@/lib/ozet';
import { tlBicimle } from '@/lib/hesaplama';
import { useAuth, subeyiGorebilir } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';

interface Props {
  /** Bir firmaya tıklanınca cari ekranına geçiş (App tarafından sağlanır). */
  onFirmaSec?: (firmaId: string) => void;
}

export default function Ozet({ onFirmaSec }: Props) {
  const { oturum } = useAuth();
  const { seciliDonem, yukleniyor } = useDonem();

  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [hareketler, setHareketler] = useState<Hareket[]>([]);
  const [devirler, setDevirler] = useState<Devir[]>([]);

  // Firmaları canlı dinle
  useEffect(() => firmalariDinle(setFirmalar), []);

  // Seçili döneme ait hareket ve devirleri canlı dinle
  useEffect(() => {
    if (!seciliDonem) return;
    const off1 = donemHareketleriDinle(seciliDonem.id, setHareketler);
    const off2 = donemDevirleriDinle(seciliDonem.id, setDevirler);
    return () => {
      off1();
      off2();
    };
  }, [seciliDonem]);

  // Şube rolü filtresi (yalnızca kendi şubesi)
  const gorunenFirmalar = useMemo(
    () => firmalar.filter((f) => subeyiGorebilir(oturum, f.sube)),
    [firmalar, oturum],
  );
  const gorunenFirmaIdler = useMemo(
    () => new Set(gorunenFirmalar.map((f) => f.id)),
    [gorunenFirmalar],
  );
  const gorunenHareketler = useMemo(
    () => hareketler.filter((h) => gorunenFirmaIdler.has(h.firmaId)),
    [hareketler, gorunenFirmaIdler],
  );
  const gorunenDevirler = useMemo(
    () => devirler.filter((d) => gorunenFirmaIdler.has(d.firmaId)),
    [devirler, gorunenFirmaIdler],
  );

  const ozetler = useMemo(
    () => firmaOzetleriHesapla(gorunenFirmalar, gorunenHareketler, gorunenDevirler),
    [gorunenFirmalar, gorunenHareketler, gorunenDevirler],
  );

  const genelToplam = toplamKalan(ozetler);
  const bekleyen = bekleyenGecikmisToplam(gorunenHareketler);
  const bolumToplam = bolumBazindaToplam(ozetler);
  const subeToplam = subeBazindaToplam(ozetler);

  // Sıfır olmayanları göster; hepsi sıfırsa yine de boş mesaj
  const bolumKayitlari = Object.entries(bolumToplam).filter(([, v]) => v !== 0);
  const subeKayitlari = Object.entries(subeToplam).filter(([, v]) => v !== 0);

  return (
    <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      {/* Büyük özet kart */}
      <div className="ozet-buyuk">
        <div className="basak-baslik" style={k.buyukSol}>
          <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>TOPLAM KALAN BORÇ</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{tlBicimle(genelToplam)}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 4 }}>
            {seciliDonem ? `Dönem: ${seciliDonem.ad}` : ''}
            {seciliDonem?.kilitliMi ? ' · (kilitli/arşiv)' : ''}
          </div>
        </div>
        <div style={{ ...k.buyukSag, background: bekleyen > 0 ? 'var(--durum-borclu)' : 'var(--durum-temiz)' }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>BEKLEYEN / GECİKMİŞ</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{tlBicimle(bekleyen)}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: 4 }}>
            {bekleyen > 0 ? 'Ödenmemiş tutar var' : 'Bekleyen/gecikmiş yok'}
          </div>
        </div>
      </div>

      {yukleniyor && <p>Yükleniyor…</p>}

      {/* Bölüm & Şube toplamları */}
      <div className="ozet-iki-kolon">
        <div style={k.kutu}>
          <div className="basak-baslik" style={k.kutuBaslik}>Bölüm Bazında Toplam</div>
          <div>
            {bolumKayitlari.length === 0 && <p style={k.bos}>Kayıt yok.</p>}
            {bolumKayitlari.map(([bolum, tutar]) => (
              <div key={bolum} style={k.satir}>
                <span>{bolum}</span>
                <strong style={{ color: tutar > 0 ? 'var(--durum-borclu)' : 'var(--durum-temiz)' }}>
                  {tlBicimle(tutar)}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div style={k.kutu}>
          <div className="basak-baslik" style={k.kutuBaslik}>Şube Bazında Toplam</div>
          <div>
            {subeKayitlari.length === 0 && <p style={k.bos}>Kayıt yok.</p>}
            {subeKayitlari.map(([sube, tutar]) => (
              <div key={sube} style={k.satir}>
                <span>{sube}</span>
                <strong style={{ color: tutar > 0 ? 'var(--durum-borclu)' : 'var(--durum-temiz)' }}>
                  {tlBicimle(tutar)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firma listesi */}
      <div style={k.kutu}>
        <div className="basak-baslik" style={k.kutuBaslik}>
          Firma Kalan Borç Listesi ({ozetler.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={k.tablo}>
            <thead>
              <tr className="basak-baslik">
                <th style={k.th}>Firma</th>
                <th style={k.th}>Bölüm</th>
                <th style={k.th}>Şube</th>
                <th style={k.thSag}>Kalan Borç</th>
                <th style={k.th}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {ozetler.length === 0 && (
                <tr>
                  <td style={{ ...k.td, color: 'var(--gri-yazi)' }} colSpan={5}>
                    Bu dönemde firma/kayıt yok.
                  </td>
                </tr>
              )}
              {ozetler.map((o) => (
                <tr
                  key={o.firma.id}
                  onClick={() => onFirmaSec?.(o.firma.id)}
                  style={{ borderTop: '1px solid var(--gri-cizgi)', cursor: onFirmaSec ? 'pointer' : 'default' }}
                >
                  <td style={{ ...k.td, fontWeight: 700 }}>{o.firma.ad}</td>
                  <td style={k.td}>{o.firma.bolum}</td>
                  <td style={k.td}>{o.firma.sube || '—'}</td>
                  <td style={{ ...k.tdSag, fontWeight: 700 }}>{tlBicimle(o.kalan)}</td>
                  <td style={k.td}>
                    <span style={rozet(o.temiz)}>{o.temiz ? 'TEMİZ' : 'BORÇLU'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function rozet(temiz: boolean): React.CSSProperties {
  return {
    background: temiz ? 'var(--durum-temiz)' : 'var(--durum-borclu)',
    color: '#fff',
    padding: '0.15rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.72rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  };
}

const k: Record<string, React.CSSProperties> = {
  buyukSol: { padding: '1.25rem', borderRadius: 12, flex: 1, minWidth: 240 },
  buyukSag: {
    padding: '1.25rem',
    borderRadius: 12,
    flex: 1,
    minWidth: 240,
    color: '#fff',
    border: '2px solid var(--basak-siyah)',
  },
  kutu: {
    border: '2px solid var(--basak-siyah)',
    borderRadius: 10,
    background: 'var(--basak-beyaz)',
    overflow: 'hidden',
  },
  kutuBaslik: { padding: '0.6rem 0.9rem', fontWeight: 800, fontSize: '0.9rem' },
  satir: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.45rem 0.9rem',
    borderTop: '1px solid var(--gri-cizgi)',
    fontSize: '0.9rem',
  },
  bos: { padding: '0.9rem', color: 'var(--gri-yazi)', margin: 0 },
  tablo: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.7rem', fontSize: '0.78rem' },
  thSag: { textAlign: 'right', padding: '0.5rem 0.7rem', fontSize: '0.78rem' },
  td: { padding: '0.5rem 0.7rem' },
  tdSag: { padding: '0.5rem 0.7rem', textAlign: 'right', whiteSpace: 'nowrap' },
};
