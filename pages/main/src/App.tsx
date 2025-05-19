import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@src/components/layout/MainLayout';
import CanvasView from '@src/features/canvas/CanvasView';
import NotesView from '@src/features/notes/NotesView';
import { DodaiProvider } from '@src/features/canvas/contexts/DodaiContext';

// Placeholder pour NotesView
// const NotesViewPlaceholder = () => <div>Notes View Placeholder</div>;

const App = () => {
  return (
    <DodaiProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Route d'index qui redirige vers /canvas */}
            <Route index element={<Navigate to="/canvas" replace />} />
            <Route path="canvas" element={<CanvasView />} />
            <Route path="notes" element={<NotesView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DodaiProvider>
  );
};

export default App;
