import type React from 'react';
import { useState } from 'react';
import OptionsLayout from './OptionsLayout';
import { Settings, BrainCircuit, ServerCog, BookText, Palette, Database } from 'lucide-react';

// Import the adapted option components
import { AIAgentOptions } from './components/AIAgentOptions';
import { McpServerOptions } from './components/McpServerOptions';
import { NotesOptions } from './components/NotesOptions';
import { GeneralOptions } from './components/GeneralOptions';
import { AppearanceOptions } from './components/AppearanceOptions';

// Define option categories
export interface OptionCategory {
  id: string;
  title: string;
  icon: React.ReactElement;
}

const OptionsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('general');

  // Define available option categories
  const categories: OptionCategory[] = [
    {
      id: 'general',
      title: 'Général',
      icon: <Settings size={20} />,
    },
    {
      id: 'agent-ia',
      title: 'Agent IA',
      icon: <BrainCircuit size={20} />,
    },
    {
      id: 'serveurs-mcp',
      title: 'Serveurs MCP',
      icon: <ServerCog size={20} />,
    },
    {
      id: 'donnees',
      title: 'Données',
      icon: <Database size={20} />,
    },
    {
      id: 'apparence',
      title: 'Apparence',
      icon: <Palette size={20} />,
    },
  ];

  // Render content based on selected category
  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'general':
        return <GeneralOptions />;
      case 'agent-ia':
        return <AIAgentOptions />;
      case 'serveurs-mcp':
        return <McpServerOptions />;
      case 'donnees':
        return <NotesOptions />; // Same component for now, handles import/export
      case 'apparence':
        return <AppearanceOptions />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-text-muted">Sélectionnez une catégorie pour voir les options.</p>
          </div>
        );
    }
  };

  // Get current category title for header
  const getCurrentCategoryTitle = () => {
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.title : 'Options';
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      {/* Modal-like container inspired by ChatGPT settings */}
      <div className="w-full max-w-6xl h-full max-h-[850px] bg-background-secondary rounded-lg shadow-2xl overflow-hidden">
        <OptionsLayout
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          categoryTitle={getCurrentCategoryTitle()}
          content={renderCategoryContent()}
        />
      </div>
    </div>
  );
};

export default OptionsView; 