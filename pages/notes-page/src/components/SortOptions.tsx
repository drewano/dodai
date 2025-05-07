import type React from 'react';
import type { SortOption } from '../hooks/useFilterAndSort';

interface SortOptionsProps {
  value: SortOption;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SortOptions: React.FC<SortOptionsProps> = ({ value, onChange }) => {
  return (
    <div className="flex justify-end mb-3">
      <select
        value={value}
        onChange={onChange}
        className="text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none">
        <option value="updatedAt_desc">Modifié récemment</option>
        <option value="updatedAt_asc">Modifié anciennement</option>
        <option value="createdAt_desc">Créé récemment</option>
        <option value="createdAt_asc">Créé anciennement</option>
        <option value="title_asc">Titre (A-Z)</option>
        <option value="title_desc">Titre (Z-A)</option>
      </select>
    </div>
  );
};

export default SortOptions;
