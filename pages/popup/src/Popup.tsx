import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { AIAgentChat } from './AIAgentChat';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  const goToOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'} shadow-sm`}>
        <div className="flex justify-between items-center w-full px-4 py-2">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🦤</span>
            <h1 className="text-lg font-semibold">DoDai</h1>
          </div>
          <button
            className="px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50 transition-colors"
            onClick={goToOptions}>
            Options
          </button>
        </div>
      </header>

      <div style={{ width: '350px', height: '450px' }}>
        <AIAgentChat />
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(Popup, <div className="flex h-screen w-full items-center justify-center">Loading...</div>),
  <div className="p-4 text-red-500">Une erreur est survenue</div>,
);
