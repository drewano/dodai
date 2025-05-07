import '@src/Options.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { AIAgentOptions } from './AIAgentOptions';
import { McpServerOptions } from './McpServerOptions';
import { NotesOptions } from './NotesOptions';

const Options = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-opacity-80 backdrop-blur-sm border-b border-gray-800 shadow-md py-3 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label="Dodo">
            🦤
          </span>
          <span className="text-xl font-bold text-blue-400">DoDai</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-8">
          <section>
            <h1 className="text-2xl font-bold mb-4 text-blue-400">Configuration de l'Extension</h1>
            <p className="text-gray-400 text-sm mb-8">
              Configurez les options de l'agent IA et des serveurs MCP pour personnaliser votre expérience.
            </p>
          </section>

          <section className="space-y-8">
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-800/50 shadow-lg">
              <AIAgentOptions />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-800/50 shadow-lg">
              <McpServerOptions />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-800/50 shadow-lg">
              <NotesOptions />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    Options,
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">Chargement...</div>,
  ),
  <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">
    Une erreur est survenue
  </div>,
);
