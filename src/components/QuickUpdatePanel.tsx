import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getJob, toggleMilestone, groupByPhase, calcProgress,
  getWeightedMode, getPhaseWeights, saveJobNotes, saveJobPhotos,
} from '../store.ts';
import type { Job } from '../types.ts';
import ProgressBar from './ProgressBar.tsx';
import JobNotes from './JobNotes.tsx';
import PhotoGrid from './PhotoGrid.tsx';

interface Props {
  jobId: string;
  onClose: () => void;
  onJobChanged: () => void;
}

const DEAD_ZONE = 10; // px of movement before drag visual kicks in
const DISMISS_RATIO = 0.5; // must drag 50% of panel height to dismiss
const RUBBER_BAND = 0.55; // drag resistance factor

export default function QuickUpdatePanel({ jobId, onClose, onJobChanged }: Props) {
  const [job, setJob] = useState<Job | undefined>(() => getJob(jobId));
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  const dragActive = useRef(false);
  const currentDragY = useRef(0);
  const closingRef = useRef(false);

  const refresh = useCallback(() => {
    const fresh = getJob(jobId);
    setJob(fresh ? { ...fresh } : undefined);
    onJobChanged();
  }, [jobId, onJobChanged]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Swipe-down-to-close for mobile bottom sheet — uses direct DOM for smooth 60fps
  function handleTouchStart(e: React.TouchEvent) {
    if (closingRef.current) return;
    const scrollBody = panelRef.current?.querySelector('.qup-body');
    touchStartY.current = e.touches[0].clientY;
    touchStartScrollTop.current = scrollBody?.scrollTop ?? 0;
    dragActive.current = false;
    currentDragY.current = 0;
    // Remove snap-back transition during fresh touch
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (closingRef.current) return;
    const rawDelta = e.touches[0].clientY - touchStartY.current;

    // If content is scrolled down, don't interfere — let normal scroll work
    if (touchStartScrollTop.current > 0) return;

    // Only engage drag when pulling down
    if (rawDelta <= 0) {
      if (dragActive.current) {
        // User reversed direction back up, reset
        dragActive.current = false;
        currentDragY.current = 0;
        if (panelRef.current) {
          panelRef.current.style.transform = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.opacity = '';
        }
      }
      return;
    }

    // Dead zone: ignore tiny movements to avoid jitter
    if (!dragActive.current && rawDelta < DEAD_ZONE) return;

    // We're dragging
    dragActive.current = true;
    e.preventDefault();

    // Apply rubber-band resistance so it feels weighted
    const effectiveDelta = rawDelta * RUBBER_BAND;
    currentDragY.current = effectiveDelta;

    // Direct DOM update — no React re-render
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${effectiveDelta}px)`;
    }
    // Fade backdrop proportionally
    if (backdropRef.current && panelRef.current) {
      const panelH = panelRef.current.offsetHeight;
      const progress = Math.min(effectiveDelta / panelH, 1);
      backdropRef.current.style.opacity = String(1 - progress * 0.6);
    }
  }

  function handleTouchEnd() {
    if (closingRef.current) return;
    if (!dragActive.current) return;

    const panel = panelRef.current;
    if (!panel) return;

    const panelH = panel.offsetHeight;
    const draggedRatio = currentDragY.current / panelH;

    if (draggedRatio >= DISMISS_RATIO) {
      // Animate off-screen then close
      closingRef.current = true;
      panel.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      panel.style.transform = `translateY(${panelH}px)`;
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.25s ease';
        backdropRef.current.style.opacity = '0';
      }
      setTimeout(onClose, 250);
    } else {
      // Snap back with smooth transition
      panel.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      panel.style.transform = '';
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.3s ease';
        backdropRef.current.style.opacity = '';
      }
    }

    dragActive.current = false;
    currentDragY.current = 0;
  }

  if (!job) return null;

  const weighted = getWeightedMode();
  const weights = getPhaseWeights();
  const pct = calcProgress(job, weighted, weights);
  const phases = groupByPhase(job.milestones);

  function handleToggle(milestoneId: string) {
    toggleMilestone(jobId, milestoneId);
    refresh();
  }

  function handleSaveNotes(notes: string) {
    saveJobNotes(jobId, notes);
    refresh();
  }

  function handlePhotosChange(photos: string[]) {
    saveJobPhotos(jobId, photos);
    refresh();
  }

  function formatTimestamp(ts: string | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <>
      <div className="qup-backdrop" ref={backdropRef} onClick={onClose} />
      <div
        className="qup-panel"
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="qup-drag-handle"><span /></div>
        <div className="qup-header">
          <div className="qup-header-info">
            <h2 className="qup-title">{job.jobName}</h2>
            <div className="qup-meta">
              <span className="customer-badge">{job.customerName}</span>
              <span className="qup-updated">
                Updated {formatRelative(job.updatedAt || job.createdAt)}
              </span>
            </div>
          </div>
          <button className="qup-close" onClick={onClose} title="Close">&times;</button>
        </div>

        <div className="qup-progress">
          <ProgressBar percent={pct} height={20} />
          <span className="progress-label">
            {job.milestones.filter(m => m.isComplete).length} / {job.milestones.length} milestones
          </span>
        </div>

        <div className="qup-body">
          <div className="milestones-list">
            {[...phases.entries()].map(([phase, milestones]) => {
              const done = milestones.filter(m => m.isComplete).length;
              return (
                <div key={phase} className="phase-group">
                  <h3 className="phase-header">
                    {phase}
                    <span className="phase-count">{done}/{milestones.length}</span>
                  </h3>
                  {milestones.map(ms => (
                    <label key={ms.id} className={`milestone-row ${ms.isComplete ? 'complete' : ''}`}>
                      <input
                        type="checkbox"
                        checked={ms.isComplete}
                        onChange={() => handleToggle(ms.id)}
                      />
                      <span className="milestone-title">{ms.title}</span>
                      {ms.isComplete && ms.completedAt && (
                        <span className="milestone-timestamp">{formatTimestamp(ms.completedAt)}</span>
                      )}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>

          <JobNotes notes={job.notes ?? ''} onSave={handleSaveNotes} />

          <PhotoGrid photos={job.photos ?? []} onPhotosChange={handlePhotosChange} />
        </div>
      </div>
    </>
  );
}
