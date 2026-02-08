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
import FilterBar from '../components/FilterBar.tsx';

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

    // Due date filter
    if (filters.due !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      if (filters.due === 'overdue') {
        result = result.filter(j => j.dueDate && j.dueDate < todayStr);
      } else if (filters.due === '7days') {
        const future = new Date(today);
        future.setDate(future.getDate() + 7);
        const futureStr = future.toISOString().slice(0, 10);
        result = result.filter(j => j.dueDate && j.dueDate >= todayStr && j.dueDate <= futureStr);
      } else if (filters.due === '30days') {
        const future = new Date(today);
        future.setDate(future.getDate() + 30);
        const futureStr = future.toISOString().slice(0, 10);
        result = result.filter(j => j.dueDate && j.dueDate >= todayStr && j.dueDate <= futureStr);
      } else if (filters.due === 'none') {
        result = result.filter(j => !j.dueDate);
      }
    }

    // Progress filter
    if (filters.progress !== 'all') {
      if (filters.progress === '0') {
        result = result.filter(j => (progressMap.get(j.id) ?? 0) === 0);
      } else if (filters.progress === '1-99') {
        result = result.filter(j => {
          const p = progressMap.get(j.id) ?? 0;
          return p >= 1 && p <= 99;
        });
      } else if (filters.progress === '100') {
        result = result.filter(j => progressMap.get(j.id) === 100);
      }
    }

    // Sorting with deterministic tie-breakers
    const sort = filters.sort;
    result.sort((a, b) => {
      let cmp = 0;

      if (sort === 'recent') {
        cmp = (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      } else if (sort === 'due-soonest') {
        if (!a.dueDate && !b.dueDate) cmp = 0;
        else if (!a.dueDate) cmp = 1;
        else if (!b.dueDate) cmp = -1;
        else cmp = a.dueDate.localeCompare(b.dueDate);
      } else if (sort === 'due-latest') {
        if (!a.dueDate && !b.dueDate) cmp = 0;
        else if (!a.dueDate) cmp = 1;
        else if (!b.dueDate) cmp = -1;
        else cmp = b.dueDate.localeCompare(a.dueDate);
      } else if (sort === 'progress-high') {
        cmp = (progressMap.get(b.id) ?? 0) - (progressMap.get(a.id) ?? 0);
      } else if (sort === 'progress-low') {
        cmp = (progressMap.get(a.id) ?? 0) - (progressMap.get(b.id) ?? 0);
      } else if (sort === 'name-az') {
        cmp = a.jobName.localeCompare(b.jobName);
      }

      // Tie-breaker 1: updatedAt desc
      if (cmp === 0 && sort !== 'recent') {
        cmp = (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      }
      // Tie-breaker 2: name asc
      if (cmp === 0 && sort !== 'name-az') {
        cmp = a.jobName.localeCompare(b.jobName);
      }

      return cmp;
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

      <FilterBar filters={filters} onChange={updateFilter} />

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
