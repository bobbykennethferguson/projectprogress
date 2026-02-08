import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JobsOverview from './pages/JobsOverview.tsx';
import JobDetail from './pages/JobDetail.tsx';
import TemplateEditor from './pages/TemplateEditor.tsx';
import Settings from './pages/Settings.tsx';
import { getDarkMode, setDarkMode } from './store.ts';

function resolveInitialDark(): boolean {
  const stored = getDarkMode();
  if (stored !== null) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const [dark, setDark] = useState(resolveInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    setDarkMode(next);
  }

  return (
    <BrowserRouter>
      <div className="app-top-bar">
        <button className="dark-toggle" onClick={toggleDark} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? '\u2600' : '\u263E'}
        </button>
      </div>
      <Routes>
        <Route path="/" element={<JobsOverview />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/template" element={<TemplateEditor />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
