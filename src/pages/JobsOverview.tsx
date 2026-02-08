import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getJobs, addJob, deleteJob, calcProgress, getNextMilestone,
  getWeightedMode, getPhaseWeights, exportData, importData
} from '../store.ts';
import type { Job } from '../types.ts';
import ProgressBar from '../components/ProgressBar.tsx';

export default function JobsOverview() {
  const [jobs, setJobs] = useState<Job[]>(getJobs);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [jobName, setJobName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [dueDate, setDueDate] = useState('');

  const weighted = getWeightedMode();
  const weights = getPhaseWeights();

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      j => j.jobName.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!jobName.trim() || !customerName.trim()) return;
    addJob(jobName.trim(), customerName.trim(), dueDate || null);
    setJobs(getJobs());
    setJobName('');
    setCustomerName('');
    setDueDate('');
    setShowForm(false);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this job?')) return;
    deleteJob(id);
    setJobs(getJobs());
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importData(reader.result as string);
          setJobs(getJobs());
        } catch {
          alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Job Milestone Tracker</h1>
        <nav className="header-nav">
          <Link to="/template" className="btn btn-secondary">Template Editor</Link>
          <Link to="/settings" className="btn btn-secondary">Settings</Link>
        </nav>
      </header>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search jobs..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ Add Job'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>Export</button>
          <button className="btn btn-secondary" onClick={handleImport}>Import</button>
        </div>
      </div>

      {showForm && (
        <form className="add-job-form card" onSubmit={handleAdd}>
          <h3>New Job</h3>
          <div className="form-row">
            <label>
              Job Name *
              <input type="text" value={jobName} onChange={e => setJobName(e.target.value)} required />
            </label>
            <label>
              Customer *
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
            </label>
            <label>
              Due Date
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary">Create Job</button>
        </form>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          {jobs.length === 0
            ? 'No jobs yet. Click "+ Add Job" to get started.'
            : 'No jobs match your search.'}
        </div>
      )}

      <div className="jobs-grid">
        {filtered.map(job => {
          const pct = calcProgress(job, weighted, weights);
          const next = getNextMilestone(job);
          return (
            <div key={job.id} className="card job-card">
              <Link to={`/job/${job.id}`} className="job-card-link">
                <div className="job-card-header">
                  <h2>{job.jobName}</h2>
                  <span className="customer-badge">{job.customerName}</span>
                </div>
                {job.dueDate && (
                  <p className="due-date">Due: {new Date(job.dueDate).toLocaleDateString()}</p>
                )}
                <ProgressBar percent={pct} />
                {next && <p className="next-milestone">Next: {next.title}</p>}
                {!next && pct === 100 && <p className="next-milestone complete">All milestones complete!</p>}
              </Link>
              <button
                className="btn btn-danger btn-sm delete-btn"
                onClick={(e) => { e.preventDefault(); handleDelete(job.id); }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
