// ---------------------------------------------------------------------------
// Özet Panosu / Dashboard (zengin — recharts grafikleri).
//
//   - 4 KPI kartı: Toplam Kalan Borç, Bekleyen/Gecikmiş, Bu Dönem Ödenen, Firma
//   - Pasta grafik: bölüm bazında borç dağılımı
//   - Çubuk grafik: en borçlu firmalar
//   - Trend çizgisi: dönemlere göre toplam borç değişimi
//   - Firma kalan borç listesi (TEMİZ / BORÇLU)
//
// Veriler seçili döneme göre canlı; Şube rolü yalnızca kendi şubesini görür.
// İşlevsellik (kalan borç hesabı vb.) lib/ozet + lib/hesaplama'dan gelir.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  AlertTriangle,
  Banknote,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  ListChecks,
  CalendarClock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { Firma, Hareket, Devir } from '@/types';
import {
  firmalariDinle,
  donemHareketleriDinle,
  donemDevirleriDinle,
  donemVerisiniGetir,
} from '@/lib/veri';
import {
  firmaOzetleriHesapla,
  bolumBazindaToplam,
  toplamKalan,
  bekleyenGecikmisToplam,
  odenenToplam,
  donemToplamKalan,
} from '@/lib/ozet';
import { tlBicimle, tlKisa } from '@/lib/hesaplama';
import { donemEtiketi } from '@/lib/tarih';
import { useAuth, subeyiGorebilir } from '@/hooks/useAuth';
import { useDonem } from '@/hooks/useDonem';
import Araclar from '@/components/Araclar';
import Sayac from '@/components/Sayac';

// Marka uyumlu lüks palet (altın / siyah / gri tonları)
const PALET = ['#F4DF16', '#0c0c0c', '#E6CF00', '#9a9a9a', '#fad643', '#5b5b5b', '#fde98a', '#c9c9c9', '#7a6e00'];

interface Props {
  onFirmaSec?: (firmaId: string) => void;
}

