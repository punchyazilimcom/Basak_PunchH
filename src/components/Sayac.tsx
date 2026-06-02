// ---------------------------------------------------------------------------
// Sayaç (count-up): değeri 0'dan (veya önceki değerden) hedefe yumuşakça sayar.
// framer-motion animate() ile; performans dostu (tek RAF döngüsü).
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface Props {
  deger: number;
  /** Sayıyı metne çevirir (ör. TL biçimi). */
  bicim: (n: number) => string;
  /** Animasyon süresi (sn). */
  sure?: number;
}

export default function Sayac({ deger, bicim, sure = 1.1 }: Props) {
  const [gosterilen, setGosterilen] = useState(0);
  const oncekiRef = useRef(0);

  useEffect(() => {
    const kontrol = animate(oncekiRef.current, deger, {
      duration: sure,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo benzeri, premium his
      onUpdate: (x) => setGosterilen(x),
    });
    oncekiRef.current = deger;
    return () => kontrol.stop();
  }, [deger, sure]);

  return <>{bicim(gosterilen)}</>;
}
