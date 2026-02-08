import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getTemplate, saveTemplate, getPhaseWeights, savePhaseWeights } from '../store.ts';
import { DEFAULT_TEMPLATE, DEFAULT_PHASE_WEIGHTS } from '../defaultTemplate.ts';
import type { TemplateMilestone, PhaseWeight } from '../types.ts';

function generateId(): string {
  return 'tmpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function groupByPhase(items: TemplateMilestone[]): Map<string, TemplateMilestone[]> {
  const map = new Map<string, TemplateMilestone[]>();
  const sorted = [...items].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    const list = map.get(item.phase) ?? [];
    list.push(item);
    map.set(item.phase, list);
  }
  return map;
}

export default function TemplateEditor() {
  const [template, setTemplate] = useState<TemplateMilestone[]>(getTemplate);
  const [weights, setWeights] = useState<PhaseWeight[]>(getPhaseWeights);
  const [newPhase, setNewPhase] = useState('');
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const phases = groupByPhase(template);

  function handleSave() {
    saveTemplate(template);
    savePhaseWeights(weights);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm('Reset template to default? This will not affect existing jobs.')) return;
    setTemplate([...DEFAULT_TEMPLATE]);
    setWeights([...DEFAULT_PHASE_WEIGHTS]);
    saveTemplate(DEFAULT_TEMPLATE);
    savePhaseWeights(DEFAULT_PHASE_WEIGHTS);
  }

  function addPhase() {
    const name = newPhase.trim();
    if (!name || [...phases.keys()].includes(name)) return;
    setWeights([...weights, { phase: name, weight: 10 }]);
    setNewPhase('');
  }

  function removePhase(phase: string) {
    if (!confirm(`Remove phase "${phase}" and all its milestones?`)) return;
    setTemplate(template.filter(t => t.phase !== phase));
    setWeights(weights.filter(w => w.phase !== phase));
  }

  function addMilestoneToPhase(phase: string) {
    const title = (newMilestone[phase] ?? '').trim();
    if (!title) return;
    const maxOrder = Math.max(0, ...template.map(t => t.order));
    setTemplate([...template, { id: generateId(), title, phase, order: maxOrder + 1 }]);
    setNewMilestone({ ...newMilestone, [phase]: '' });
  }

  function removeMilestone(id: string) {
    setTemplate(template.filter(t => t.id !== id));
  }

  function moveMilestone(id: string, direction: -1 | 1) {
    if (!template.some(t => t.id === id)) return;
    const sorted = [...template].sort((a, b) => a.order - b.order);
    const sortedIdx = sorted.findIndex(t => t.id === id);
    const swapIdx = sortedIdx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempOrder = sorted[sortedIdx].order;
    sorted[sortedIdx].order = sorted[swapIdx].order;
    sorted[swapIdx].order = tempOrder;
    setTemplate([...sorted]);
  }

  function updateWeight(phase: string, value: number) {
    setWeights(weights.map(w => w.phase === phase ? { ...w, weight: value } : w));
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">&larr; All Jobs</Link>
      <h1>Template Editor</h1>
      <p className="subtitle">Edit the milestone template used when creating new jobs.</p>

      <div className="template-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Template'}
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>Reset to Default</button>
      </div>

      {[...phases.entries()].map(([phase, milestones]) => {
        const pw = weights.find(w => w.phase === phase);
        return (
          <div key={phase} className="card template-phase">
            <div className="phase-header-row">
              <h3>{phase}</h3>
              <div className="phase-weight-input">
                <label>
                  Weight:
                  <input
                    type="number"
                    min={0}
                    value={pw?.weight ?? 0}
                    onChange={e => updateWeight(phase, parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removePhase(phase)}>Remove Phase</button>
            </div>
            <ul className="template-milestones">
              {milestones.map(ms => (
                <li key={ms.id} className="template-milestone-row">
                  <span>{ms.title}</span>
                  <div className="milestone-controls">
                    <button className="btn-icon" onClick={() => moveMilestone(ms.id, -1)} title="Move up">&uarr;</button>
                    <button className="btn-icon" onClick={() => moveMilestone(ms.id, 1)} title="Move down">&darr;</button>
                    <button className="btn-icon btn-icon-danger" onClick={() => removeMilestone(ms.id)} title="Remove">&times;</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="add-milestone-row">
              <input
                type="text"
                placeholder="New milestone..."
                value={newMilestone[phase] ?? ''}
                onChange={e => setNewMilestone({ ...newMilestone, [phase]: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestoneToPhase(phase); } }}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => addMilestoneToPhase(phase)}>Add</button>
            </div>
          </div>
        );
      })}

      <div className="card add-phase-card">
        <h3>Add New Phase</h3>
        <div className="add-milestone-row">
          <input
            type="text"
            placeholder="Phase name..."
            value={newPhase}
            onChange={e => setNewPhase(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhase(); } }}
          />
          <button className="btn btn-primary btn-sm" onClick={addPhase}>Add Phase</button>
        </div>
      </div>
    </div>
  );
}
