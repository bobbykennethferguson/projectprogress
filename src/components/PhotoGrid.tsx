import { useState, useRef } from 'react';
import PhotoLightbox from './PhotoLightbox.tsx';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

interface Props {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export default function PhotoGrid({ photos, onPhotosChange }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError('');

    const pending: Promise<string>[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds 3 MB. Please use a smaller image.`);
        continue;
      }
      if (!file.type.startsWith('image/')) continue;
      pending.push(
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject();
          reader.readAsDataURL(file);
        })
      );
    }

    Promise.all(pending).then(results => {
      if (results.length > 0) {
        onPhotosChange([...photos, ...results]);
      }
    });

    // Reset the input so the same file can be re-selected
    const target = e.target;
    target.value = '';
  }

  function handleRemove(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    onPhotosChange(next);
    if (lightboxIdx === idx) setLightboxIdx(null);
  }

  return (
    <div className="photos-section card">
      <div className="photos-header">
        <h3>Photos</h3>
        <button className="btn btn-primary btn-sm" onClick={() => uploadRef.current?.click()}>
          + Upload Photos
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => captureRef.current?.click()}>
          Take Photo
        </button>
        {/* Normal file picker (desktop + mobile gallery) */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />
        {/* Camera capture (mobile) */}
        <input
          ref={captureRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFiles}
        />
      </div>

      {error && <p className="photo-error">{error}</p>}

      {photos.length === 0 ? (
        <p className="photos-empty">No photos yet.</p>
      ) : (
        <div className="photos-grid">
          {photos.map((src, i) => (
            <div key={i} className="photo-thumb-wrapper">
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="photo-thumb"
                onClick={() => setLightboxIdx(i)}
              />
              <button
                className="photo-remove"
                onClick={() => handleRemove(i)}
                title="Remove photo"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {lightboxIdx !== null && photos[lightboxIdx] && (
        <PhotoLightbox
          src={photos[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
