import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useState } from 'react';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [summarizeStatus, setSummarizeStatus] = useState<{ loading: boolean; message?: string; error?: boolean }>({
    loading: false,
  });
  const [keyPointsStatus, setKeyPointsStatus] = useState<{ loading: boolean; message?: string; error?: boolean }>({
    loading: false,
  });
  const [customPromptStatus, setCustomPromptStatus] = useState<{
    loading: boolean;
    message?: string;
    error?: boolean;
  }>({
    loading: false,
  });
  const [customPrompt, setCustomPrompt] = useState('');

  const goToOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openNotesPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('notes-page/index.html') });
  };

  const summarizePage = () => {
    setSummarizeStatus({ loading: true });

    chrome.runtime.sendMessage({ type: 'SUMMARIZE_PAGE_REQUEST' }, response => {
      if (chrome.runtime.lastError) {
        console.error("Erreur lors de l'envoi du message:", chrome.runtime.lastError);
        setSummarizeStatus({
          loading: false,
          message: "Erreur de communication avec l'extension",
          error: true,
        });
        return;
      }

      if (response.success) {
        console.log('Résumé généré:', response.summary);
        setSummarizeStatus({
          loading: false,
          message: 'Résumé créé et sauvegardé dans vos notes !',
        });

        // Optionnel: après quelques secondes, effacer le message
        setTimeout(() => {
          setSummarizeStatus({ loading: false });
        }, 3000);
      } else {
        console.error('Erreur lors du résumé:', response.error);
        setSummarizeStatus({
          loading: false,
          message: response.error || 'Erreur lors de la création du résumé',
          error: true,
        });
      }
    });
  };

  const listKeyPoints = () => {
    setKeyPointsStatus({ loading: true });

    chrome.runtime.sendMessage({ type: 'LIST_KEY_POINTS_REQUEST' }, response => {
      if (chrome.runtime.lastError) {
        console.error("Erreur lors de l'envoi du message:", chrome.runtime.lastError);
        setKeyPointsStatus({
          loading: false,
          message: "Erreur de communication avec l'extension",
          error: true,
        });
        return;
      }

      if (response.success) {
        console.log('Points clés générés:', response.keyPoints);
        setKeyPointsStatus({
          loading: false,
          message: 'Points clés créés et sauvegardés dans vos notes !',
        });

        // Optionnel: après quelques secondes, effacer le message
        setTimeout(() => {
          setKeyPointsStatus({ loading: false });
        }, 3000);
      } else {
        console.error('Erreur lors de la génération des points clés:', response.error);
        setKeyPointsStatus({
          loading: false,
          message: response.error || 'Erreur lors de la création des points clés',
          error: true,
        });
      }
    });
  };

  const sendCustomPrompt = () => {
    // Vérifier que le prompt n'est pas vide
    if (!customPrompt || customPrompt.trim().length === 0) {
      setCustomPromptStatus({
        loading: false,
        message: 'Le prompt ne peut pas être vide',
        error: true,
      });
      return;
    }

    setCustomPromptStatus({ loading: true });

    chrome.runtime.sendMessage(
      {
        type: 'CUSTOM_PAGE_PROMPT_REQUEST',
        userPrompt: customPrompt,
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error("Erreur lors de l'envoi du message:", chrome.runtime.lastError);
          setCustomPromptStatus({
            loading: false,
            message: "Erreur de communication avec l'extension",
            error: true,
          });
          return;
        }

        if (response.success) {
          console.log('Résultat généré:', response.result);
          setCustomPromptStatus({
            loading: false,
            message: 'Résultat créé et sauvegardé dans vos notes !',
          });

          // Optionnel: après quelques secondes, effacer le message
          setTimeout(() => {
            setCustomPromptStatus({ loading: false });
          }, 3000);
        } else {
          console.error('Erreur lors du traitement du prompt:', response.error);
          setCustomPromptStatus({
            loading: false,
            message: response.error || 'Erreur lors du traitement du prompt',
            error: true,
          });
        }
      },
    );
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'} shadow-sm`}>
        <div className="flex justify-between items-center w-full px-4 py-2">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🦤</span>
            <h1 className="text-lg font-semibold">DoDai</h1>
          </div>
          <button
            className="px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50 transition-colors"
            onClick={goToOptions}>
            Options
          </button>
        </div>
      </header>

      <div className="p-4 flex flex-col space-y-4">
        {/* Boutons d'action principaux */}
        <div className="grid grid-cols-1 gap-3">
          <button
            className={`w-full py-3 px-4 rounded-lg ${
              summarizeStatus.loading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium transition-colors shadow-sm flex items-center justify-center`}
            onClick={summarizePage}
            disabled={summarizeStatus.loading}>
            {summarizeStatus.loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 3a1 1 0 100 2h12a1 1 0 100-2H4zm0 4a1 1 0 100 2h12a1 1 0 100-2H4z"
                    clipRule="evenodd"
                  />
                </svg>
                Résumer cette page
              </>
            )}
          </button>

          {summarizeStatus.message && (
            <div
              className={`text-sm p-2 rounded ${
                summarizeStatus.error
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
              {summarizeStatus.message}
            </div>
          )}

          <button
            className={`w-full py-3 px-4 rounded-lg ${
              keyPointsStatus.loading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white font-medium transition-colors shadow-sm flex items-center justify-center`}
            onClick={listKeyPoints}
            disabled={keyPointsStatus.loading}>
            {keyPointsStatus.loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM4 11a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM4 15a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1z" />
                </svg>
                Lister les points clés
              </>
            )}
          </button>

          {keyPointsStatus.message && (
            <div
              className={`text-sm p-2 rounded ${
                keyPointsStatus.error
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
              {keyPointsStatus.message}
            </div>
          )}
        </div>

        {/* Section prompt personnalisé */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label
            htmlFor="custom-prompt"
            className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Prompt personnalisé
          </label>
          <textarea
            id="custom-prompt"
            rows={3}
            className={`w-full p-2 border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
            placeholder="Entrez votre prompt personnalisé..."
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            disabled={customPromptStatus.loading}
          />
          <button
            className={`mt-2 w-full py-2 px-4 rounded-md ${
              customPromptStatus.loading ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
            } text-white font-medium transition-colors shadow-sm flex items-center justify-center`}
            onClick={sendCustomPrompt}
            disabled={customPromptStatus.loading}>
            {customPromptStatus.loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Traitement en cours...
              </>
            ) : (
              'Envoyer'
            )}
          </button>

          {customPromptStatus.message && (
            <div
              className={`mt-2 text-sm p-2 rounded ${
                customPromptStatus.error
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
              {customPromptStatus.message}
            </div>
          )}
        </div>

        {/* Bouton pour voir les notes */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            className="w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium transition-colors shadow-sm flex items-center justify-center"
            onClick={openNotesPage}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            Voir mes notes
          </button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(Popup, <div className="flex h-screen w-full items-center justify-center">Loading...</div>),
  <div className="p-4 text-red-500">Une erreur est survenue</div>,
);
