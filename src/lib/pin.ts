// ---------------------------------------------------------------------------
// PIN güvenliği (şartname Bölüm 3).
//
//   - PIN'ler ASLA düz metin saklanmaz. SHA-256 + rastgele salt ile hash'lenir.
//   - Hash kayıtları Firestore "pinKayitlari" koleksiyonunda tutulur.
//   - Yanlış deneme sayısı sınırlandırılır (geçici kilit — bu dosyada değil,
//     useAuth tarafında localStorage ile yönetilir).
//
// GÜVENLİK NOTU: Şartname, PIN doğrulamasının ileride mümkünse Cloud Functions
// üzerinden yapılmasını öneriyor. Faz 1 (web çekirdeği) için doğrulama istemci
// tarafında hash karşılaştırması ile yapılıyor; sonraki bir fazda sunucuya
// (Cloud Functions) taşınabilecek şekilde bu modül izole tutuldu.
// ---------------------------------------------------------------------------
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Rol } from '@/types';

/** Firestore'daki PIN kaydı (hash'li). */
export interface PinKaydi {
  id?: string;
  rol: Rol;
  /** Şube rolü için ilgili şube adı; diğer roller için boş. */
  sube?: string;
  saltHex: string;
  hashHex: string;
  olusturulma: string;
}

const PIN_KOLEKSIYON = 'pinKayitlari';

/** ArrayBuffer -> hex metin. */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Rastgele salt üretir (16 bayt, hex). */
export function saltUret(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PIN + salt -> SHA-256 hash (hex). */
export async function pinHashle(pin: string, saltHex: string): Promise<string> {
  const veri = new TextEncoder().encode(saltHex + ':' + pin);
  const digest = await crypto.subtle.digest('SHA-256', veri);
  return bufToHex(digest);
}

/** PIN biçim kontrolü: yalnızca rakam ve 4-6 hane. */
export function pinGecerliMi(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Sistemde hiç PIN kaydı var mı? (İlk kurulum modunu belirlemek için.) */
export async function pinKaydiVarMi(): Promise<boolean> {
  const snap = await getDocs(collection(db, PIN_KOLEKSIYON));
  return !snap.empty;
}

/** Yeni bir PIN kaydı oluşturur (hash'leyerek). */
export async function pinKaydiEkle(pin: string, rol: Rol, sube?: string): Promise<void> {
  const saltHex = saltUret();
  const hashHex = await pinHashle(pin, saltHex);
  const kayit: Omit<PinKaydi, 'id'> = {
    rol,
    ...(sube ? { sube } : {}),
    saltHex,
    hashHex,
    olusturulma: new Date().toISOString(),
  };
  await addDoc(collection(db, PIN_KOLEKSIYON), kayit);
}

/** Başarılı doğrulama sonucu (eşleşen kaydın rol/şube bilgisi). */
export interface PinEslesme {
  rol: Rol;
  sube?: string;
}

/**
 * Girilen PIN'i tüm kayıtlara karşı dener.
 * Eşleşme bulursa rol/şube döner, yoksa null.
 * (Kayıt sayısı az olduğundan tüm kayıtların salt'ı ile hash hesaplanır.)
 */
export async function pinDogrula(pin: string): Promise<PinEslesme | null> {
  const snap = await getDocs(collection(db, PIN_KOLEKSIYON));
  for (const d of snap.docs) {
    const k = d.data() as PinKaydi;
    const hash = await pinHashle(pin, k.saltHex);
    if (hash === k.hashHex) {
      return { rol: k.rol, sube: k.sube };
    }
  }
  return null;
}

/** Belirli bir rol için kayıt olup olmadığını döner (örn. yönetici var mı?). */
export async function rolKaydiVarMi(rol: Rol): Promise<boolean> {
  const q = query(collection(db, PIN_KOLEKSIYON), where('rol', '==', rol));
  const snap = await getDocs(q);
  return !snap.empty;
}
