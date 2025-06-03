import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@src/components/layout/MainLayout';
import CanvasView from '@src/features/canvas/CanvasView';
import NotesView from '@src/features/notes/NotesView';
import OptionsView from '@src/features/options/OptionsView';
import { DodaiProvider } from '@src/features/canvas/contexts/DodaiContext';

// Placeholder pour NotesView
// const NotesViewPlaceholder = () => <div>Notes View Placeholder</div>;

const App = () => {
  return (
    <DodaiProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Route d'index qui redirige vers /canvas */}
            <Route index element={<Navigate to="/canvas" replace />} />
            <Route path="canvas" element={<CanvasView />} />
            <Route path="notes" element={<NotesView />} />
            <Route path="options" element={<OptionsView />} />
          </Route>
        </Routes>
      </HashRouter>
    </DodaiProvider>
  );
};

export default App;
