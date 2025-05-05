import type React from 'react';
import type { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

/**
 * Composant pour la navigation entre les onglets
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex bg-blue-950 text-sm font-medium">
      <button
        className={`flex-1 py-2.5 text-center transition-colors ${
          activeTab === 'chat'
            ? 'text-white border-b-2 border-blue-400'
            : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
        }`}
        onClick={() => setActiveTab('chat')}>
        <div className="flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5">
            <path
              d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 12H8M12 8V12V8ZM12 12V16V12ZM12 12H16H12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Chat
        </div>
      </button>
      <button
        className={`flex-1 py-2.5 text-center transition-colors ${
          activeTab === 'tools'
            ? 'text-white border-b-2 border-blue-400'
            : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
        }`}
        onClick={() => setActiveTab('tools')}>
        <div className="flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5">
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Outils
        </div>
      </button>
      <button
        className={`flex-1 py-2.5 text-center transition-colors ${
          activeTab === 'memory'
            ? 'text-white border-b-2 border-blue-400'
            : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
        }`}
        onClick={() => setActiveTab('memory')}>
        <div className="flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5">
            <path
              d="M9 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mémoire
        </div>
      </button>
    </div>
  );
};
