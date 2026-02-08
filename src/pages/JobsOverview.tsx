import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getJobs, addJob, deleteJob, calcProgress, getNextMilestone,
  getWeightedMode, getPhaseWeights, exportData, importData,
  getJobFilters, saveJobFilters,
} from '../store.ts';
import type { Job } from '../types.ts';
import type { JobFilters } from '../store.ts';
import ProgressBar from '../components/ProgressBar.tsx';
import QuickUpdatePanel from '../components/QuickUpdatePanel.tsx';

export default function JobsOverview() {
  const [jobs, setJobs] = useState<Job[]>(getJobs);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [jobName, setJobName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filters, setFilters] = useState<JobFilters>(getJobFilters);
  const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null);

  const weighted = getWeightedMode();
  const weights = getPhaseWeights();

  function updateFilter(patch: Partial<JobFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    saveJobFilters(next);
  }

  // Compute progress for a job (cached per render via useMemo map)
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobs) {
      map.set(j.id, calcProgress(j, weighted, weights));
    }
    return map;
  }, [jobs, weighted, weights]);

  const processed = useMemo(() => {
    let result = [...jobs];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        j => j.jobName.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status === 'completed') {
      result = result.filter(j => progressMap.get(j.id) === 100);
    } else if (filters.status === 'active') {
      result = result.filter(j => (progressMap.get(j.id) ?? 0) < 100);
    }

    // Has Photos filter
    if (filters.hasPhotos === 'with') {
      result = result.filter(j => (j.photos?.length ?? 0) > 0);
    } else if (filters.hasPhotos === 'without') {
      result = result.filter(j => !j.photos || j.photos.length === 0);
    }

    // Sorting
    const sort = filters.sort;
    result.sort((a, b) => {
      if (sort === 'newest') {
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      }
      if (sort === 'oldest') {
        return (a.updatedAt || a.createdAt || '').localeCompare(b.updatedAt || b.createdAt || '');
      }
      if (sort === 'progress-high') {
        return (progressMap.get(b.id) ?? 0) - (progressMap.get(a.id) ?? 0);
      }
      if (sort === 'progress-low') {
        return (progressMap.get(a.id) ?? 0) - (progressMap.get(b.id) ?? 0);
      }
      if (sort === 'due-soonest') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === 'due-latest') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      }
      return 0;
    });

    return result;
  }, [jobs, search, filters, progressMap]);

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

      <div className="filter-bar">
        <select value={filters.sort} onChange={e => updateFilter({ sort: e.target.value })}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="progress-high">Progress: High → Low</option>
          <option value="progress-low">Progress: Low → High</option>
          <option value="due-soonest">Due Date: Soonest</option>
          <option value="due-latest">Due Date: Latest</option>
        </select>
        <select value={filters.status} onChange={e => updateFilter({ status: e.target.value })}>
          <option value="all">All Jobs</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filters.hasPhotos} onChange={e => updateFilter({ hasPhotos: e.target.value })}>
          <option value="all">All Photos</option>
          <option value="with">With Photos</option>
          <option value="without">Without Photos</option>
        </select>
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

      {processed.length === 0 && (
        <div className="empty-state">
          {jobs.length === 0
            ? 'No jobs yet. Click "+ Add Job" to get started.'
            : 'No jobs match your filters.'}
        </div>
      )}

      <div className="jobs-grid">
        {processed.map(job => {
          const pct = progressMap.get(job.id) ?? 0;
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
              <button
                className="quick-update-btn"
                onClick={(e) => { e.preventDefault(); setQuickUpdateId(job.id); }}
              >
                Quick Update
              </button>
            </div>
          );
        })}
      </div>

      {quickUpdateId && (
        <QuickUpdatePanel
          jobId={quickUpdateId}
          onClose={() => setQuickUpdateId(null)}
          onJobChanged={() => setJobs(getJobs())}
        />
      )}
    </div>
  );
}
