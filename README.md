# Başak Kır Pidesi — Ödeme & Cari Takip

Tedarikçi, taşeron, kira ve diğer ödemeleri tek merkezden takip eden, firma
bazlı cari hesap (devir + hareket + kalan borç) mantığıyla çalışan bulut
senkronlu uygulama. Mevcut Excel sisteminin yerini alır.

> **Durum:** Faz 1 — Web Çekirdeği tamamlandı.

## Teknoloji

- **React + Vite + TypeScript** (ortak çekirdek)
- **Firebase / Firestore** (gerçek zamanlı çok cihaz senkron)
- Sonraki fazlar için modüler: **Tauri** (.exe) ve **Capacitor** (mobil)

## Kurulum

```bash
npm install
cp .env.example .env     # Firebase anahtarlarını doldurun
npm run dev              # http://localhost:5173
```

### Firebase yapılandırması (.env)

Firebase Console > Proje Ayarları > Web Uygulaması'ndan alınan değerleri
`.env` dosyasına yazın (bu dosya git'e **girmez**):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Güvenlik kuralları

```bash
firebase deploy --only firestore:rules
```

## İlk Çalıştırma

Sistemde hiç PIN yoksa giriş ekranı **ilk kurulum moduna** geçer: belirlediğiniz
ilk PIN **Yönetici** PIN'i olarak (hash'lenerek) kaydedilir. Sonra bu PIN ile
giriş yapılır.

## Tamamlanan Fazlar

**Faz 1 — Web Çekirdeği**
- [x] Vite + React + TS iskeleti, modüler kurulum
- [x] Firestore veri modeli + TypeScript tipleri
- [x] PIN giriş (3 rol, SHA-256+salt hash, deneme sınırı)
- [x] Firma Cari ekranı (devir + hareket + otomatik kalan borç)
- [x] Firestore güvenlik kuralları

**Faz 2 — Özet & Dönem**
- [x] Özet panosu (toplam kalan borç, bekleyen/gecikmiş, bölüm/şube toplamları)
- [x] Dönem sistemi (dönem seçici, "Yeni Dönem Aç", arşiv + otomatik devir)

**Faz 3 — Dışa Aktarma & Yedek**
- [x] Excel (.xlsx) dışa aktarma — SheetJS
- [x] PDF dışa aktarma — jsPDF + autotable (siyah-sarı kurumsal)
- [x] Manuel JSON yedek al / geri yükle (Yönetici)
- [x] Otomatik günlük yedek (istemci + opsiyonel Cloud Function), 30 gün saklama

### Otomatik yedek için Firebase Storage

Otomatik günlük yedek `yedekler/` klasörüne yazar. Bunun için Firebase Console >
**Storage**'ı etkinleştirin ve kuralları yayınlayın:

```bash
firebase deploy --only storage
```

Storage etkin değilse uygulama çalışmaya devam eder; otomatik yedek sessizce
atlanır, manuel JSON yedek her zaman çalışır. Zamanlanmış Cloud Function örneği
`functions/` klasöründedir (opsiyonel, Blaze planı gerekir).

## Sonraki Fazlar (henüz yapılmadı)

5. Tauri ile .exe paketleme
6. Capacitor ile Android/iOS

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run typecheck` | Tip kontrolü |
| `npm run preview` | Derlemeyi önizle |

## Marka

Sarı `#F4DF16` + Siyah `#000000`. Düzenlenebilir alanlar sarı zemin/siyah yazı,
başlık/okunur alanlar siyah zemin/sarı yazı.
