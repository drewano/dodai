import type React from 'react';

export const AppearanceOptions: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-text-secondary mb-6">
          Personnalisez l'apparence et l'interface de Dodai selon vos préférences.
        </p>
      </div>

      {/* Theme Settings */}
      <div className="space-y-6">
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Thème</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Mode d'affichage
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    className="peer sr-only"
                    defaultChecked
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-4 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700"></div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">Sombre</div>
                        <div className="text-xs text-text-muted">Mode par défaut</div>
                      </div>
                    </div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-4 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-slate-100 border border-slate-300"></div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">Clair</div>
                        <div className="text-xs text-text-muted">Bientôt disponible</div>
                      </div>
                    </div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="auto"
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-4 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-gradient-to-r from-slate-900 to-slate-100 border border-slate-500"></div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">Auto</div>
                        <div className="text-xs text-text-muted">Suit le système</div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Density Settings */}
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Densité</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Espacement des éléments
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="density"
                    value="compact"
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-3 transition-all">
                    <div className="text-sm font-medium text-text-primary mb-1">Compact</div>
                    <div className="text-xs text-text-muted">Plus d'informations à l'écran</div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="density"
                    value="normal"
                    className="peer sr-only"
                    defaultChecked
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-3 transition-all">
                    <div className="text-sm font-medium text-text-primary mb-1">Normal</div>
                    <div className="text-xs text-text-muted">Équilibré</div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="density"
                    value="comfortable"
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border-2 border-border-primary peer-checked:border-border-accent peer-checked:ring-2 peer-checked:ring-border-accent/20 bg-background-tertiary p-3 transition-all">
                    <div className="text-sm font-medium text-text-primary mb-1">Confortable</div>
                    <div className="text-xs text-text-muted">Plus d'espace</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Animation Settings */}
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Animations</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Transitions fluides</h4>
                <p className="text-xs text-text-muted">Active les transitions entre les pages et les éléments</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={true}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Animations de chargement</h4>
                <p className="text-xs text-text-muted">Affiche des indicateurs animés pendant le chargement</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={true}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Typography Settings */}
        <div>
          <h3 className="text-lg font-medium text-text-primary mb-4">Typographie</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="font-size" className="block text-sm font-medium text-text-secondary mb-2">
                Taille de police
              </label>
              <select
                id="font-size"
                className="w-full max-w-xs py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          hover:border-border-accent transition-colors"
                defaultValue="normal">
                <option value="small">Petite</option>
                <option value="normal">Normale</option>
                <option value="large">Grande</option>
                <option value="extra-large">Très grande</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="font-family" className="block text-sm font-medium text-text-secondary mb-2">
                Police de caractères
              </label>
              <select
                id="font-family"
                className="w-full max-w-xs py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          hover:border-border-accent transition-colors"
                defaultValue="source-sans">
                <option value="source-sans">Source Sans Pro</option>
                <option value="inter">Inter</option>
                <option value="system">Police système</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 