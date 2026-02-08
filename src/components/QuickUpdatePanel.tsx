import { useState, useEffect, useCallback } from 'react';
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

export default function QuickUpdatePanel({ jobId, onClose, onJobChanged }: Props) {
  const [job, setJob] = useState<Job | undefined>(() => getJob(jobId));

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
      <div className="qup-backdrop" onClick={onClose} />
      <div className="qup-panel">
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
