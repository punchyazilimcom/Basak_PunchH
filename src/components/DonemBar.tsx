// ---------------------------------------------------------------------------
// Dönem çubuğu (ikincil bar).
// A adımı: yalnızca aktif/seçili dönemi gösterir.
// B adımında: dönem seçici + "Yeni Dönem Aç" (Yönetici) buraya eklenecek.
// ---------------------------------------------------------------------------
import { useDonem } from '@/hooks/useDonem';
import { donemEtiketi } from '@/lib/tarih';

export default function DonemBar() {
  const { seciliDonem, yukleniyor } = useDonem();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0.5rem 1rem',
        background: 'var(--gri-zemin)',
        borderBottom: '1px solid var(--gri-cizgi)',
        position: 'sticky',
        top: 0,
        zIndex: 15,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dönem:</span>
      <span
        className="basak-baslik"
        style={{ padding: '0.25rem 0.7rem', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem' }}
      >
        {yukleniyor ? '…' : seciliDonem ? donemEtiketi(seciliDonem.id) : '—'}
      </span>
      {seciliDonem?.kilitliMi && (
        <span style={{ fontSize: '0.8rem', color: 'var(--gri-yazi)' }}>(kilitli / salt görüntüleme)</span>
      )}
    </div>
  );
}
