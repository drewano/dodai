import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils'; // Assuming cn utility is in ../utils

interface FloatingTextActionProps {
  isVisible: boolean;
  top: number;
  left: number;
  onSubmit: (instructions: string) => void;
  onCancel: () => void;
  initialButtonContent?: React.ReactNode;
  zIndex?: number;
  isLoading?: boolean; // Optional loading state
}

const FloatingTextAction: React.FC<FloatingTextActionProps> = ({
  isVisible,
  top,
  left,
  onSubmit,
  onCancel,
  initialButtonContent,
  zIndex = 1000, // Default z-index
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [instructions, setInstructions] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isVisible) {
      setIsExpanded(false);
      setInstructions('');
    }
  }, [isExpanded, isVisible]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (instructions.trim() && !isLoading) {
      onSubmit(instructions);
      // Optionally, collapse after submit:
      // setIsExpanded(false);
      // setInstructions('');
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setInstructions('');
    onCancel();
  };

  const handleInitialButtonClick = () => {
    setIsExpanded(true);
  };

  if (!isVisible) {
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className={cn(
        'absolute p-1.5 rounded-lg shadow-xl bg-slate-700 dark:bg-slate-800 border border-slate-600 dark:border-slate-700 text-white transition-all duration-150 ease-in-out flex items-center space-x-2',
        isExpanded ? 'w-auto min-w-[280px]' : 'w-auto',
      )}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        zIndex: zIndex,
      }}
      onClick={e => e.stopPropagation()} // Prevent clicks inside from propagating
      role="dialog"
      aria-modal="false"
      aria-label="Floating text input actions"
      tabIndex={-1}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
        } else if (e.key === 'Escape') {
          handleCancel();
          e.stopPropagation();
        }
      }}>
      {!isExpanded ? (
        <button
          onClick={handleInitialButtonClick}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-colors"
          aria-label="Ask Dodai">
          {initialButtonContent || (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L21 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09l-2.846.813.813 2.846a4.5 4.5 0 0 0 3.09 3.09L21 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09Z"
              />
            </svg>
          )}
        </button>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex-grow">
            <input
              ref={inputRef}
              type="text"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Instructions..."
              className="w-full px-3 py-1.5 text-sm bg-slate-600 dark:bg-slate-700 border border-slate-500 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-400 text-slate-100 dark:text-slate-50"
              disabled={isLoading}
            />
          </form>
          <button
            onClick={handleSubmit}
            disabled={!instructions.trim() || isLoading}
            className="px-3 py-1.5 text-sm rounded-md bg-green-500 hover:bg-green-600 disabled:bg-slate-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 transition-colors flex items-center">
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ...
              </>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-md bg-slate-500 hover:bg-slate-400 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-50 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default FloatingTextAction;
