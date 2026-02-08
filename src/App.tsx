import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JobsOverview from './pages/JobsOverview.tsx';
import JobDetail from './pages/JobDetail.tsx';
import TemplateEditor from './pages/TemplateEditor.tsx';
import Settings from './pages/Settings.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobsOverview />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/template" element={<TemplateEditor />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
