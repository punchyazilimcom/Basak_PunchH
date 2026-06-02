// ---------------------------------------------------------------------------
// Firma Cari Ekranı (şartname Bölüm 4 — çekirdek modül).
//
//   Sol: firma listesi + arama + bölüme göre filtre + "Yeni Firma" / "Yeni Taşeron".
//   Sağ: seçili firmanın cari kartı (devir + hareketler + kalan borç).
//
// Yetki (Bölüm 3):
//   - Şube rolü yalnızca kendi şubesine ait firmaları görür.
//   - Firma ekleme herkes (giriş yetkisi) için; firma SİLME yalnızca Yönetici.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, HardHat } from 'lucide-react';
import { BOLUMLER, type Bolum, type Firma } from '@/types';
import { firmalariDinle, firmaSil } from '@/lib/veri';
import { useAuth, yoneticiMi, girisYetkisiVar, subeyiGorebilir } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';
import Modal from '@/components/Modal';
import FirmaFormu from '@/components/FirmaFormu';
import CariKart from '@/components/CariKart';

interface Props {
  /** Özet panosundan gelindiğinde önce seçili olacak firma. */
  baslangicFirmaId?: string | null;
}

export default function FirmaCari({ baslangicFirmaId }: Props) {
  const { oturum } = useAuth();
  const { seciliDonem, duzenlenebilir, yukleniyor, hata } = useDonem();

  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [arama, setArama] = useState('');
  const [bolumFiltre, setBolumFiltre] = useState<Bolum | 'Tümü'>('Tümü');
  const [seciliId, setSeciliId] = useState<string | null>(baslangicFirmaId ?? null);

  const [formAcik, setFormAcik] = useState(false);
  const [formVarsayilanBolum, setFormVarsayilanBolum] = useState<Bolum | undefined>();

  // Firmaları canlı dinle
  useEffect(() => {
    const off = firmalariDinle(setFirmalar);
    return off;
  }, []);

  // Özet'ten yeni bir firma seçilerek gelinirse onu seç
  useEffect(() => {
    if (baslangicFirmaId) setSeciliId(baslangicFirmaId);
  }, [baslangicFirmaId]);

  // Rol + arama + bölüm filtresi
  const gorunenFirmalar = useMemo(() => {
    return firmalar
      .filter((f) => subeyiGorebilir(oturum, f.sube)) // Şube yalnızca kendi şubesi
      .filter((f) => bolumFiltre === 'Tümü' || f.bolum === bolumFiltre)
      .filter((f) => f.ad.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')));
  }, [firmalar, oturum, bolumFiltre, arama]);

  const secili = gorunenFirmalar.find((f) => f.id === seciliId) ?? null;

  function yeniFirma(bolum?: Bolum) {
    setFormVarsayilanBolum(bolum);
    setFormAcik(true);
  }

  async function sil(f: Firma) {
    if (confirm(`"${f.ad}" firması ve seçili görünümü silinsin mi? (Hareketler ayrıca temizlenmez)`)) {
      await firmaSil(f.id);
      if (seciliId === f.id) setSeciliId(null);
    }
  }

  return (
    <div className="basak-cari-izgara" style={s.izgara}>
      {/* SOL PANEL */}
      <aside className="basak-cari-sol" style={s.sol}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {girisYetkisiVar(oturum) && (
            <>
              <button className="basak-btn" style={s.ekleBtn} onClick={() => yeniFirma()}>
                <Plus size={16} /> Yeni Firma
              </button>
              <button className="basak-btn basak-btn-sade" style={s.ekleBtn} onClick={() => yeniFirma('Taşeron')}>
                <HardHat size={16} /> Yeni Taşeron
              </button>
            </>
          )}
        </div>

        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--yazi-soft)' }} />
          <input
            className="basak-alan"
            placeholder="Firma ara…"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.5rem 0.55rem 2rem' }}
          />
        </div>

        <select
          className="basak-alan"
          value={bolumFiltre}
          onChange={(e) => setBolumFiltre(e.target.value as Bolum | 'Tümü')}
          style={{ width: '100%', padding: '0.55rem 0.5rem', marginBottom: 12 }}
        >
          <option value="Tümü">Tüm Bölümler</option>
          {BOLUMLER.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {gorunenFirmalar.length === 0 && (
            <p style={{ color: 'var(--gri-yazi)', fontSize: '0.85rem' }}>
              Kayıt yok. {girisYetkisiVar(oturum) ? 'Yeni firma ekleyebilirsiniz.' : ''}
            </p>
          )}
          {gorunenFirmalar.map((f) => (
            <div
              key={f.id}
              onClick={() => setSeciliId(f.id)}
              style={{
                ...s.firmaSatir,
                ...(seciliId === f.id ? s.firmaSatirSecili : {}),
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.ad}
                </strong>
                <div style={{ fontSize: '0.75rem', color: seciliId === f.id ? 'var(--basak-sari)' : 'var(--yazi-soft)' }}>
                  {f.bolum}
                  {f.sube ? ` · ${f.sube}` : ''}
                </div>
              </div>
              {yoneticiMi(oturum) && (
                <button
                  aria-label="Sil"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8,
                    color: seciliId === f.id ? 'var(--basak-sari)' : 'var(--yazi-soft)', flex: 'none',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sil(f);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* SAĞ PANEL */}
      <section style={s.sag}>
        {yukleniyor && <p>Dönem yükleniyor…</p>}
        {hata && <p style={{ color: 'var(--durum-borclu)', fontWeight: 700 }}>{hata}</p>}
        {!yukleniyor && seciliDonem && (
          <>
            {!duzenlenebilir && (
              <div style={{ fontSize: '0.85rem', color: 'var(--durum-borclu)', fontWeight: 700, marginBottom: 10 }}>
                Bu dönem kilitli — salt görüntüleme (düzenleme kapalı).
              </div>
            )}
            {secili ? (
              <CariKart firma={secili} donemId={seciliDonem.id} kilitli={!duzenlenebilir} />
            ) : (
              <div style={s.bosDurum}>
                <p>Soldan bir firma seçin ya da yeni firma ekleyin.</p>
              </div>
            )}
          </>
        )}
      </section>

      <Modal baslik="Yeni Firma" acik={formAcik} onKapat={() => setFormAcik(false)}>
        <FirmaFormu
          varsayilanBolum={formVarsayilanBolum}
          onBitti={() => setFormAcik(false)}
        />
      </Modal>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  izgara: {
    display: 'grid',
    gridTemplateColumns: 'minmax(250px, 340px) 1fr',
    gap: '1.25rem',
    padding: '1.25rem',
    alignItems: 'start',
  },
  sol: {
    border: '1px solid var(--cizgi)',
    borderRadius: 'var(--r)',
    padding: '0.9rem',
    background: 'var(--kart)',
    boxShadow: 'var(--golge-3)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 150px)',
    position: 'sticky',
    top: '5.2rem',
  },
  sag: { minWidth: 0 },
  ekleBtn: { flex: 1, minWidth: 120, padding: '0.55rem', fontSize: '0.85rem' },
  firmaSatir: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    padding: '0.6rem 0.65rem',
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
    marginBottom: 4,
    transition: 'background 0.12s ease',
  },
  firmaSatirSecili: { background: 'var(--basak-siyah)', color: 'var(--basak-sari)' },
  bosDurum: {
    border: '1.5px dashed var(--cizgi-koyu)',
    borderRadius: 'var(--r)',
    padding: '3rem 2rem',
    textAlign: 'center',
    color: 'var(--yazi-soft)',
    background: 'var(--kart)',
  },
};
