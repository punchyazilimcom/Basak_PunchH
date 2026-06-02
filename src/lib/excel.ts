// ---------------------------------------------------------------------------
// Excel (.xlsx) dışa aktarma — SheetJS (xlsx).
//
//   - "Özet" sayfası: firma listesi + kalan borçlar + bölüm/şube toplamları.
//   - "Cari Detay" sayfası: her firma kendi bloğu (başlık + DEVİR + hareketler
//     + KALAN BORÇ satırı). Sütunlar: Tarih, Açıklama, Şube, Fatura, Ödenen,
//     Kalan, Ödeme Şekli, Durum, Not.
//   - Para birimi ₺ olarak biçimlenir, başlıklar Türkçe.
// ---------------------------------------------------------------------------
import * as XLSX from 'xlsx';
import type { Firma, Hareket, Devir, Donem } from '@/types';
import { kalanBorc, toplamFatura, toplamOdenen } from './hesaplama';
import {
  firmaOzetleriHesapla,
  bolumBazindaToplam,
  subeBazindaToplam,
  toplamKalan,
} from './ozet';
import { donemEtiketi } from './tarih';
import { dosyaIndir, bugunDamgasi } from './indir';

const PARA_BICIM = '#,##0.00" ₺"';

/** Belirtilen sütunlardaki sayısal hücrelere ₺ para biçimi uygular. */
function paraBicimiUygula(ws: XLSX.WorkSheet, sutunlar: number[]): void {
  const aralik = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let r = aralik.s.r; r <= aralik.e.r; r++) {
    for (const c of sutunlar) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const hucre = ws[ref];
      if (hucre && hucre.t === 'n') hucre.z = PARA_BICIM;
    }
  }
}

/** Bir dönemin tüm verisini .xlsx olarak indirir. */
export function donemiExcelAktar(
  donem: Donem,
  firmalar: Firma[],
  hareketler: Hareket[],
  devirler: Devir[],
): void {
  const wb = XLSX.utils.book_new();

  // Yardımcı haritalar
  const devirMap = new Map<string, number>(devirler.map((d) => [d.firmaId, d.tutar]));
  const hareketMap = new Map<string, Hareket[]>();
  for (const h of hareketler) {
    const arr = hareketMap.get(h.firmaId);
    if (arr) arr.push(h);
    else hareketMap.set(h.firmaId, [h]);
  }
  for (const arr of hareketMap.values()) arr.sort((a, b) => a.tarih.localeCompare(b.tarih));

  // --- Sayfa 1: ÖZET ---
  const ozetler = firmaOzetleriHesapla(firmalar, hareketler, devirler);
  const ozetAoa: (string | number)[][] = [];
  ozetAoa.push(['BAŞAK KIR PİDESİ — ÖDEME & CARİ ÖZET']);
  ozetAoa.push(['Dönem:', donemEtiketi(donem.id) + (donem.kilitliMi ? ' (kilitli)' : '')]);
  ozetAoa.push(['Tarih:', bugunDamgasi()]);
  ozetAoa.push([]);
  ozetAoa.push(['Firma', 'Bölüm', 'Şube', 'Kalan Borç', 'Durum']);
  for (const o of ozetler) {
    ozetAoa.push([o.firma.ad, o.firma.bolum, o.firma.sube ?? '', o.kalan, o.temiz ? 'TEMİZ' : 'BORÇLU']);
  }
  ozetAoa.push([]);
  ozetAoa.push(['BÖLÜM BAZINDA TOPLAM', '', '', '', '']);
  for (const [bolum, tutar] of Object.entries(bolumBazindaToplam(ozetler))) {
    ozetAoa.push([bolum, '', '', tutar, '']);
  }
  ozetAoa.push([]);
  ozetAoa.push(['ŞUBE BAZINDA TOPLAM', '', '', '', '']);
  for (const [sube, tutar] of Object.entries(subeBazindaToplam(ozetler))) {
    ozetAoa.push([sube, '', '', tutar, '']);
  }
  ozetAoa.push([]);
  ozetAoa.push(['GENEL TOPLAM KALAN BORÇ', '', '', toplamKalan(ozetler), '']);

  const ozetWs = XLSX.utils.aoa_to_sheet(ozetAoa);
  ozetWs['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
  paraBicimiUygula(ozetWs, [3]); // Kalan Borç sütunu
  XLSX.utils.book_append_sheet(wb, ozetWs, 'Özet');

  // --- Sayfa 2: CARİ DETAY (firma blokları) ---
  const detayAoa: (string | number)[][] = [];
  const basliklar = ['Tarih', 'Açıklama', 'Şube', 'Fatura', 'Ödenen', 'Kalan', 'Ödeme Şekli', 'Durum', 'Not'];

  for (const f of firmalar) {
    const devir = devirMap.get(f.id) ?? 0;
    const hs = hareketMap.get(f.id) ?? [];
    // Devir/hareketi olmayan firmayı atlama opsiyonel; burada hepsini yazıyoruz
    detayAoa.push([`▸ ${f.ad}  (${f.bolum}${f.sube ? ' · ' + f.sube : ''})`]);
    detayAoa.push(basliklar);
    // DEVİR satırı
    detayAoa.push(['', 'DEVİR (önceki dönem kalanı)', '', '', '', devir, '', '', '']);
    // Hareketler + yürüyen kalan
    let yuruyen = devir;
    for (const h of hs) {
      yuruyen += (h.faturaTutari || 0) - (h.odenenTutar || 0);
      detayAoa.push([
        h.tarih,
        h.aciklama,
        h.sube ?? '',
        h.faturaTutari || 0,
        h.odenenTutar || 0,
        yuruyen,
        h.odemeSekli,
        h.durum,
        h.not ?? '',
      ]);
    }
    // Toplam + KALAN BORÇ
    detayAoa.push(['', 'TOPLAM', '', toplamFatura(hs), toplamOdenen(hs), '', '', '', '']);
    detayAoa.push(['', 'KALAN BORÇ', '', '', '', kalanBorc(devir, hs), '', '', '']);
    detayAoa.push([]); // bloklar arası boşluk
  }

  if (detayAoa.length === 0) detayAoa.push(['Kayıt yok']);
  const detayWs = XLSX.utils.aoa_to_sheet(detayAoa);
  detayWs['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 24 },
  ];
  paraBicimiUygula(detayWs, [3, 4, 5]); // Fatura, Ödenen, Kalan
  XLSX.utils.book_append_sheet(wb, detayWs, 'Cari Detay');

  // İndir
  const ab = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  dosyaIndir(blob, `basak-cari-${donem.id}-${bugunDamgasi()}.xlsx`);
}
