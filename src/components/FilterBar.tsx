import { useState, useEffect, useRef } from 'react';
import type { JobFilters } from '../store.ts';
import { DEFAULT_FILTERS } from '../store.ts';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Updated' },
  { value: 'due-soonest', label: 'Due Date: Soonest' },
  { value: 'due-latest', label: 'Due Date: Latest' },
  { value: 'progress-high', label: 'Progress: Highest' },
  { value: 'progress-low', label: 'Progress: Lowest' },
  { value: 'name-az', label: 'Name: A\u2013Z' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const DUE_OPTIONS = [
  { value: 'all', label: 'All Due Dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: '7days', label: 'Due in 7 days' },
  { value: '30days', label: 'Due in 30 days' },
  { value: 'none', label: 'No due date' },
];

const PROGRESS_OPTIONS = [
  { value: 'all', label: 'All Progress' },
  { value: '0', label: '0%' },
  { value: '1-99', label: '1\u201399%' },
  { value: '100', label: '100%' },
];

interface Props {
  filters: JobFilters;
  onChange: (patch: Partial<JobFilters>) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
  const [openMenu, setOpenMenu] = useState<'sort' | 'filters' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return;
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.due !== 'all' ? 1 : 0) +
    (filters.progress !== 'all' ? 1 : 0);

  const isNonDefault = filters.sort !== 'recent' || activeFilterCount > 0;

  function reset() {
    onChange({ ...DEFAULT_FILTERS });
    setOpenMenu(null);
  }

  // Build chips for active non-default values
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.sort !== 'recent') {
    const lbl = SORT_OPTIONS.find(o => o.value === filters.sort)?.label ?? filters.sort;
    chips.push({ key: 'sort', label: `Sort: ${lbl}`, onRemove: () => onChange({ sort: 'recent' }) });
  }
  if (filters.status !== 'all') {
    const lbl = STATUS_OPTIONS.find(o => o.value === filters.status)?.label ?? filters.status;
    chips.push({ key: 'status', label: `Status: ${lbl}`, onRemove: () => onChange({ status: 'all' }) });
  }
  if (filters.due !== 'all') {
    const lbl = DUE_OPTIONS.find(o => o.value === filters.due)?.label ?? filters.due;
    chips.push({ key: 'due', label: `Due: ${lbl}`, onRemove: () => onChange({ due: 'all' }) });
  }
  if (filters.progress !== 'all') {
    const lbl = PROGRESS_OPTIONS.find(o => o.value === filters.progress)?.label ?? filters.progress;
    chips.push({ key: 'progress', label: `Progress: ${lbl}`, onRemove: () => onChange({ progress: 'all' }) });
  }

  return (
    <div className="fb" ref={barRef}>
      <div className="fb-buttons">
        <div className="fb-btn-group">
          <button
            className={`fb-btn${openMenu === 'sort' ? ' fb-btn-active' : ''}${filters.sort !== 'recent' ? ' fb-btn-has-value' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')}
          >
            Sort
          </button>
          {openMenu === 'sort' && (
            <div className="fb-dropdown">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`fb-option${filters.sort === opt.value ? ' fb-option-active' : ''}`}
                  onClick={() => { onChange({ sort: opt.value }); setOpenMenu(null); }}
                >
                  {opt.label}
                  {filters.sort === opt.value && <span className="fb-check">{'\u2713'}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="fb-btn-group">
          <button
            className={`fb-btn${openMenu === 'filters' ? ' fb-btn-active' : ''}${activeFilterCount > 0 ? ' fb-btn-has-value' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'filters' ? null : 'filters')}
          >
            Filters{activeFilterCount > 0 ? ` \u00b7 ${activeFilterCount}` : ''}
          </button>
          {openMenu === 'filters' && (
            <div className="fb-dropdown fb-dropdown-wide">
              <div className="fb-section">
                <div className="fb-section-label">Status</div>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`fb-option${filters.status === opt.value ? ' fb-option-active' : ''}`}
                    onClick={() => onChange({ status: opt.value })}
                  >
                    {opt.label}
                    {filters.status === opt.value && <span className="fb-check">{'\u2713'}</span>}
                  </button>
                ))}
              </div>
              <div className="fb-section">
                <div className="fb-section-label">Due Date</div>
                {DUE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`fb-option${filters.due === opt.value ? ' fb-option-active' : ''}`}
                    onClick={() => onChange({ due: opt.value })}
                  >
                    {opt.label}
                    {filters.due === opt.value && <span className="fb-check">{'\u2713'}</span>}
                  </button>
                ))}
              </div>
              <div className="fb-section">
                <div className="fb-section-label">Progress</div>
                {PROGRESS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`fb-option${filters.progress === opt.value ? ' fb-option-active' : ''}`}
                    onClick={() => onChange({ progress: opt.value })}
                  >
                    {opt.label}
                    {filters.progress === opt.value && <span className="fb-check">{'\u2713'}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isNonDefault && (
          <button className="fb-reset" onClick={reset}>Reset</button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="fb-chips">
          {chips.map(chip => (
            <span key={chip.key} className="fb-chip">
              {chip.label}
              <button className="fb-chip-x" onClick={chip.onRemove}>&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
