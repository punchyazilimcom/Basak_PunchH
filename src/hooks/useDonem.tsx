// ---------------------------------------------------------------------------
// Aktif dönem bağlamı.
// Faz 1'de tek bir aktif dönem otomatik açılır/yüklenir. Faz 3'te "Yeni Dönem
// Aç" akışı bu bağlamı kullanarak dönem değiştirebilecek.
// ---------------------------------------------------------------------------
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { aktifDonemiGetirVeyaOlustur } from '@/lib/veri';
import type { Donem } from '@/types';

interface DonemContextTipi {
  donem: Donem | null;
  yukleniyor: boolean;
  hata: string | null;
  yenidenYukle: () => void;
}

const DonemContext = createContext<DonemContextTipi | null>(null);

export function DonemProvider({ children }: { children: ReactNode }) {
  const [donem, setDonem] = useState<Donem | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(() => {
    setYukleniyor(true);
    setHata(null);
    aktifDonemiGetirVeyaOlustur()
      .then(setDonem)
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

  return (
    <DonemContext.Provider value={{ donem, yukleniyor, hata, yenidenYukle: yukle }}>
      {children}
    </DonemContext.Provider>
  );
}

export function useDonem(): DonemContextTipi {
  const ctx = useContext(DonemContext);
  if (!ctx) throw new Error('useDonem, DonemProvider içinde kullanılmalı.');
  return ctx;
}
