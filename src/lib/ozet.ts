// ---------------------------------------------------------------------------
// Özet panosu hesaplamaları (şartname Bölüm 5).
// UI'dan bağımsız, saf fonksiyonlar — kolay test edilir ve tek doğruluk kaynağı.
//
//   - Her firmanın güncel kalan borcu (Devir + ΣFatura − ΣÖdenen)
//   - Bölüm bazında toplam kalan borç
//   - Şube bazında toplam kalan borç
//   - Genel toplam kalan borç
//   - Bekleyen / Gecikmiş borç (durumu Bekliyor veya Gecikmiş olan hareketler)
// ---------------------------------------------------------------------------
import type { Firma, Hareket, Devir } from '@/types';
import { kalanBorc } from './hesaplama';

/** Tek bir firmanın özet satırı. */
export interface FirmaOzet {
  firma: Firma;
  kalan: number;
  /** kalan <= 0 ise TEMİZ, aksi halde BORÇLU. */
  temiz: boolean;
}

/** Her firma için kalan borcu hesaplar (firma adına göre sıralı). */
export function firmaOzetleriHesapla(
  firmalar: Firma[],
  hareketler: Hareket[],
  devirler: Devir[],
): FirmaOzet[] {
  const devirMap = new Map<string, number>(devirler.map((d) => [d.firmaId, d.tutar]));
  const hareketMap = new Map<string, Hareket[]>();
  for (const h of hareketler) {
    const arr = hareketMap.get(h.firmaId);
    if (arr) arr.push(h);
    else hareketMap.set(h.firmaId, [h]);
  }
  return firmalar
    .map((f) => {
      const kalan = kalanBorc(devirMap.get(f.id) ?? 0, hareketMap.get(f.id) ?? []);
      return { firma: f, kalan, temiz: kalan <= 0 };
    })
    .sort((a, b) => b.kalan - a.kalan); // en borçlu üstte
}

/** Bölüm bazında toplam kalan borç. */
export function bolumBazindaToplam(ozetler: FirmaOzet[]): Record<string, number> {
  const sonuc: Record<string, number> = {};
  for (const o of ozetler) {
    sonuc[o.firma.bolum] = (sonuc[o.firma.bolum] ?? 0) + o.kalan;
  }
  return sonuc;
}

/** Şube bazında toplam kalan borç (şubesiz firmalar "Şubesiz" altında). */
export function subeBazindaToplam(ozetler: FirmaOzet[]): Record<string, number> {
  const sonuc: Record<string, number> = {};
  for (const o of ozetler) {
    const anahtar = o.firma.sube?.trim() || 'Şubesiz';
    sonuc[anahtar] = (sonuc[anahtar] ?? 0) + o.kalan;
  }
  return sonuc;
}

/** Genel toplam kalan borç. */
export function toplamKalan(ozetler: FirmaOzet[]): number {
  return ozetler.reduce((acc, o) => acc + o.kalan, 0);
}

/**
 * Bekleyen / Gecikmiş borç toplamı.
 * Durumu "Bekliyor" veya "Gecikmiş" olan hareketlerin ödenmemiş kısmı
 * (faturaTutari − odenenTutar, negatifse 0) toplanır.
 */
export function bekleyenGecikmisToplam(hareketler: Hareket[]): number {
  return hareketler
    .filter((h) => h.durum === 'Bekliyor' || h.durum === 'Gecikmiş')
    .reduce((acc, h) => acc + Math.max(0, (h.faturaTutari || 0) - (h.odenenTutar || 0)), 0);
}
