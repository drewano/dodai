import '@src/Options.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { AIAgentOptions } from './AIAgentOptions';
import { McpServerOptions } from './McpServerOptions';
import { NotesOptions } from './NotesOptions';
import { useState, useEffect } from 'react';
import { cn } from '@extension/ui';

type NavItem = {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
};

const Options = () => {
  const [activeTab, setActiveTab] = useState<string>('aiagent');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fermer le menu mobile lors d'un changement d'onglet
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const navItems: NavItem[] = [
    {
      id: 'aiagent',
      title: 'Agent IA',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
          <circle cx="7.5" cy="14.5" r="1.5" />
          <circle cx="16.5" cy="14.5" r="1.5" />
        </svg>
      ),
      component: <AIAgentOptions />,
    },
    {
      id: 'mcpserver',
      title: 'Serveurs MCP',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
      component: <McpServerOptions />,
    },
    {
      id: 'notes',
      title: 'Notes',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
      component: <NotesOptions />,
    },
  ];

  const activeComponent = navItems.find(item => item.id === activeTab)?.component || navItems[0].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 shadow-lg py-3 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label="Dodo">
            🦤
          </span>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            DoDai
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300 border-b border-gray-800/50 pb-4">
          Configuration de l'Extension
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Mobile Navigation Dropdown */}
          <div className="md:hidden col-span-1 mb-4 relative">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between py-2 px-4 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <span className="flex items-center">
                {navItems.find(item => item.id === activeTab)?.icon}
                <span className="ml-2">{navItems.find(item => item.id === activeTab)?.title}</span>
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transform transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isMobileMenuOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
                <ul className="py-1">
                  {navItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          'w-full flex items-center px-4 py-2 text-sm',
                          activeTab === item.id ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300 hover:bg-gray-700/50',
                        )}>
                        {item.icon}
                        <span className="ml-2">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar Navigation */}
          <div className="hidden md:block md:col-span-3 lg:col-span-2">
            <nav className="sticky top-24 bg-gray-900/20 backdrop-blur-sm rounded-xl border border-gray-800/50">
              <ul className="py-2">
                {navItems.map(item => (
                  <li key={item.id} className="px-2">
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full text-left py-3 px-4 rounded-lg transition-all duration-200 font-medium flex items-center space-x-3',
                        activeTab === item.id
                          ? 'bg-blue-600/20 text-blue-400 border-l-2 border-l-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                          : 'border-l-2 border-l-transparent hover:border-l-blue-800 hover:text-blue-300 hover:bg-gray-800/30',
                      )}>
                      {item.icon}
                      <span>{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-9 lg:col-span-10 rounded-xl border border-gray-800/50 backdrop-blur-sm bg-gray-900/20 shadow-lg overflow-hidden transform transition-all duration-200 ease-in-out">
            {activeComponent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    Options,
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-blue-400">Chargement...</p>
      </div>
    </div>,
  ),
  <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">
    <div className="flex flex-col items-center text-red-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p>Une erreur est survenue</p>
    </div>
  </div>,
);