export default function Ozet({ onFirmaSec }: Props) {
  const { oturum } = useAuth();
  const { seciliDonem, donemler, yukleniyor } = useDonem();

  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [hareketler, setHareketler] = useState<Hareket[]>([]);
  const [devirler, setDevirler] = useState<Devir[]>([]);
  const [trend, setTrend] = useState<{ ad: string; toplam: number }[]>([]);

  useEffect(() => firmalariDinle(setFirmalar), []);

  useEffect(() => {
    if (!seciliDonem) return;
    const off1 = donemHareketleriDinle(seciliDonem.id, setHareketler);
    const off2 = donemDevirleriDinle(seciliDonem.id, setDevirler);
    return () => {
      off1();
      off2();
    };
  }, [seciliDonem]);

  // Şube rolü filtresi
  const gorunenFirmalar = useMemo(
    () => firmalar.filter((f) => subeyiGorebilir(oturum, f.sube)),
    [firmalar, oturum],
  );
  const gorunenIdler = useMemo(() => new Set(gorunenFirmalar.map((f) => f.id)), [gorunenFirmalar]);
  const gHareketler = useMemo(
    () => hareketler.filter((h) => gorunenIdler.has(h.firmaId)),
    [hareketler, gorunenIdler],
  );
  const gDevirler = useMemo(
    () => devirler.filter((d) => gorunenIdler.has(d.firmaId)),
    [devirler, gorunenIdler],
  );

  const ozetler = useMemo(
    () => firmaOzetleriHesapla(gorunenFirmalar, gHareketler, gDevirler),
    [gorunenFirmalar, gHareketler, gDevirler],
  );

  const genelToplam = toplamKalan(ozetler);
  const bekleyen = bekleyenGecikmisToplam(gHareketler);
  const odenen = odenenToplam(gHareketler);

  // Firma kartları: Ödemeler / Taşeronlar / Hepsi filtresi
  const [firmaFiltre, setFirmaFiltre] = useState<'hepsi' | 'odeme' | 'taseron'>('hepsi');
  const kartlar = useMemo(
    () =>
      ozetler.filter((o) =>
        firmaFiltre === 'hepsi'
          ? true
          : firmaFiltre === 'taseron'
            ? o.firma.bolum === 'Taşeron'
            : o.firma.bolum !== 'Taşeron',
      ),
    [ozetler, firmaFiltre],
  );

  // Her firmanın son ödeme tarihi (odenenTutar>0 olan en güncel hareket)
  const sonOdeme = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of gHareketler) {
      if ((h.odenenTutar || 0) > 0) {
        const mevcut = m.get(h.firmaId);
        if (!mevcut || h.tarih > mevcut) m.set(h.firmaId, h.tarih);
      }
    }
    return m;
  }, [gHareketler]);

  // Pasta: bölüm bazında (sıfır olmayan)
  const bolumVeri = useMemo(
    () =>
      Object.entries(bolumBazindaToplam(ozetler))
        .filter(([, v]) => v > 0)
        .map(([ad, deger]) => ({ ad, deger })),
    [ozetler],
  );

  // Çubuk: en borçlu ilk 8 firma
  const firmaVeri = useMemo(
    () =>
      ozetler
        .filter((o) => o.kalan > 0)
        .slice(0, 8)
        .map((o) => ({ ad: o.firma.ad, kalan: o.kalan })),
    [ozetler],
  );

  // Trend: tüm dönemlerin toplam borcu (tek seferlik çekim)
  useEffect(() => {
    let iptal = false;
    async function yukle() {
      if (donemler.length === 0) {
        setTrend([]);
        return;
      }
      const sirali = [...donemler].sort((a, b) => a.ad.localeCompare(b.ad));
      const sonuc: { ad: string; toplam: number }[] = [];
      for (const d of sirali) {
        try {
          const { hareketler: h, devirler: dv } = await donemVerisiniGetir(d.id);
          const gh = h.filter((x) => gorunenIdler.has(x.firmaId));
          const gd = dv.filter((x) => gorunenIdler.has(x.firmaId));
          sonuc.push({ ad: donemEtiketi(d.id).split(' · ')[1] || d.ad, toplam: donemToplamKalan(gh, gd) });
        } catch {
          sonuc.push({ ad: d.ad, toplam: 0 });
        }
      }
      if (!iptal) setTrend(sonuc);
    }
    yukle();
    return () => {
      iptal = true;
    };
  }, [donemler, gorunenIdler]);

  return (
    <div style={{ padding: '1.25rem', display: 'grid', gap: '1.25rem', maxWidth: 1280, margin: '0 auto' }}>
      <Araclar />

      {/* KPI kartları */}
      <div className="ozet-kpi">
        <KpiKart
          baslik="Toplam Kalan Borç"
          deger={genelToplam}
          bicim={tlBicimle}
          ikon={<Wallet size={22} />}
          vurgu
          gecikme={0}
        />
        <KpiKart
          baslik="Bekleyen / Gecikmiş"
          deger={bekleyen}
          bicim={tlBicimle}
          ikon={<AlertTriangle size={22} />}
          renk={bekleyen > 0 ? 'var(--durum-borclu)' : 'var(--durum-temiz)'}
          gecikme={0.07}
        />
        <KpiKart
          baslik="Bu Dönem Ödenen"
          deger={odenen}
          bicim={tlBicimle}
          ikon={<Banknote size={22} />}
          renk="var(--durum-temiz)"
          gecikme={0.14}
        />
        <KpiKart
          baslik="Firma Sayısı"
          deger={gorunenFirmalar.length}
          bicim={(n) => String(Math.round(n))}
          ikon={<Building2 size={22} />}
          gecikme={0.21}
        />
      </div>

      {yukleniyor && <p>Yükleniyor…</p>}

      {/* Pasta + Çubuk */}
      <div className="ozet-iki-kolon">
        <div className="basak-kart kart-lift" style={kutu}>
          <Baslik ikon={<PieIcon size={16} />} metin="Bölüm Bazında Borç Dağılımı" />
          <div style={{ padding: '0.5rem' }}>
            {bolumVeri.length === 0 ? (
              <p style={bos}>Borçlu bölüm yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={bolumVeri}
                    dataKey="deger"
                    nameKey="ad"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {bolumVeri.map((_, i) => (
                      <Cell key={i} fill={PALET[i % PALET.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => tlBicimle(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="basak-kart kart-lift" style={kutu}>
          <Baslik ikon={<BarChart3 size={16} />} metin="En Borçlu Firmalar" />
          <div style={{ padding: '0.5rem' }}>
            {firmaVeri.length === 0 ? (
              <p style={bos}>Borçlu firma yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={firmaVeri} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" tickFormatter={tlKisa} tick={{ fontSize: 11, fill: '#6b6f76' }} />
                  <YAxis
                    type="category"
                    dataKey="ad"
                    width={120}
                    tick={{ fontSize: 11, fill: '#141414' }}
                  />
                  <Tooltip formatter={(v) => tlBicimle(Number(v))} cursor={{ fill: 'rgba(244,223,22,0.12)' }} />
                  <Bar dataKey="kalan" fill="#F4DF16" radius={[0, 6, 6, 0]} stroke="#0c0c0c" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="basak-kart kart-lift" style={kutu}>
        <Baslik ikon={<TrendingUp size={16} />} metin="Dönemlere Göre Toplam Borç (Trend)" />
        <div style={{ padding: '0.75rem 0.5rem 0.25rem' }}>
          {trend.length <= 1 ? (
            <p style={bos}>
              Trend için en az iki dönem gerekir. Şu an tek dönem var; "Yeni Dönem Aç" ile zamanla
              trend oluşur.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="ad" tick={{ fontSize: 11, fill: '#141414' }} />
                <YAxis tickFormatter={tlKisa} tick={{ fontSize: 11, fill: '#6b6f76' }} width={70} />
                <Tooltip formatter={(v) => tlBicimle(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="toplam"
                  stroke="#0c0c0c"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#F4DF16', stroke: '#0c0c0c', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Firma kartları (premium sarı kutular) + Ödemeler/Taşeronlar/Hepsi filtresi */}
      <div className="basak-kart" style={kutu}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--cizgi)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem' }}>
            <ListChecks size={16} style={{ color: 'var(--yazi-soft)' }} /> Firmalar ({kartlar.length})
          </span>
          <div style={{ display: 'inline-flex', background: '#f0f0f0', borderRadius: 999, padding: 4, gap: 4 }}>
            {([
              ['hepsi', 'Hepsi'],
              ['odeme', 'Ödemeler'],
              ['taseron', 'Taşeronlar'],
            ] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFirmaFiltre(k)} style={segBtn(firmaFiltre === k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {kartlar.length === 0 ? (
          <p style={bos}>Bu grupta firma yok.</p>
        ) : (
          <div className="firma-kart-izgara">
            {kartlar.map((o) => (
              <motion.button
                key={o.firma.id}
                onClick={() => onFirmaSec?.(o.firma.id)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={firmaKart(o.temiz)}
                title={`${o.firma.ad} — hareketleri gör`}
              >
                <span style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>{o.firma.ad}</span>
                <span className="font-baslik" style={{ fontWeight: 800, fontSize: '1.32rem', marginTop: 4 }}>
                  {tlBicimle(o.kalan)}
                </span>
                <span style={{ fontSize: '0.72rem', marginTop: 10, opacity: 0.72, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CalendarClock size={13} /> Son ödeme: {tarihGoster(sonOdeme.get(o.firma.id))}
                </span>
                {o.temiz && <span style={temizRozet}>TEMİZ</span>}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** "YYYY-MM-DD" → "DD.MM.YYYY"; yoksa "—". */
function tarihGoster(iso?: string): string {
  if (!iso) return '—';
  const [y, a, g] = iso.split('-');
  return g && a && y ? `${g}.${a}.${y}` : iso;
}

function segBtn(aktif: boolean): React.CSSProperties {
  return {
    border: 'none',
    cursor: 'pointer',
    padding: '0.4rem 0.85rem',
    borderRadius: 999,
    fontSize: '0.82rem',
    fontWeight: 700,
    background: aktif ? 'var(--basak-siyah)' : 'transparent',
    color: aktif ? 'var(--basak-sari)' : 'var(--yazi-soft)',
    transition: 'background 0.15s ease, color 0.15s ease',
  };
}

/** Premium sarı firma kartı. */
function firmaKart(temiz: boolean): React.CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    cursor: 'pointer',
    background: temiz
      ? 'linear-gradient(160deg, #fef9c8 0%, #fdf0a0 100%)'
      : 'linear-gradient(160deg, #f9e74a 0%, var(--basak-sari) 100%)',
    color: 'var(--basak-siyah)',
    border: '1px solid rgba(0,0,0,0.18)',
    borderRadius: 16,
    padding: '0.95rem 1rem',
    minHeight: 118,
    boxShadow: 'var(--golge-2)',
    font: 'inherit',
  };
}

const temizRozet: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  background: 'rgba(0,0,0,0.85)',
  color: 'var(--basak-sari)',
  fontSize: '0.6rem',
  fontWeight: 800,
  letterSpacing: '0.5px',
  padding: '0.12rem 0.4rem',
  borderRadius: 999,
};

/** KPI kartı (count-up + giriş + hover lift). vurgu=true → siyah kart + altın. */
function KpiKart({
  baslik,
  deger,
  bicim,
  ikon,
  vurgu,
  renk,
  gecikme = 0,
}: {
  baslik: string;
  deger: number;
  bicim: (n: number) => string;
  ikon: React.ReactNode;
  vurgu?: boolean;
  renk?: string;
  gecikme?: number;
}) {
  return (
    <motion.div
      className="basak-kart"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: gecikme, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      style={{
        padding: '1.1rem 1.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: vurgu ? 'var(--basak-siyah)' : 'var(--kart)',
      }}
    >
      <span className={vurgu ? '' : 'ikon-cip'} style={vurgu ? cipSari : undefined}>
        {ikon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', color: vurgu ? 'rgba(255,255,255,0.7)' : 'var(--yazi-soft)', fontWeight: 600 }}>
          {baslik}
        </div>
        <div
          className="font-baslik"
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            lineHeight: 1.15,
            color: vurgu ? 'var(--basak-sari)' : renk || 'var(--yazi)',
            whiteSpace: 'nowrap',
          }}
        >
          <Sayac deger={deger} bicim={bicim} />
        </div>
      </div>
    </motion.div>
  );
}

function Baslik({ ikon, metin }: { ikon: React.ReactNode; metin: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--cizgi)',
        fontWeight: 700,
        fontSize: '0.92rem',
      }}
    >
      <span style={{ color: 'var(--yazi-soft)' }}>{ikon}</span>
      {metin}
    </div>
  );
}

const cipSari: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  borderRadius: 12,
  background: 'var(--basak-sari)',
  color: 'var(--basak-siyah)',
  flex: 'none',
};

const kutu: React.CSSProperties = { overflow: 'hidden' };
const bos: React.CSSProperties = { padding: '1.5rem', color: 'var(--yazi-soft)', margin: 0, textAlign: 'center' };
