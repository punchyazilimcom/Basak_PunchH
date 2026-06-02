// ---------------------------------------------------------------------------
// Firestore veri erişim katmanı (CRUD).
// Ekranlar doğrudan Firestore çağırmaz; bu katmanı kullanır. Böylece sonraki
// fazlarda (dönem sistemi, export) tek yerden genişletilebilir.
//
// Koleksiyonlar:
//   firmalar/{id}            -> Firma
//   donemler/{id}            -> Donem
//   hareketler/{id}          -> Hareket (firmaId + donemId alanlı)
//   devirler/{firmaId_donemId} -> Devir
// ---------------------------------------------------------------------------
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { sonrakiAy } from './tarih';
import { kalanBorc } from './hesaplama';
import type { Firma, Hareket, Devir, Donem } from '@/types';

// ---- FİRMA ----------------------------------------------------------------

const firmaKol = collection(db, 'firmalar');

/** Firma ekler, oluşturulan id'yi döner. */
export async function firmaEkle(veri: Omit<Firma, 'id'>): Promise<string> {
  const ref = await addDoc(firmaKol, veri);
  return ref.id;
}

/** Firmayı günceller. */
export async function firmaGuncelle(id: string, veri: Partial<Omit<Firma, 'id'>>): Promise<void> {
  await setDoc(doc(db, 'firmalar', id), veri, { merge: true });
}

/** Firmayı siler. */
export async function firmaSil(id: string): Promise<void> {
  await deleteDoc(doc(db, 'firmalar', id));
}

/** Tüm firmaları canlı dinler (gerçek zamanlı senkron). */
export function firmalariDinle(cb: (firmalar: Firma[]) => void): Unsubscribe {
  const q = query(firmaKol, orderBy('ad'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Firma, 'id'>) })));
  });
}

// ---- HAREKET --------------------------------------------------------------

const hareketKol = collection(db, 'hareketler');

/** Hareket ekler, id döner. */
export async function hareketEkle(veri: Omit<Hareket, 'id'>): Promise<string> {
  const ref = await addDoc(hareketKol, veri);
  return ref.id;
}

/** Hareketi günceller. */
export async function hareketGuncelle(
  id: string,
  veri: Partial<Omit<Hareket, 'id'>>,
): Promise<void> {
  await setDoc(doc(db, 'hareketler', id), veri, { merge: true });
}

/** Hareketi siler. */
export async function hareketSil(id: string): Promise<void> {
  await deleteDoc(doc(db, 'hareketler', id));
}

/**
 * Bir firmanın bir dönemdeki hareketlerini canlı dinler.
 * (Tarihe göre sıralama istemci tarafında yapılır; bileşik index gerektirmez.)
 */
export function hareketleriDinle(
  firmaId: string,
  donemId: string,
  cb: (hareketler: Hareket[]) => void,
): Unsubscribe {
  const q = query(
    hareketKol,
    where('firmaId', '==', firmaId),
    where('donemId', '==', donemId),
  );
  return onSnapshot(q, (snap) => {
    const liste = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Hareket, 'id'>) }));
    liste.sort((a, b) => a.tarih.localeCompare(b.tarih));
    cb(liste);
  });
}

/**
 * Bir dönemdeki TÜM hareketleri canlı dinler (özet panosu için).
 * Tek alan eşitliği olduğundan bileşik index gerektirmez.
 */
export function donemHareketleriDinle(
  donemId: string,
  cb: (hareketler: Hareket[]) => void,
): Unsubscribe {
  const q = query(hareketKol, where('donemId', '==', donemId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Hareket, 'id'>) })));
  });
}

// ---- DEVİR ----------------------------------------------------------------

/** Devir belge kimliği: firma + dönem başına tekil. */
function devirId(firmaId: string, donemId: string): string {
  return `${firmaId}_${donemId}`;
}

/** Bir firmanın bir dönemdeki devir kaydını canlı dinler (yoksa 0 döner). */
export function devirDinle(
  firmaId: string,
  donemId: string,
  cb: (devir: number) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'devirler', devirId(firmaId, donemId)), (snap) => {
    cb(snap.exists() ? (snap.data() as Devir).tutar : 0);
  });
}

/** Devir tutarını ayarlar (dönem devrinde de kullanılır). */
export async function devirAyarla(firmaId: string, donemId: string, tutar: number): Promise<void> {
  const veri: Devir = { firmaId, donemId, tutar };
  await setDoc(doc(db, 'devirler', devirId(firmaId, donemId)), veri);
}

/** Bir dönemdeki TÜM devirleri canlı dinler (özet panosu için). */
export function donemDevirleriDinle(donemId: string, cb: (devirler: Devir[]) => void): Unsubscribe {
  const q = query(collection(db, 'devirler'), where('donemId', '==', donemId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Devir));
  });
}

