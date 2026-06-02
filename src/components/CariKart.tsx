// ---------------------------------------------------------------------------
// Cari Kart (şartname Bölüm 4 — çekirdek).
//
//   Üst: firma bilgisi (başlık, siyah zemin/sarı yazı).
//   DEVİR satırı: önceki dönemden gelen kalan (düzenlenebilir — yetki + kilit).
//   Hareket satırları: tarih, açıklama, fatura, ödenen, ödeme şekli, durum.
//   En alt: KALAN BORÇ = Devir + ΣFatura − ΣÖdenen (otomatik).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Firma, Hareket } from '@/types';
import { hareketleriDinle, devirDinle, devirAyarla, hareketSil } from '@/lib/veri';
import { kalanBorc, toplamFatura, toplamOdenen, tlBicimle } from '@/lib/hesaplama';
import { useAuth, girisYetkisiVar } from '@/hooks/useAuth';
import Modal from './Modal';
import HareketFormu from './HareketFormu';

interface Props {
  firma: Firma;
  donemId: string;
  /** Dönem kilitliyse düzenleme kapatılır (arşiv görünümü — Faz 3). */
  kilitli: boolean;
}

export default function CariKart({ firma, donemId, kilitli }: Props) {
  const { oturum } = useAuth();
  const yazabilir = girisYetkisiVar(oturum) && !kilitli;

  const [hareketler, setHareketler] = useState<Hareket[]>([]);
  const [devir, setDevir] = useState(0);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Hareket | undefined>();
  const [devirDuzenle, setDevirDuzenle] = useState(false);
  const [devirGiris, setDevirGiris] = useState('0');

  // Firma/dönem değişince canlı dinlemeyi yeniden kur
  useEffect(() => {
    const off1 = hareketleriDinle(firma.id, donemId, setHareketler);
    const off2 = devirDinle(firma.id, donemId, (d) => {
      setDevir(d);
      setDevirGiris(String(d));
    });
    return () => {
      off1();
      off2();
    };
  }, [firma.id, donemId]);

  const kalan = kalanBorc(devir, hareketler);

  async function devirKaydet() {
    await devirAyarla(firma.id, donemId, Number(devirGiris) || 0);
    setDevirDuzenle(false);
  }

  async function hareketiSil(h: Hareket) {
    if (confirm(`"${h.aciklama}" hareketi silinsin mi?`)) {
      await hareketSil(h.id);
    }
  }

  return (
    <div style={{ border: '2px solid var(--basak-siyah)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Firma başlığı */}
      <div className="basak-baslik" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <strong style={{ fontSize: '1.1rem' }}>{firma.ad}</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              {firma.bolum}
              {firma.sube ? ` · ${firma.sube}` : ''}
            </div>
          </div>
          {yazabilir && (
            <button
              className="basak-btn"
              style={{ padding: '0.45rem 0.85rem' }}
              onClick={() => {
                setDuzenlenen(undefined);
                setFormAcik(true);
              }}
            >
              <Plus size={16} /> Hareket
            </button>
          )}
        </div>
        {(firma.telefon || firma.iban || firma.not) && (
          <div style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.85 }}>
            {firma.telefon && <span>☎ {firma.telefon} </span>}
            {firma.iban && <span> · IBAN: {firma.iban} </span>}
            {firma.not && <span> · {firma.not}</span>}
          </div>
        )}
      </div>

      {/* Tablo */}
      <div style={{ overflowX: 'auto' }}>
        <table style={tablo}>
          <thead>
            <tr className="basak-baslik">
              <th style={th}>Tarih</th>
              <th style={th}>Açıklama</th>
              <th style={thSag}>Fatura</th>
              <th style={thSag}>Ödenen</th>
              <th style={th}>Ödeme</th>
              <th style={th}>Durum</th>
              {yazabilir && <th style={th}></th>}
            </tr>
          </thead>
          <tbody>
            {/* DEVİR satırı */}
            <tr style={{ background: '#fffbe6' }}>
              <td style={td}>—</td>
              <td style={{ ...td, fontWeight: 700 }}>DEVİR (önceki dönem kalanı)</td>
              <td style={tdSag}>—</td>
              <td style={tdSag}>—</td>
              <td style={td} colSpan={yazabilir ? 3 : 2}>
                {devirDuzenle ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input
                      className="basak-alan"
                      type="number"
                      step="0.01"
                      value={devirGiris}
                      onChange={(e) => setDevirGiris(e.target.value)}
                      style={{ width: 110, padding: '0.25rem', borderRadius: 4 }}
                    />
                    <button className="basak-btn" style={mini} onClick={devirKaydet}>
                      ✓
                    </button>
                    <button className="basak-btn" style={mini} onClick={() => setDevirDuzenle(false)}>
                      ×
                    </button>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <strong>{tlBicimle(devir)}</strong>
                    {yazabilir && (
                      <button className="basak-btn" style={mini} onClick={() => setDevirDuzenle(true)}>
                        Düzenle
                      </button>
                    )}
                  </span>
                )}
              </td>
            </tr>

            {/* Hareketler */}
            {hareketler.map((h) => (
              <tr key={h.id} style={{ borderTop: '1px solid var(--gri-cizgi)' }}>
                <td style={td}>{h.tarih}</td>
                <td style={td}>
                  {h.aciklama}
                  {h.not ? <span style={{ color: 'var(--gri-yazi)' }}> — {h.not}</span> : null}
                </td>
                <td style={tdSag}>{h.faturaTutari ? tlBicimle(h.faturaTutari) : '—'}</td>
                <td style={tdSag}>{h.odenenTutar ? tlBicimle(h.odenenTutar) : '—'}</td>
                <td style={td}>{h.odemeSekli}</td>
                <td style={td}>
                  <span style={durumRozet(h.durum)}>{h.durum}</span>
                </td>
                {yazabilir && (
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button
                      className="basak-btn basak-btn-sade"
                      style={mini}
                      aria-label="Düzenle"
                      onClick={() => {
                        setDuzenlenen(h);
                        setFormAcik(true);
                      }}
                    >
                      <Pencil size={14} />
                    </button>{' '}
                    <button className="basak-btn basak-btn-sade" style={mini} aria-label="Sil" onClick={() => hareketiSil(h)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {hareketler.length === 0 && (
              <tr>
                <td style={{ ...td, color: 'var(--gri-yazi)' }} colSpan={yazabilir ? 7 : 6}>
                  Bu dönemde hareket yok.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {/* Toplamlar */}
            <tr style={{ borderTop: '2px solid var(--basak-siyah)' }}>
              <td style={td}></td>
              <td style={{ ...td, fontWeight: 700 }}>Toplam</td>
              <td style={{ ...tdSag, fontWeight: 700 }}>{tlBicimle(toplamFatura(hareketler))}</td>
              <td style={{ ...tdSag, fontWeight: 700 }}>{tlBicimle(toplamOdenen(hareketler))}</td>
              <td style={td} colSpan={yazabilir ? 3 : 2}></td>
            </tr>
            {/* KALAN BORÇ */}
            <tr className="basak-baslik">
              <td style={td} colSpan={2}>
                <strong>KALAN BORÇ</strong>
                <span style={{ fontSize: '0.72rem', opacity: 0.8 }}> (Devir + ΣFatura − ΣÖdenen)</span>
              </td>
              <td style={tdSag} colSpan={yazabilir ? 5 : 4}>
                <strong
                  style={{
                    fontSize: '1.15rem',
                    color: kalan > 0 ? 'var(--basak-sari)' : '#9be59b',
                  }}
                >
                  {tlBicimle(kalan)}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Modal
        baslik={duzenlenen ? 'Hareketi Düzenle' : 'Yeni Hareket'}
        acik={formAcik}
        onKapat={() => setFormAcik(false)}
      >
        <HareketFormu
          firmaId={firma.id}
          donemId={donemId}
          firmaSube={firma.sube}
          mevcut={duzenlenen}
          onBitti={() => setFormAcik(false)}
        />
      </Modal>
    </div>
  );
}

// --- stiller ---
const tablo: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.5rem 0.6rem', fontSize: '0.78rem' };
const thSag: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '0.5rem 0.6rem', verticalAlign: 'top' };
const tdSag: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const mini: React.CSSProperties = { padding: '0.15rem 0.45rem', fontSize: '0.75rem', borderWidth: 1 };

function durumRozet(durum: string): React.CSSProperties {
  const renk: Record<string, string> = {
    Ödendi: 'var(--durum-temiz)',
    Bekliyor: '#b58900',
    Kısmi: '#b58900',
    Gecikmiş: 'var(--durum-borclu)',
  };
  return {
    background: renk[durum] ?? 'var(--gri-yazi)',
    color: '#fff',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
    fontSize: '0.72rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
}
