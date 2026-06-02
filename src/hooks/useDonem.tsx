// ---------------------------------------------------------------------------
// Dönem bağlamı (Faz 2 — dönem sistemi).
//
//   - Tüm dönemleri yükler (en yeni üstte).
//   - aktifDonem: kilitli olmayan güncel dönem (hareket girişi buraya yapılır).
//   - seciliDonem: ekranda görüntülenen dönem (varsayılan = aktif).
//     Geçmiş (kilitli) bir dönem seçilirse uygulama salt görüntüleme olur.
//   - yeniDonemAc(): mevcut dönemi kilitler, kalan borçları yeni döneme devreder.
//
// Geriye dönük uyum: `donem` alanı = seciliDonem (Faz 1 ekranları bozulmasın).
// ---------------------------------------------------------------------------
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  donemleriGetir,
  aktifDonemiGetirVeyaOlustur,
  yeniDonemAc as veriYeniDonemAc,
} from '@/lib/veri';
import type { Donem } from '@/types';

interface DonemContextTipi {
  donemler: Donem[];
  /** Kilitli olmayan güncel dönem (hareket girişi buraya). */
  aktifDonem: Donem | null;
  /** Ekranda görüntülenen dönem (varsayılan = aktif). */
  seciliDonem: Donem | null;
  /** Geriye dönük uyum (Faz 1): = seciliDonem. */
  donem: Donem | null;
  /** Görüntülenen dönem aktif (düzenlenebilir) dönem mi? */
  duzenlenebilir: boolean;
  yukleniyor: boolean;
  hata: string | null;
  /** Görüntülenecek dönemi değiştirir (geçmiş dönem incelemesi). */
  donemSec: (donemId: string) => void;
  /** Yeni dönem açar; mevcut dönemi kilitleyip kalanları devreder. */
  yeniDonemAc: () => Promise<void>;
  yenidenYukle: () => void;
}

const DonemContext = createContext<DonemContextTipi | null>(null);

export function DonemProvider({ children }: { children: ReactNode }) {
  const [donemler, setDonemler] = useState<Donem[]>([]);
  const [aktifDonem, setAktifDonem] = useState<Donem | null>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(() => {
    setYukleniyor(true);
    setHata(null);
    // Önce aktif dönemi (gerekirse oluşturarak) belirle, sonra tüm listeyi al
    aktifDonemiGetirVeyaOlustur()
      .then(async (aktif) => {
        setAktifDonem(aktif);
        const liste = await donemleriGetir();
        setDonemler(liste);
        // Seçili dönem yoksa veya listede kalmadıysa aktife dön
        setSeciliId((mevcut) =>
          mevcut && liste.some((d) => d.id === mevcut) ? mevcut : aktif.id,
        );
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        setHata('Dönem yüklenemedi. Firebase bağlantısını kontrol edin.');
      })
      .finally(() => setYukleniyor(false));
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const donemSec = useCallback((id: string) => setSeciliId(id), []);

  const yeniDonemAc = useCallback(async () => {
    if (!aktifDonem) return;
    const yeni = await veriYeniDonemAc(aktifDonem.id);
    // Listeyi tazele ve yeni dönemi aktif + seçili yap
    const liste = await donemleriGetir();
    setDonemler(liste);
    setAktifDonem(yeni);
    setSeciliId(yeni.id);
  }, [aktifDonem]);

  const seciliDonem = donemler.find((d) => d.id === seciliId) ?? aktifDonem;
  const duzenlenebilir = !!seciliDonem && !seciliDonem.kilitliMi && seciliDonem.id === aktifDonem?.id;

  return (
    <DonemContext.Provider
      value={{
        donemler,
        aktifDonem,
        seciliDonem,
        donem: seciliDonem,
        duzenlenebilir,
        yukleniyor,
        hata,
        donemSec,
        yeniDonemAc,
        yenidenYukle: yukle,
      }}
    >
      {children}
    </DonemContext.Provider>
  );
}

export function useDonem(): DonemContextTipi {
  const ctx = useContext(DonemContext);
  if (!ctx) throw new Error('useDonem, DonemProvider içinde kullanılmalı.');
  return ctx;
}
