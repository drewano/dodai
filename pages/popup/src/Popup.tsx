import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useState } from 'react';
import { Settings, SendHorizontal, BookText, ExternalLink, PanelLeftOpen } from 'lucide-react';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  
  // États pour les différentes fonctionnalités
  const [customPromptText, setCustomPromptText] = useState('');
  const [summarizeStatus, setSummarizeStatus] = useState<{ loading: boolean; message?: string; error?: boolean }>({
    loading: false,
  });
  const [customPromptStatus, setCustomPromptStatus] = useState<{
    loading: boolean;
    message?: string;
    error?: boolean;
  }>({
    loading: false,
  });

  const goToOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleOpenCanvas = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('main/index.html#/canvas') });
  };

  const handleOpenSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].windowId) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
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

        // Effacer le message après quelques secondes
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

  const handleSendCustomPrompt = () => {
    // Vérifier que le prompt n'est pas vide
    if (!customPromptText || customPromptText.trim().length === 0) {
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
        userPrompt: customPromptText,
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

          // Effacer le message après quelques secondes
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
    <div className="min-w-[380px] max-w-[400px] w-full min-h-[500px] bg-gray-800 text-gray-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_15px_rgba(0,0,0,0.07),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-white/10">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-6 py-4 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="font-bold text-2xl tracking-[-0.5px] bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent pb-[1px]">
              DoDai
            </h1>
          </div>
          <button 
            onClick={goToOptions}
            className="text-gray-400 hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-gray-700/60"
          >
            <Settings className="text-xl" size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Custom Prompt Section */}
        <div>
          <label 
            htmlFor="custom-prompt" 
            className="block text-sm font-medium text-gray-400 mb-2"
          >
            Prompt personnalisé
          </label>
          <div className="flex items-stretch space-x-3">
            <textarea
              id="custom-prompt"
              rows={3}
              className="flex-grow bg-slate-700 text-gray-100 border border-gray-600 rounded-xl px-[18px] py-[14px] text-base transition-all duration-300 ease-out resize-none placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(74,144,226,0.2)] focus:bg-gray-700"
              placeholder="Entrez votre prompt créatif..."
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              disabled={customPromptStatus.loading}
            />
            <button 
              onClick={handleSendCustomPrompt}
              disabled={customPromptStatus.loading}
              className={`p-4 aspect-square ${
                customPromptStatus.loading 
                  ? 'bg-emerald-400 cursor-wait' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_10px_20px_-5px_rgba(16,185,129,0.35),0_6px_12px_-3px_rgba(16,185,129,0.25)]'
              } text-white border border-emerald-600 rounded-xl font-semibold transition-all duration-300 ease-out flex items-center justify-center shadow-[0_4px_14px_-1px_rgba(0,0,0,0.1),0_2px_8px_-1px_rgba(0,0,0,0.06)]`}
            >
              {customPromptStatus.loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <SendHorizontal size={22} />
              )}
            </button>
          </div>
          
          {/* Message d'état pour le custom prompt */}
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

        {/* Main Action Button */}
        <button 
          onClick={summarizePage}
          disabled={summarizeStatus.loading}
          className={`w-full ${
            summarizeStatus.loading
              ? 'bg-blue-400 cursor-wait'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_10px_20px_-5px_rgba(59,130,246,0.35),0_6px_12px_-3px_rgba(59,130,246,0.25)]'
          } text-white border border-blue-600 rounded-xl px-6 py-[14px] font-semibold transition-all duration-300 ease-out flex items-center justify-center shadow-[0_4px_14px_-1px_rgba(0,0,0,0.1),0_2px_8px_-1px_rgba(0,0,0,0.06)]`}
        >
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
              <BookText className="mr-3" size={22} />
              Résumer cette page
            </>
          )}
        </button>

        {/* Message d'état pour le résumé */}
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

        {/* Divider and Secondary Actions */}
        <div className="pt-4 space-y-4 border-t border-gray-600">
          <button 
            onClick={handleOpenCanvas}
            className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded-xl px-6 py-[14px] font-semibold transition-all duration-300 ease-out flex items-center justify-center shadow-[0_4px_14px_-1px_rgba(0,0,0,0.1),0_2px_8px_-1px_rgba(0,0,0,0.06)] hover:bg-gray-600 hover:text-white hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_10px_20px_-5px_rgba(74,85,104,0.25),0_6px_12px_-3px_rgba(74,85,104,0.15)]"
          >
            <ExternalLink className="mr-3" size={22} />
            Ouvrir Canvas
          </button>
          
          <button 
            onClick={handleOpenSidePanel}
            className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded-xl px-6 py-[14px] font-semibold transition-all duration-300 ease-out flex items-center justify-center shadow-[0_4px_14px_-1px_rgba(0,0,0,0.1),0_2px_8px_-1px_rgba(0,0,0,0.06)] hover:bg-gray-600 hover:text-white hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_10px_20px_-5px_rgba(74,85,104,0.25),0_6px_12px_-3px_rgba(74,85,104,0.15)]"
          >
            <PanelLeftOpen className="mr-3" size={22} />
            Ouvrir la sidebar
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
