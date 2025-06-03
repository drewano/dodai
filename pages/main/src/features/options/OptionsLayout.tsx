import type React from 'react';
import type { OptionCategory } from './OptionsView';

interface OptionsLayoutProps {
  categories: OptionCategory[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  categoryTitle: string;
  content: React.ReactNode;
}

const OptionsLayout: React.FC<OptionsLayoutProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  categoryTitle,
  content,
}) => {
  return (
    <div className="flex h-full">
      {/* Internal Sidebar Navigation */}
      <div className="w-64 bg-background-tertiary border-r border-border-primary flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-border-primary">
          <h1 className="text-lg font-semibold text-text-primary">Paramètres</h1>
        </div>

        {/* Navigation Items */}
        <nav className="p-4">
          <ul className="space-y-1">
            {categories.map(category => (
              <li key={category.id}>
                <button
                  onClick={() => onCategorySelect(category.id)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-border-accent ${
                    selectedCategory === category.id
                      ? 'bg-background-accent text-text-inverted shadow-sm border border-background-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-quaternary/60 border border-transparent'
                  }`}
                  aria-current={selectedCategory === category.id ? 'page' : undefined}
                  title={category.title}>
                  <span className={`flex-shrink-0 mr-3 transition-colors ${
                    selectedCategory === category.id ? 'text-text-inverted' : 'text-text-muted'
                  }`}>
                    {category.icon}
                  </span>
                  <span className="truncate">{category.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content Panel */}
      <div className="flex-1 overflow-auto bg-background-primary">
        {/* Content Header */}
        <div className="sticky top-0 bg-background-primary border-b border-border-primary z-10">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-semibold text-text-primary">{categoryTitle}</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          {content}
        </div>
      </div>
    </div>
  );
};

export default OptionsLayout; 