// ---- DÖNEM ----------------------------------------------------------------

const donemKol = collection(db, 'donemler');

/** Tüm dönemleri getirir (ada göre azalan: en yeni üstte). */
export async function donemleriGetir(): Promise<Donem[]> {
  const snap = await getDocs(donemKol);
  const liste = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Donem, 'id'>) }));
  liste.sort((a, b) => b.ad.localeCompare(a.ad));
  return liste;
}

/** Dönem ekler (id olarak ad kullanılır, ör. "2026-03"). */
export async function donemEkle(ad: string): Promise<Donem> {
  const veri: Omit<Donem, 'id'> = { ad, kilitliMi: false };
  await setDoc(doc(db, 'donemler', ad), veri);
  return { id: ad, ...veri };
}

/**
 * Aktif (en güncel, kilitsiz) dönemi getirir. Hiç dönem yoksa, içinde
 * bulunulan aya ("YYYY-MM") göre otomatik bir dönem oluşturur.
 * Faz 3'te "Yeni Dönem Aç" akışı bunu genişletecek.
 */
export async function aktifDonemiGetirVeyaOlustur(): Promise<Donem> {
  const donemler = await donemleriGetir();
  const acik = donemler.find((d) => !d.kilitliMi);
  if (acik) return acik;
  if (donemler.length > 0) return donemler[0]; // hepsi kilitliyse en yenisi
  const ay = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return donemEkle(ay);
}

/** Tek bir dönemi id ile getirir. */
export async function donemGetir(id: string): Promise<Donem | null> {
  const snap = await getDoc(doc(db, 'donemler', id));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Donem, 'id'>) } : null;
}

/** Bir dönemi kilitler (arşivler). */
export async function donemKilitle(id: string): Promise<void> {
  await setDoc(doc(db, 'donemler', id), { kilitliMi: true }, { merge: true });
}

/**
 * YENİ DÖNEM AÇ (dönem devri — şartname Bölüm 6).
 * Tek bir atomik batch içinde:
 *   1. Mevcut dönemi kilitler (kilitliMi = true).
 *   2. Mevcut dönem sonundaki her firmanın KALAN BORCUNU hesaplar
 *      (Devir + ΣFatura − ΣÖdenen).
 *   3. Yeni dönemi (sonraki ay) oluşturur.
 *   4. Her firmanın kalan borcunu yeni dönemin DEVİR satırına yazar.
 * Yeni dönem nesnesini döndürür (aktif yapılacak).
 *
 * @param mevcutDonemId Kilitlenecek mevcut dönem (id == ad, "YYYY-MM").
 */
export async function yeniDonemAc(mevcutDonemId: string): Promise<Donem> {
  // Mevcut dönemin tüm hareket ve devirlerini tek seferlik çek
  const [hareketSnap, devirSnap] = await Promise.all([
    getDocs(query(hareketKol, where('donemId', '==', mevcutDonemId))),
    getDocs(query(collection(db, 'devirler'), where('donemId', '==', mevcutDonemId))),
  ]);

  const hareketler = hareketSnap.docs.map((d) => d.data() as Hareket);
  const devirler = devirSnap.docs.map((d) => d.data() as Devir);

  // Firma başına devir ve hareket grupla
  const devirMap = new Map<string, number>(devirler.map((d) => [d.firmaId, d.tutar]));
  const hareketMap = new Map<string, Hareket[]>();
  for (const h of hareketler) {
    const arr = hareketMap.get(h.firmaId);
    if (arr) arr.push(h);
    else hareketMap.set(h.firmaId, [h]);
  }

  // Devir veya hareketi olan tüm firmaların kimliklerini topla
  const firmaIdler = new Set<string>([...devirMap.keys(), ...hareketMap.keys()]);

  const yeniAd = sonrakiAy(mevcutDonemId);

  const batch = writeBatch(db);
  // 1. Mevcut dönemi kilitle
  batch.set(doc(db, 'donemler', mevcutDonemId), { kilitliMi: true }, { merge: true });
  // 2. Yeni dönemi oluştur
  const yeniDonem: Donem = { id: yeniAd, ad: yeniAd, kilitliMi: false };
  batch.set(doc(db, 'donemler', yeniAd), { ad: yeniAd, kilitliMi: false });
  // 3. Her firmanın kalan borcunu yeni dönemin devrine yaz
  for (const fid of firmaIdler) {
    const kalan = kalanBorc(devirMap.get(fid) ?? 0, hareketMap.get(fid) ?? []);
    const v: Devir = { firmaId: fid, donemId: yeniAd, tutar: kalan };
    batch.set(doc(db, 'devirler', `${fid}_${yeniAd}`), v);
  }

  await batch.commit();
  return yeniDonem;
}
