// ---------------------------------------------------------------------------
// Çekirdek cari hesap mantığı (şartname Bölüm 4).
//
//   KALAN BORÇ = Devir + Σ Fatura − Σ Ödenen
//
// Bu formül uygulamanın kalbidir; tek yerde tanımlanır ki tüm ekranlar
// (cari kart, sonraki fazda özet pano) aynı sonucu üretsin.
// ---------------------------------------------------------------------------
import type { Hareket } from '@/types';

/** Hareket listesinin toplam fatura tutarı (Σ Fatura). */
export function toplamFatura(hareketler: Hareket[]): number {
  return hareketler.reduce((acc, h) => acc + (h.faturaTutari || 0), 0);
}

/** Hareket listesinin toplam ödenen tutarı (Σ Ödenen). */
export function toplamOdenen(hareketler: Hareket[]): number {
  return hareketler.reduce((acc, h) => acc + (h.odenenTutar || 0), 0);
}

/**
 * Kalan borç = Devir + Σ Fatura − Σ Ödenen.
 * @param devir Önceki dönemden taşınan kalan (yoksa 0).
 * @param hareketler Firmanın ilgili dönemdeki hareketleri.
 */
export function kalanBorc(devir: number, hareketler: Hareket[]): number {
  return devir + toplamFatura(hareketler) - toplamOdenen(hareketler);
}

/** Tutarı Türk Lirası biçiminde metne çevirir (ör. "1.234,50 ₺"). */
export function tlBicimle(tutar: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(tutar || 0);
}
