import type React from 'react';

export const GeneralOptions: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-text-secondary mb-6">
          Configurez les paramètres généraux de l'application Dodai.
        </p>
      </div>

      {/* Theme and Language Settings */}
      <div className="space-y-6">
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Langue et Région</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-text-secondary mb-2">
                Langue de l'interface
              </label>
              <select
                id="language"
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          hover:border-border-accent transition-colors"
                defaultValue="fr">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-text-secondary mb-2">
                Fuseau horaire
              </label>
              <select
                id="timezone"
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          hover:border-border-accent transition-colors"
                defaultValue="Europe/Paris">
                <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Startup Settings */}
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Démarrage</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Ouvrir automatiquement au démarrage</h4>
                <p className="text-xs text-text-muted">Ouvre Dodai automatiquement quand le navigateur démarre</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={false}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Animations réduites</h4>
                <p className="text-xs text-text-muted">Réduit les animations pour améliorer les performances</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={false}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-4">À propos</h3>
          <div className="bg-background-tertiary rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Version</span>
              <span className="text-sm font-mono text-text-primary">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Extension ID</span>
              <span className="text-xs font-mono text-text-muted">dodai-chrome-extension</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 