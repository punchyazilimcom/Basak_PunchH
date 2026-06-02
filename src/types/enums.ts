// ---------------------------------------------------------------------------
// Sabit listeler (enum benzeri).
// Bölüm, ödeme şekli, durum ve rol değerleri tek yerden yönetilir; hem tip
// güvenliği hem de ekranlardaki açılır listeler bu sabitlerden beslenir.
// ---------------------------------------------------------------------------

/** Firma bölüm/kategorileri (şartname Bölüm 4). */
export const BOLUMLER = [
  'Pide-Fırın',
  'Sarf',
  'Kasap',
  'Manav-Hal',
  'Taşeron',
  'Kira',
  'Personel',
  'Kredi-Çek',
  'Diğer',
] as const;
export type Bolum = (typeof BOLUMLER)[number];

/** Ödeme şekilleri. */
export const ODEME_SEKILLERI = ['Banka', 'Elden', 'Kart', 'Çek', 'EFT'] as const;
export type OdemeSekli = (typeof ODEME_SEKILLERI)[number];

/** Hareket durumları. */
export const DURUMLAR = ['Ödendi', 'Bekliyor', 'Kısmi', 'Gecikmiş'] as const;
export type Durum = (typeof DURUMLAR)[number];

/** Kullanıcı rolleri (PIN girişine bağlı yetki seviyeleri). */
export const ROLLER = ['Yönetici', 'Muhasebe', 'Şube'] as const;
export type Rol = (typeof ROLLER)[number];
