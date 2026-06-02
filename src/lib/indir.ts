// Tarayıcıda dosya indirme yardımcısı (Blob -> indirme).
export function dosyaIndir(icerik: Blob, dosyaAdi: string): void {
  const url = URL.createObjectURL(icerik);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Bugünün tarihini "YYYY-AA-GG" biçiminde döner (dosya adları için). */
export function bugunDamgasi(): string {
  return new Date().toISOString().slice(0, 10);
}
