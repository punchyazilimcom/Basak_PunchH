// ---------------------------------------------------------------------------
// PDF dışa aktarma — jsPDF + autotable.
//
//   - Üstte Başak Kır Pidesi başlığı (siyah zemin / sarı yazı), dönem + tarih.
//   - Özet bölümü: firma listesi + kalan borç, bölüm/şube toplamları.
//   - Her firma için cari ekstre: ad/bölüm, devir + hareketler tablosu, kalan borç.
//   - Sonda genel toplam.
// ---------------------------------------------------------------------------
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Firma, Hareket, Devir, Donem } from '@/types';
import { kalanBorc, toplamFatura, toplamOdenen, tlBicimle } from './hesaplama';
import {
  firmaOzetleriHesapla,
  bolumBazindaToplam,
  subeBazindaToplam,
  toplamKalan,
} from './ozet';
import { donemEtiketi } from './tarih';
import { bugunDamgasi } from './indir';

// Marka renkleri (RGB)
const SARI: [number, number, number] = [244, 223, 22]; // #F4DF16
const SIYAH: [number, number, number] = [0, 0, 0];

/** PDF'te ₺ gösterimi (jsPDF varsayılan fontu ₺ glifini içermez; "TL" kullanılır). */
function para(n: number): string {
  return tlBicimle(n).replace('₺', 'TL').replace('₺', 'TL');
}

/** autotable son tablonun bitiş Y'sini güvenli okur. */
function sonY(doc: jsPDF, varsayilan: number): number {
  const lat = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return lat?.finalY ?? varsayilan;
}

/** Sayfa üst başlığı (her çağrıda mevcut sayfaya çizilir). */
function baslikCiz(doc: jsPDF, donem: Donem): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...SIYAH);
  doc.rect(0, 0, w, 70, 'F');
  doc.setTextColor(...SARI);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BASAK KIR PIDESI', 40, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Odeme & Cari Takip Raporu', 40, 50);
  doc.setFontSize(9);
  doc.text(
    `Donem: ${donemEtiketi(donem.id)}${donem.kilitliMi ? ' (kilitli)' : ''}    Tarih: ${bugunDamgasi()}`,
    w - 40,
    50,
    { align: 'right' },
  );
  return 90; // içerik başlangıç Y'si
}

/** Bir dönemin özet + cari ekstrelerini tek PDF olarak indirir. */
export function donemiPdfAktar(
  donem: Donem,
  firmalar: Firma[],
  hareketler: Hareket[],
  devirler: Devir[],
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Yardımcı haritalar
  const devirMap = new Map<string, number>(devirler.map((d) => [d.firmaId, d.tutar]));
  const hareketMap = new Map<string, Hareket[]>();
  for (const h of hareketler) {
    const arr = hareketMap.get(h.firmaId);
    if (arr) arr.push(h);
    else hareketMap.set(h.firmaId, [h]);
  }
  for (const arr of hareketMap.values()) arr.sort((a, b) => a.tarih.localeCompare(b.tarih));

  let y = baslikCiz(doc, donem);

  // --- ÖZET tablosu ---
  const ozetler = firmaOzetleriHesapla(firmalar, hareketler, devirler);
  doc.setTextColor(...SIYAH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('OZET — Firma Kalan Borclar', 40, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Firma', 'Bolum', 'Sube', 'Kalan Borc', 'Durum']],
    body: ozetler.map((o) => [
      o.firma.ad,
      o.firma.bolum,
      o.firma.sube ?? '-',
      para(o.kalan),
      o.temiz ? 'TEMIZ' : 'BORCLU',
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: SIYAH, textColor: SARI, fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  // Bölüm / Şube toplamları + genel toplam
  y = sonY(doc, y) + 20;
  const bolumlar = Object.entries(bolumBazindaToplam(ozetler));
  const subeler = Object.entries(subeBazindaToplam(ozetler));

  autoTable(doc, {
    startY: y,
    head: [['Bolum Bazinda Toplam', 'Tutar']],
    body: bolumlar.map(([b, t]) => [b, para(t)]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: SIYAH, textColor: SARI },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 40, right: 300 },
    tableWidth: 250,
  });
  const yBolum = sonY(doc, y);

  autoTable(doc, {
    startY: y,
    head: [['Sube Bazinda Toplam', 'Tutar']],
    body: subeler.map(([sb, t]) => [sb, para(t)]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: SIYAH, textColor: SARI },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 305, right: 40 },
    tableWidth: 250,
  });
  const ySube = sonY(doc, y);

  y = Math.max(yBolum, ySube) + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SIYAH);
  doc.text(`GENEL TOPLAM KALAN BORC: ${para(toplamKalan(ozetler))}`, 40, y);

  // --- Her firma için cari ekstre ---
  for (const f of firmalar) {
    const devir = devirMap.get(f.id) ?? 0;
    const hs = hareketMap.get(f.id) ?? [];

    doc.addPage();
    let yy = baslikCiz(doc, donem);
    doc.setTextColor(...SIYAH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${f.ad}`, 40, yy);
    yy += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Bolum: ${f.bolum}${f.sube ? '   Sube: ' + f.sube : ''}` +
        `${f.telefon ? '   Tel: ' + f.telefon : ''}`,
      40,
      yy,
    );
    yy += 10;

    // Yürüyen kalan ile hareket satırları
    let yuruyen = devir;
    const govde: string[][] = [];
    govde.push(['', 'DEVIR (onceki donem kalani)', '', '', '', para(devir), '', '']);
    for (const h of hs) {
      yuruyen += (h.faturaTutari || 0) - (h.odenenTutar || 0);
      govde.push([
        h.tarih,
        h.aciklama,
        h.sube ?? '',
        para(h.faturaTutari || 0),
        para(h.odenenTutar || 0),
        para(yuruyen),
        h.odemeSekli,
        h.durum,
      ]);
    }

    autoTable(doc, {
      startY: yy + 6,
      head: [['Tarih', 'Aciklama', 'Sube', 'Fatura', 'Odenen', 'Kalan', 'Odeme', 'Durum']],
      body: govde,
      foot: [
        ['', 'TOPLAM', '', para(toplamFatura(hs)), para(toplamOdenen(hs)), '', '', ''],
        ['', 'KALAN BORC', '', '', '', para(kalanBorc(devir, hs)), '', ''],
      ],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: SIYAH, textColor: SARI, fontStyle: 'bold' },
      footStyles: { fillColor: SARI, textColor: SIYAH, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save(`basak-rapor-${donem.id}-${bugunDamgasi()}.pdf`);
  // not: jsPDF doc.save tarayıcıda indirmeyi tetikler; ek indir yardımcısı gerekmez
}
