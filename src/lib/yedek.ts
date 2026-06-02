// ---------------------------------------------------------------------------
// Yedekleme (şartname Bölüm 7).
//
//   - yedekIndir(): tüm veritabanını tek JSON olarak indirir
//     (basak-yedek-YYYY-AA-GG.json).
//   - yedektenYukle(): JSON'u doğrular ve Firestore'a geri yazar (üzerine yazar).
//   - otomatikYedek(): günde 1 kez tüm veriyi Firebase Storage'a yazar, 30 günden
//     eski yedekleri siler. Storage etkin değilse sessizce atlanır.
//
// NOT (otomatik yedek mimarisi): İdeal çözüm zamanlanmış bir Cloud Function'dır
// (functions/ klasöründe örnek verildi). Blaze planı / fonksiyon dağıtımı yoksa,
// burada uygulama açılışında günde 1 kez çalışan istemci taraflı bir yedek devreye
// girer. İkisi birlikte de kullanılabilir.
// ---------------------------------------------------------------------------
import { ref, uploadString, listAll, deleteObject } from 'firebase/storage';
import { storage, firebaseConfigured } from './firebase';
import { tumVeriyiGetir, veriyiGeriYukle } from './veri';
import { dosyaIndir, bugunDamgasi } from './indir';
import type { Donem, Firma, Hareket, Devir } from '@/types';

const YEDEK_SURUM = 1;
const UYGULAMA = 'basak-odeme-cari-takip';
const STORAGE_KLASOR = 'yedekler';
const SAKLAMA_GUN = 30;
const LS_SON_YEDEK = 'basak_son_oto_yedek'; // "YYYY-MM-DD"

/** Yedek dosyası yapısı. */
export interface Yedek {
  uygulama: string;
  surum: number;
  olusturulma: string;
  donemler: Donem[];
  firmalar: Firma[];
  hareketler: Hareket[];
  devirler: Devir[];
}

/** Tüm veriyi çekip yedek nesnesi oluşturur. */
export async function yedekOlustur(): Promise<Yedek> {
  const { donemler, firmalar, hareketler, devirler } = await tumVeriyiGetir();
  return {
    uygulama: UYGULAMA,
    surum: YEDEK_SURUM,
    olusturulma: new Date().toISOString(),
    donemler,
    firmalar,
    hareketler,
    devirler,
  };
}

/** Tüm veritabanını JSON dosyası olarak indirir. */
export async function yedekIndir(): Promise<void> {
  const yedek = await yedekOlustur();
  const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: 'application/json' });
  dosyaIndir(blob, `basak-yedek-${bugunDamgasi()}.json`);
}

/** JSON metnini doğrular ve yedek nesnesine çevirir (hatalıysa fırlatır). */
export function yedegiAyrıştır(jsonMetin: string): Yedek {
  let obj: unknown;
  try {
    obj = JSON.parse(jsonMetin);
  } catch {
    throw new Error('Dosya geçerli bir JSON değil.');
  }
  const y = obj as Partial<Yedek>;
  if (y.uygulama !== UYGULAMA) {
    throw new Error('Bu dosya bir Başak yedeği değil (uygulama etiketi uyuşmuyor).');
  }
  if (!Array.isArray(y.firmalar) || !Array.isArray(y.hareketler) || !Array.isArray(y.donemler)) {
    throw new Error('Yedek dosyası eksik/bozuk (firmalar/hareketler/donemler bulunamadı).');
  }
  return {
    uygulama: y.uygulama,
    surum: y.surum ?? 1,
    olusturulma: y.olusturulma ?? '',
    donemler: y.donemler ?? [],
    firmalar: y.firmalar ?? [],
    hareketler: y.hareketler ?? [],
    devirler: y.devirler ?? [],
  };
}

/** Yedeği Firestore'a geri yazar (üzerine yazar). */
export async function yedektenYukle(yedek: Yedek): Promise<void> {
  await veriyiGeriYukle(yedek);
}

/** Yedek özet sayıları (onay ekranında göstermek için). */
export function yedekOzeti(y: Yedek): string {
  return `${y.donemler.length} dönem, ${y.firmalar.length} firma, ${y.hareketler.length} hareket, ${y.devirler.length} devir`;
}

// ---- Otomatik günlük yedek (Storage) --------------------------------------

/** Storage yol adından "YYYY-MM-DD" tarihini çıkarır. */
function adTarih(ad: string): string | null {
  const m = ad.match(/basak-yedek-(\d{4}-\d{2}-\d{2})\.json$/);
  return m ? m[1] : null;
}

/** 30 günden eski Storage yedeklerini siler. */
async function eskiYedekleriTemizle(): Promise<void> {
  const klasor = ref(storage, STORAGE_KLASOR);
  const liste = await listAll(klasor);
  const sinir = new Date();
  sinir.setDate(sinir.getDate() - SAKLAMA_GUN);
  for (const item of liste.items) {
    const t = adTarih(item.name);
    if (t && new Date(t) < sinir) {
      await deleteObject(item).catch(() => {});
    }
  }
}

/**
 * Günde 1 kez otomatik yedek alır ve Storage'a yazar.
 * Best-effort: Storage etkin değilse / hata olursa sessizce atlar.
 * @returns true: yedek alındı, false: bugün zaten alınmış veya atlandı.
 */
export async function otomatikYedek(): Promise<boolean> {
  if (!firebaseConfigured) return false;
  const bugun = bugunDamgasi();
  if (localStorage.getItem(LS_SON_YEDEK) === bugun) return false; // bugün alınmış

  try {
    const yedek = await yedekOlustur();
    const yol = `${STORAGE_KLASOR}/basak-yedek-${bugun}.json`;
    await uploadString(ref(storage, yol), JSON.stringify(yedek), 'raw', {
      contentType: 'application/json',
    });
    localStorage.setItem(LS_SON_YEDEK, bugun);
    // Eski yedekleri temizle (hatayı yut)
    await eskiYedekleriTemizle().catch(() => {});
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Yedek] Otomatik yedek atlandı. Firebase Storage etkin mi? (Console > Storage)',
      e,
    );
    return false;
  }
}
