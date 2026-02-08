import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  notes: string;
  onSave: (notes: string) => void;
}

export default function JobNotes({ notes, onSave }: Props) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-resize the textarea to fit content
  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  function handleBlur() {
    if (value === notes) return; // no change
    onSave(value);
    setSaved(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="notes-section card">
      <div className="notes-header">
        <h3>Job Notes</h3>
        {saved && <span className="notes-saved">Saved ✓</span>}
      </div>
      <textarea
        ref={textareaRef}
        className="notes-textarea"
        placeholder="Add notes about this job..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={3}
      />
    </div>
  );
}
