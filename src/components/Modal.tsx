// Basit, marka uyumlu modal (form pencereleri için).
import type { ReactNode } from 'react';

interface Props {
  baslik: string;
  acik: boolean;
  onKapat: () => void;
  children: ReactNode;
}

export default function Modal({ baslik, acik, onKapat, children }: Props) {
  if (!acik) return null;
  return (
    <div
      onClick={onKapat}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--basak-beyaz)',
          border: '2px solid var(--basak-siyah)',
          borderRadius: 12,
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="basak-baslik"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
          }}
        >
          <strong>{baslik}</strong>
          <button
            onClick={onKapat}
            aria-label="Kapat"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--basak-sari)',
              fontSize: '1.3rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '1rem', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
