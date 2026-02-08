import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getJob, toggleMilestone, calcProgress, groupByPhase,
  getWeightedMode, getPhaseWeights, updateJob, applyTemplateToJob, deleteJob,
  saveJobNotes, saveJobPhotos
} from '../store.ts';
import type { Job } from '../types.ts';
import ProgressBar from '../components/ProgressBar.tsx';
import JobNotes from '../components/JobNotes.tsx';
import PhotoGrid from '../components/PhotoGrid.tsx';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | undefined>(() => getJob(id!));
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editDue, setEditDue] = useState('');

  if (!job) {
    return (
      <div className="page">
        <p>Job not found.</p>
        <Link to="/" className="btn btn-secondary">Back</Link>
      </div>
    );
  }

  const weighted = getWeightedMode();
  const weights = getPhaseWeights();
  const pct = calcProgress(job, weighted, weights);
  const phases = groupByPhase(job.milestones);

  function handleToggle(milestoneId: string) {
    const updated = toggleMilestone(job!.id, milestoneId);
    if (updated) setJob({ ...updated });
  }

  function startEdit() {
    setEditName(job!.jobName);
    setEditCustomer(job!.customerName);
    setEditDue(job!.dueDate ?? '');
    setEditing(true);
  }

  function saveEdit() {
    updateJob(job!.id, {
      jobName: editName.trim(),
      customerName: editCustomer.trim(),
      dueDate: editDue || null,
    });
    setJob(getJob(job!.id));
    setEditing(false);
  }

  function handleApplyTemplate() {
    if (!confirm('Apply current template to this job? Completed milestones will be preserved by name.')) return;
    applyTemplateToJob(job!.id);
    setJob(getJob(job!.id));
  }

  function handleDelete() {
    if (!confirm('Delete this job?')) return;
    deleteJob(job!.id);
    navigate('/');
  }

  function handleSaveNotes(notes: string) {
    saveJobNotes(job!.id, notes);
    setJob(getJob(job!.id));
  }

  function handlePhotosChange(photos: string[]) {
    saveJobPhotos(job!.id, photos);
    setJob(getJob(job!.id));
  }

  function formatTimestamp(ts: string | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">&larr; All Jobs</Link>

      {!editing ? (
        <div className="job-detail-header">
          <div>
            <h1>{job.jobName}</h1>
            <p className="customer-badge">{job.customerName}</p>
            {job.dueDate && (
              <p className="due-date">Due: {new Date(job.dueDate).toLocaleDateString()}</p>
            )}
          </div>
          <div className="job-detail-actions">
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={handleApplyTemplate}>Apply Template</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <div className="card edit-form">
          <label>Job Name <input type="text" value={editName} onChange={e => setEditName(e.target.value)} /></label>
          <label>Customer <input type="text" value={editCustomer} onChange={e => setEditCustomer(e.target.value)} /></label>
          <label>Due Date <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} /></label>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="progress-section">
        <ProgressBar percent={pct} height={24} />
        <span className="progress-label">
          {job.milestones.filter(m => m.isComplete).length} / {job.milestones.length} milestones
          {weighted && ' (weighted)'}
        </span>
      </div>

      <div className="milestones-list">
        {[...phases.entries()].map(([phase, milestones]) => {
          const phaseComplete = milestones.filter(m => m.isComplete).length;
          return (
            <div key={phase} className="phase-group">
              <h3 className="phase-header">
                {phase}
                <span className="phase-count">{phaseComplete}/{milestones.length}</span>
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
  );
}
