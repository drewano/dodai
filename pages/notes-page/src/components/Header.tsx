import type React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-opacity-80 backdrop-blur-sm border-b border-gray-800 shadow-md py-3 px-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <span className="text-2xl" role="img" aria-label="Dodo">
          🦤
        </span>
        <span className="text-xl font-bold text-blue-400">DoDai Notes</span>
      </div>
    </header>
  );
};

export default Header;
