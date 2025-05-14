import React, { useState, useMemo } from 'react';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';

// New interface for dynamic navigation items
export interface NavItemProps {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  isActive: boolean;
  title?: string; // Optional title for tooltip
}

interface DodaiSidebarProps {
  navItems: NavItemProps[];
  lowerContent?: React.ReactNode;
  lowerContentTitle?: string;
  initialIsExpanded?: boolean;
  onExpansionChange?: (isExpanded: boolean) => void;
}

const DodaiSidebar: React.FC<DodaiSidebarProps> = ({
  navItems,
  lowerContent,
  lowerContentTitle,
  initialIsExpanded,
  onExpansionChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialIsExpanded ?? true);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onExpansionChange) {
      onExpansionChange(newState);
    }
  };

  const navItemBaseClasses =
    'flex items-center p-2.5 rounded-md text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75';
  const iconClasses = 'flex-shrink-0 w-5 h-5 text-slate-400 group-hover:text-slate-100 transition-colors';

  const getNavItemClasses = (expanded: boolean, isActive: boolean): string => {
    const dynamic = expanded ? 'w-full justify-start' : 'justify-center';
    const activeClasses = isActive ? 'bg-slate-700 text-slate-100' : '';
    return `${navItemBaseClasses} ${dynamic} ${activeClasses}`;
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
          }`}
          style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Dodai
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={getNavItemClasses(isExpanded, item.isActive)}
            aria-label={item.label}
            title={item.title || item.label}>
            {/* Wrap icon in a span to apply classes safely */}
            <span className={iconClasses}>{item.icon}</span>
            <span className={getTextClasses(isExpanded)}>{item.label}</span>
            {!isExpanded && <span className="sr-only">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Lower Content Section */}
      {(lowerContent || lowerContentTitle) && isExpanded && (
        <div className="p-3 border-t border-slate-700/60 flex-shrink-0">
          {lowerContentTitle && isExpanded && (
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">{lowerContentTitle}</h3>
          )}
          {isExpanded && lowerContent}
        </div>
      )}

      {/* History Placeholder - This specific implementation will be passed via lowerContent if needed for canvas */}
      {!lowerContent && !lowerContentTitle && (
        <div
          className={`p-3 border-t border-slate-700/60 flex-shrink-0 transition-all duration-300 ease-in-out ${
            isExpanded ? 'opacity-100 pt-3' : 'opacity-0 h-0 pt-0 overflow-hidden'
          }`}>
          {isExpanded && <></>}
        </div>
      )}
    </div>
  );
};

export default DodaiSidebar;
