// ---------------------------------------------------------------------------
// Dönem/tarih yardımcıları.
// Dönem kimliği "YYYY-MM" biçimindedir (ör. "2026-03").
// ---------------------------------------------------------------------------

/** Türkçe ay adları (1=Ocak). */
export const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** "2026-03" -> "2026-04" (yıl taşması dahil). */
export function sonrakiAy(yyyymm: string): string {
  const [yil, ay] = yyyymm.split('-').map(Number);
  if (!yil || !ay) {
    // Beklenmedik biçim: bugünün ayını döndür
    return new Date().toISOString().slice(0, 7);
  }
  const d = new Date(yil, ay - 1 + 1, 1); // ay-1 (0 tabanlı) + 1 sonraki ay
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** "2026-03" -> "2026-03 · Mart" (gösterim etiketi). */
export function donemEtiketi(yyyymm: string): string {
  const [, ay] = yyyymm.split('-').map(Number);
  const adi = ay >= 1 && ay <= 12 ? AY_ADLARI[ay - 1] : '';
  return adi ? `${yyyymm} · ${adi}` : yyyymm;
}
