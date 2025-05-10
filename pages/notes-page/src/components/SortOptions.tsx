import type React from 'react';
import type { SortOption } from '../hooks/useFilterAndSort';

interface SortOptionsProps {
  value: SortOption;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SortOptions: React.FC<SortOptionsProps> = ({ value, onChange }) => {
  return (
    <div className="flex justify-end mb-3">
      <div className="relative inline-block">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
          </svg>
        </div>
        <select
          value={value}
          onChange={onChange}
          className="appearance-none bg-slate-700/60 border border-slate-600/60 text-slate-200 text-xs rounded-md py-1.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-slate-500 transition-colors">
          <option value="updatedAt_desc">Modifié récemment</option>
          <option value="updatedAt_asc">Modifié anciennement</option>
          <option value="createdAt_desc">Créé récemment</option>
          <option value="createdAt_asc">Créé anciennement</option>
          <option value="title_asc">Titre (A-Z)</option>
          <option value="title_desc">Titre (Z-A)</option>
        </select>
      </div>
    </div>
  );
};

export default SortOptions;
