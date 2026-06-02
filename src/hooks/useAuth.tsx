// ---------------------------------------------------------------------------
// Oturum yönetimi (PIN ile giriş).
//
//   - Giriş yapıldığında rol (Yönetici/Muhasebe/Şube) ve varsa şube tutulur.
//   - Yanlış deneme sayısı sınırlanır; sınır aşılınca geçici kilit uygulanır
//     (localStorage ile, sayfa yenilense de korunur).
//   - Oturum sekmeye özeldir (sessionStorage); sekme kapanınca PIN tekrar sorulur.
// ---------------------------------------------------------------------------
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { pinDogrula, pinGecerliMi } from '@/lib/pin';
import type { Rol } from '@/types';

/** Aktif oturum bilgisi. */
export interface Oturum {
  rol: Rol;
  /** Yalnızca "Şube" rolünde dolu olur. */
  sube?: string;
}

interface AuthContextTipi {
  oturum: Oturum | null;
  /** Geçici kilit bitiş zamanı (ms epoch); kilit yoksa 0. */
  kilitBitis: number;
  /** Kalan yanlış deneme hakkı. */
  kalanDeneme: number;
  girisYap: (pin: string) => Promise<{ ok: boolean; mesaj?: string }>;
  cikisYap: () => void;
}

const AuthContext = createContext<AuthContextTipi | null>(null);

// Deneme sınırı ayarları
const MAKS_DENEME = 5;
const KILIT_SURESI_MS = 60_000; // 1 dakika

// localStorage anahtarları
const LS_HATA = 'basak_pin_hata';
const LS_KILIT = 'basak_pin_kilit';
const SS_OTURUM = 'basak_oturum';

function sayiOku(anahtar: string): number {
  const v = localStorage.getItem(anahtar);
  return v ? Number(v) : 0;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Sekme oturumunu sessionStorage'dan geri yükle (sayfa yenilemesine dayanıklı)
  const [oturum, setOturum] = useState<Oturum | null>(() => {
    const ham = sessionStorage.getItem(SS_OTURUM);
    return ham ? (JSON.parse(ham) as Oturum) : null;
  });
  const [kilitBitis, setKilitBitis] = useState<number>(() => sayiOku(LS_KILIT));
  const [hataSayisi, setHataSayisi] = useState<number>(() => sayiOku(LS_HATA));

  const girisYap = useCallback(
    async (pin: string): Promise<{ ok: boolean; mesaj?: string }> => {
      // Kilitli mi?
      const simdi = Date.now();
      if (kilitBitis > simdi) {
        const kalanSn = Math.ceil((kilitBitis - simdi) / 1000);
        return { ok: false, mesaj: `Çok fazla yanlış deneme. ${kalanSn} sn bekleyin.` };
      }

      if (!pinGecerliMi(pin)) {
        return { ok: false, mesaj: 'PIN 4-6 haneli olmalı.' };
      }

      const eslesme = await pinDogrula(pin);
      if (eslesme) {
        // Başarılı: sayaçları sıfırla, oturumu kaydet
        localStorage.removeItem(LS_HATA);
        localStorage.removeItem(LS_KILIT);
        setHataSayisi(0);
        setKilitBitis(0);
        const yeniOturum: Oturum = { rol: eslesme.rol, sube: eslesme.sube };
        sessionStorage.setItem(SS_OTURUM, JSON.stringify(yeniOturum));
        setOturum(yeniOturum);
        return { ok: true };
      }

      // Başarısız: hata sayacını artır, gerekirse kilitle
      const yeniHata = hataSayisi + 1;
      setHataSayisi(yeniHata);
      localStorage.setItem(LS_HATA, String(yeniHata));

      if (yeniHata >= MAKS_DENEME) {
        const bitis = simdi + KILIT_SURESI_MS;
        setKilitBitis(bitis);
        localStorage.setItem(LS_KILIT, String(bitis));
        localStorage.removeItem(LS_HATA);
        setHataSayisi(0);
        return {
          ok: false,
          mesaj: `Çok fazla yanlış deneme. ${KILIT_SURESI_MS / 1000} sn kilitlendi.`,
        };
      }

      const kalan = MAKS_DENEME - yeniHata;
      return { ok: false, mesaj: `Hatalı PIN. Kalan deneme: ${kalan}` };
    },
    [kilitBitis, hataSayisi],
  );

  const cikisYap = useCallback(() => {
    sessionStorage.removeItem(SS_OTURUM);
    setOturum(null);
  }, []);

  const kalanDeneme = Math.max(0, MAKS_DENEME - hataSayisi);

  return (
    <AuthContext.Provider value={{ oturum, kilitBitis, kalanDeneme, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Oturum bilgisine ve giriş/çıkış işlevlerine erişim. */
export function useAuth(): AuthContextTipi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return ctx;
}

// ---- Yetki yardımcıları (rollere göre erişim — Bölüm 3) --------------------

/** Yönetici tam yetkilidir (firma ekle/sil, dönem aç, yedek). */
export function yoneticiMi(o: Oturum | null): boolean {
  return o?.rol === 'Yönetici';
}

/** Muhasebe ve Yönetici hareket/ödeme girişi yapabilir. */
export function girisYetkisiVar(o: Oturum | null): boolean {
  return o?.rol === 'Yönetici' || o?.rol === 'Muhasebe';
}

/**
 * Belirli bir şubeye ait kaydı görme yetkisi.
 * Şube rolü yalnızca kendi şubesini görür; diğer roller hepsini görür.
 */
export function subeyiGorebilir(o: Oturum | null, sube?: string): boolean {
  if (!o) return false;
  if (o.rol === 'Şube') return !!sube && sube === o.sube;
  return true;
}
