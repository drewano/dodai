import type React from 'react';
import { useState } from 'react';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';

// Interface for dynamic navigation items
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
  mainContent?: React.ReactNode;
  mainContentTitle?: string;
  initialIsExpanded?: boolean;
  onExpansionChange?: (isExpanded: boolean) => void;
}

const DodaiSidebar: React.FC<DodaiSidebarProps> = ({
  navItems,
  mainContent,
  mainContentTitle,
  initialIsExpanded = true, // Default to true
  onExpansionChange,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(initialIsExpanded);

  const isControlled = initialIsExpanded !== undefined && onExpansionChange !== undefined;
  const currentIsExpanded = isControlled ? initialIsExpanded : internalIsExpanded;

  const toggleSidebar = () => {
    const newState = !currentIsExpanded;
    if (isControlled && onExpansionChange) {
      onExpansionChange(newState);
    } else {
      setInternalIsExpanded(newState);
      // Still call onExpansionChange if provided, even for uncontrolled, to notify
      if (onExpansionChange) {
        onExpansionChange(newState);
      }
    }
  };

  const navItemBaseClasses =
    'flex items-center p-2.5 rounded-md text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 overflow-hidden';
  const iconClasses = 'flex-shrink-0 w-5 h-5 text-slate-400 group-hover:text-slate-100 transition-colors';

  const getNavItemClasses = (expanded: boolean, isActive: boolean): string => {
    const dynamic = expanded ? 'w-full justify-start' : 'justify-center';
    const activeClasses = isActive ? 'bg-slate-700 text-slate-100' : ''; // Or bg-blue-600/20
    return `${navItemBaseClasses} ${dynamic} ${activeClasses}`;
  };

  const getTextClasses = (expanded: boolean): string => {
    const base = 'whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out';
    const dynamic = expanded ? 'ml-4 max-w-full opacity-100 delay-100 visible' : 'max-w-0 opacity-0 invisible';
    return `${base} ${dynamic}`;
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-850 shadow-lg rounded-md transition-all duration-300 ease-in-out ${currentIsExpanded ? 'w-64' : 'w-16'} overflow-x-hidden`}
      aria-label="Dodai Sidebar">
      {/* Header: Toggle Button & Title */}
      <div
        className={`flex items-center p-3 flex-shrink-0 h-[60px] ${currentIsExpanded ? 'justify-start' : 'justify-center'}`}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={currentIsExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={currentIsExpanded ? 'Collapse' : 'Expand'}>
          {currentIsExpanded ? <PanelLeftClose size={20} /> : <PanelRightClose size={20} />}
        </button>
        {/* Dodai Title or Logo */}
        <h1
          className={`text-xl font-semibold text-slate-200 overflow-hidden transition-all duration-200 ease-in-out ${
            currentIsExpanded ? 'ml-2 max-w-xs opacity-100 delay-100 visible' : 'max-w-0 opacity-0 invisible'
          }`}
          style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {/* Using text "Dodai" for now, can be replaced with 🦤 or an SVG logo */}
          Dodai
        </h1>
      </div>

      {/* Navigation & Main Content Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Navigation Items */}
        <nav
          className={`p-3 space-y-2 overflow-x-hidden ${
            currentIsExpanded && mainContent ? 'flex-shrink-0' : 'flex-1 overflow-y-auto'
          }`}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={getNavItemClasses(currentIsExpanded, item.isActive)}
              aria-label={item.label}
              title={item.title || item.label}>
              <span className={iconClasses}>{item.icon}</span>
              {currentIsExpanded && <span className={getTextClasses(true)}>{item.label}</span>}
              {!currentIsExpanded && <span className="sr-only">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Main Content Section */}
        {currentIsExpanded && mainContent && (
          <div className="flex-1 p-3 border-t border-slate-700/60 min-h-0 overflow-y-auto">
            {mainContentTitle && (
              <h3 className="flex-shrink-0 mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                {mainContentTitle}
              </h3>
            )}
            <div className="h-full">{mainContent}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export { DodaiSidebar };
