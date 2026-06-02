// ---------------------------------------------------------------------------
// Firestore veri modeli — TypeScript tipleri.
//
// Koleksiyon yapısı (Firestore):
//   firmalar/{firmaId}                      -> Firma
//   donemler/{donemId}                      -> Donem
//   hareketler/{hareketId}                  -> Hareket   (firmaId + donemId alanlarıyla)
//   devirler/{firmaId}_{donemId}            -> Devir     (firma+dönem başına tek kayıt)
//
// Not: Firestore'da tarihler Timestamp olarak da tutulabilir; Faz 1'de sade
// kalması için ISO tarih metni ("YYYY-MM-DD") kullanıyoruz.
// ---------------------------------------------------------------------------
import type { Bolum, OdemeSekli, Durum } from './enums';

/** Firma / tedarikçi / taşeron kartı. */
export interface Firma {
  id: string;
  ad: string;
  bolum: Bolum;
  /** İlişkili şube (opsiyonel). Boşsa firma şubeye bağlı değildir. */
  sube?: string;
  telefon?: string;
  iban?: string;
  not?: string;
}

/** Bir firmanın bir dönemdeki tek hareket (fatura/ödeme) satırı. */
export interface Hareket {
  id: string;
  firmaId: string;
  donemId: string;
  /** ISO tarih metni: "YYYY-MM-DD". */
  tarih: string;
  aciklama: string;
  sube?: string;
  /** Fatura tutarı (borç artıran). */
  faturaTutari: number;
  /** Ödenen tutar (borç azaltan). */
  odenenTutar: number;
  odemeSekli: OdemeSekli;
  durum: Durum;
  not?: string;
}

/**
 * Devir: bir firmanın bir döneme önceki dönemden taşınan kalan borcu.
 * Belge kimliği genelde `${firmaId}_${donemId}` biçiminde tutulur.
 */
export interface Devir {
  firmaId: string;
  donemId: string;
  /** Önceki dönem sonu kalan borç tutarı. */
  tutar: number;
}

/** Dönem (muhasebe ayı), ör. "2026-03". */
export interface Donem {
  id: string;
  /** Görünen ad, ör. "2026-03". */
  ad: string;
  /** Kilitliyse (arşivlenmişse) düzenlenemez, sadece görüntülenir. */
  kilitliMi: boolean;
}
