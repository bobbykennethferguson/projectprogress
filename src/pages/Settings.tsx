import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getWeightedMode, setWeightedMode, getPhaseWeights } from '../store.ts';

export default function Settings() {
  const [weighted, setWeighted] = useState(getWeightedMode);
  const weights = getPhaseWeights();

  function handleToggle() {
    const next = !weighted;
    setWeightedMode(next);
    setWeighted(next);
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">&larr; All Jobs</Link>
      <h1>Settings</h1>

      <div className="card settings-card">
        <h3>Progress Calculation</h3>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={weighted}
            onChange={handleToggle}
          />
          <span>Weighted mode</span>
        </label>
        <p className="settings-description">
          {weighted
            ? 'Progress is calculated using phase weights. Each phase contributes its configured weight, distributed equally across its milestones.'
            : 'Progress is calculated as completed milestones / total milestones (equal weight).'}
        </p>

        {weighted && (
          <div className="weight-summary">
            <h4>Current Phase Weights</h4>
            <table className="weight-table">
              <thead>
                <tr><th>Phase</th><th>Weight</th></tr>
              </thead>
              <tbody>
                {weights.map(w => (
                  <tr key={w.phase}>
                    <td>{w.phase}</td>
                    <td>{w.weight}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>{weights.reduce((s, w) => s + w.weight, 0)}</strong></td>
                </tr>
              </tbody>
            </table>
            <p className="settings-description">
              Edit weights in the <Link to="/template">Template Editor</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
