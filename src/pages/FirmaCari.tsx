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
import { BOLUMLER, type Bolum, type Firma } from '@/types';
import { firmalariDinle, firmaSil } from '@/lib/veri';
import { useAuth, yoneticiMi, girisYetkisiVar, subeyiGorebilir } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';
import Modal from '@/components/Modal';
import FirmaFormu from '@/components/FirmaFormu';
import CariKart from '@/components/CariKart';

export default function FirmaCari() {
  const { oturum } = useAuth();
  const { donem, yukleniyor, hata } = useDonem();

  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [arama, setArama] = useState('');
  const [bolumFiltre, setBolumFiltre] = useState<Bolum | 'Tümü'>('Tümü');
  const [seciliId, setSeciliId] = useState<string | null>(null);

  const [formAcik, setFormAcik] = useState(false);
  const [formVarsayilanBolum, setFormVarsayilanBolum] = useState<Bolum | undefined>();

  // Firmaları canlı dinle
  useEffect(() => {
    const off = firmalariDinle(setFirmalar);
    return off;
  }, []);

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
    <div style={s.izgara}>
      {/* SOL PANEL */}
      <aside style={s.sol}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {girisYetkisiVar(oturum) && (
            <>
              <button className="basak-btn" style={s.ekleBtn} onClick={() => yeniFirma()}>
                + Yeni Firma
              </button>
              <button className="basak-btn" style={s.ekleBtn} onClick={() => yeniFirma('Taşeron')}>
                + Yeni Taşeron
              </button>
            </>
          )}
        </div>

        <input
          className="basak-alan"
          placeholder="Firma ara…"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 6, marginBottom: 8 }}
        />

        <select
          className="basak-alan"
          value={bolumFiltre}
          onChange={(e) => setBolumFiltre(e.target.value as Bolum | 'Tümü')}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 6, marginBottom: 10 }}
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
              <div>
                <strong>{f.ad}</strong>
                <div style={{ fontSize: '0.75rem', color: seciliId === f.id ? 'var(--basak-sari)' : 'var(--gri-yazi)' }}>
                  {f.bolum}
                  {f.sube ? ` · ${f.sube}` : ''}
                </div>
              </div>
              {yoneticiMi(oturum) && (
                <button
                  className="basak-btn"
                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sil(f);
                  }}
                >
                  🗑
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
        {!yukleniyor && donem && (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--gri-yazi)', marginBottom: 10 }}>
              Aktif Dönem: <strong>{donem.ad}</strong>
              {donem.kilitliMi ? ' (kilitli — arşiv)' : ''}
            </div>
            {secili ? (
              <CariKart firma={secili} donemId={donem.id} kilitli={donem.kilitliMi} />
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
    gridTemplateColumns: 'minmax(240px, 320px) 1fr',
    gap: '1rem',
    padding: '1rem',
    alignItems: 'start',
  },
  sol: {
    border: '2px solid var(--basak-siyah)',
    borderRadius: 10,
    padding: '0.75rem',
    background: 'var(--basak-beyaz)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
    position: 'sticky',
    top: '1rem',
  },
  sag: { minWidth: 0 },
  ekleBtn: { flex: 1, minWidth: 120, padding: '0.5rem', fontSize: '0.85rem' },
  firmaSatir: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    padding: '0.5rem 0.6rem',
    borderRadius: 6,
    cursor: 'pointer',
    borderBottom: '1px solid var(--gri-cizgi)',
  },
  firmaSatirSecili: { background: 'var(--basak-siyah)', color: 'var(--basak-sari)' },
  bosDurum: {
    border: '2px dashed var(--gri-cizgi)',
    borderRadius: 10,
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--gri-yazi)',
  },
};
