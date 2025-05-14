import { useState } from 'react';
import { PanelLeftClose, PanelRightClose, PlusCircle, NotebookText } from 'lucide-react';

interface DodaiSidebarProps {
  onNavigate: (path: string) => void;
}

const DodaiSidebar: React.FC<DodaiSidebarProps> = ({ onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const navItemBaseClasses =
    'flex items-center p-2.5 rounded-md text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75';
  const iconClasses = 'flex-shrink-0 w-5 h-5 text-slate-400 group-hover:text-slate-100 transition-colors';

  const getNavItemClasses = (expanded: boolean): string => {
    const dynamic = expanded ? 'w-full justify-start' : 'justify-center';
    return `${navItemBaseClasses} ${dynamic}`;
  };

  const getTextClasses = (expanded: boolean): string => {
    const base = 'whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out';
    const dynamic = expanded ? 'ml-3 max-w-full opacity-100 delay-100' : 'max-w-0 opacity-0';
    return `${base} ${dynamic}`;
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-850 shadow-lg rounded-md transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-16'}`}
      aria-label="Barre latérale Dodai">
      {/* Header: Toggle Button & Title */}
      <div
        className={`flex items-center p-3 flex-shrink-0 h-[60px] ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isExpanded ? 'Réduire la barre latérale' : 'Étendre la barre latérale'}
          title={isExpanded ? 'Réduire' : 'Étendre'}>
          {isExpanded ? <PanelLeftClose size={20} /> : <PanelRightClose size={20} />}
        </button>
        <h1
          className={`text-xl font-semibold text-slate-200 overflow-hidden transition-all duration-200 ease-in-out ${
            isExpanded ? 'ml-2 max-w-xs opacity-100 delay-100' : 'max-w-0 opacity-0'
          }`}>
          Dodai
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        <button
          onClick={() => onNavigate('/dodai-canvas.html')}
          className={getNavItemClasses(isExpanded)}
          aria-label="Nouveau Canvas Dodai"
          title="Nouveau Canvas">
          <PlusCircle className={iconClasses} />
          <span className={getTextClasses(isExpanded)}>Nouveau Canvas</span>
          {!isExpanded && <span className="sr-only">Nouveau Canvas</span>}
        </button>

        <button
          onClick={() => onNavigate('/notes-page/index.html')}
          className={getNavItemClasses(isExpanded)}
          aria-label="Mes Notes"
          title="Mes Notes">
          <NotebookText className={iconClasses} />
          <span className={getTextClasses(isExpanded)}>Mes Notes</span>
          {!isExpanded && <span className="sr-only">Mes Notes</span>}
        </button>
      </nav>

      {/* History Placeholder */}
      <div
        className={`p-3 border-t border-slate-700/60 flex-shrink-0 transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 pt-3' : 'opacity-0 h-0 pt-0 overflow-hidden'
        }`}>
        {isExpanded && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">Historique</h3>
            <p className="text-sm text-slate-400">L'historique des conversations apparaîtra ici.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DodaiSidebar;
