// ---------------------------------------------------------------------------
// (OPSİYONEL) Zamanlanmış otomatik yedek — Cloud Function.
//
// Bu fonksiyon her gün tüm Firestore koleksiyonlarını tek JSON olarak Firebase
// Storage'a ("yedekler/") yazar ve 30 günden eski yedekleri siler.
//
// Kurulum (Blaze planı gerekir):
//   cd functions && npm install
//   firebase deploy --only functions
//
// NOT: Cloud Function dağıtamıyorsanız, uygulama zaten açılışta günde 1 kez
// istemci taraflı otomatik yedek alıyor (src/lib/yedek.ts → otomatikYedek).
// İkisi birlikte de kullanılabilir.
// ---------------------------------------------------------------------------
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp();

const KOLEKSIYONLAR = ['donemler', 'firmalar', 'hareketler', 'devirler'];
const SAKLAMA_GUN = 30;

exports.gunlukYedek = onSchedule(
  { schedule: 'every day 03:00', timeZone: 'Europe/Istanbul' },
  async () => {
    const db = getFirestore();

    // Tüm koleksiyonları oku
    const veri = { uygulama: 'basak-odeme-cari-takip', surum: 1, olusturulma: new Date().toISOString() };
    for (const kol of KOLEKSIYONLAR) {
      const snap = await db.collection(kol).get();
      veri[kol] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // Storage'a yaz
    const bugun = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const bucket = getStorage().bucket();
    const dosya = bucket.file(`yedekler/basak-yedek-${bugun}.json`);
    await dosya.save(JSON.stringify(veri), { contentType: 'application/json' });

    // 30 günden eski yedekleri sil
    const sinir = new Date();
    sinir.setDate(sinir.getDate() - SAKLAMA_GUN);
    const [dosyalar] = await bucket.getFiles({ prefix: 'yedekler/' });
    for (const f of dosyalar) {
      const m = f.name.match(/basak-yedek-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && new Date(m[1]) < sinir) {
        await f.delete().catch(() => {});
      }
    }

    console.log(`Günlük yedek tamamlandı: ${bugun}`);
  },
);
