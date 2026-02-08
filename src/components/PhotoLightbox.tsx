import { useEffect } from 'react';

interface Props {
  src: string;
  onClose: () => void;
}

export default function PhotoLightbox({ src, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>&times;</button>
        <img src={src} alt="Job photo" />
      </div>
    </div>
  );
}
