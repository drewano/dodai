import type React from 'react';
import { useState } from 'react';
import type { ChatConversation } from '@extension/storage';
import { XIcon, Trash2Icon, Edit3Icon, CheckIcon, XCircleIcon, PlusIcon } from 'lucide-react';

interface DodaiCanvasHistoryPanelProps {
  chatHistory: ChatConversation[];
  activeConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newName: string) => Promise<void>;
  onNewConversation?: () => void;
  onClose: () => void;
}

/**
 * Panneau pour afficher l'historique des conversations dans Dodai Canvas.
 */
export const DodaiCanvasHistoryPanel: React.FC<DodaiCanvasHistoryPanelProps> = ({
  chatHistory,
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
  onRenameConversation,
  onNewConversation,
  onClose,
}) => {
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [originalName, setOriginalName] = useState<string>('');

  const handleStartEdit = (conversation: ChatConversation) => {
    setEditingConversationId(conversation.id);
    setEditingName(conversation.name);
    setOriginalName(conversation.name);
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingName('');
    setOriginalName('');
  };

  const handleRenameSubmit = async () => {
    if (editingConversationId && editingName.trim() && editingName.trim() !== originalName) {
      await onRenameConversation(editingConversationId, editingName.trim());
    }
    handleCancelEdit();
  };

  return (
    <div className="absolute inset-0 bg-background-tertiary text-text-primary shadow-xl flex flex-col z-20">
      {/* En-tête du panneau */}
      <div className="p-3 flex justify-between items-center border-b border-border-primary flex-shrink-0">
        <h3 className="text-base font-semibold text-text-primary">Historique des Chats</h3>
        <div className="flex items-center gap-2">
          {onNewConversation && (
            <button
              className="p-1.5 text-text-secondary hover:text-green-400 rounded-md hover:bg-background-quaternary"
              onClick={onNewConversation}
              title="Nouvelle conversation">
              <PlusIcon size={18} />
            </button>
          )}
          <button
            className="p-1.5 text-text-secondary hover:text-text-accent rounded-md hover:bg-background-quaternary"
            onClick={onClose}
            title="Fermer l'historique">
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {chatHistory && chatHistory.length > 0 ? (
          [...chatHistory]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(conversation => (
              <div
                key={conversation.id}
                className={`flex items-center justify-between p-2 rounded-lg group transition-colors duration-150 hover:bg-background-quaternary ${editingConversationId === conversation.id ? 'bg-slate-700' : activeConversationId === conversation.id ? 'bg-blue-600 bg-opacity-30' : ''}`}>
                {editingConversationId === conversation.id ? (
                  <div className="flex-1 flex items-center gap-2 mr-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameSubmit();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm bg-background-primary border border-border-accent rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                      maxLength={100}
                    />
                    <button
                      onClick={handleRenameSubmit}
                      className="p-1.5 text-green-500 hover:text-green-400 rounded-md hover:bg-slate-700"
                      title="Confirmer">
                      <CheckIcon size={16} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 text-red-500 hover:text-red-400 rounded-md hover:bg-slate-700"
                      title="Annuler">
                      <XCircleIcon size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    className={`flex-1 text-left px-2 py-1.5 truncate text-sm ${activeConversationId === conversation.id ? 'text-blue-300 font-semibold' : 'text-text-secondary group-hover:text-text-primary'}`}
                    onClick={() => onLoadConversation(conversation.id)}
                    title={conversation.name}>
                    {conversation.name || 'Conversation sans nom'}
                  </button>
                )}

                {editingConversationId !== conversation.id && (
                  <div className="flex items-center shrink-0">
                    <button
                      className="p-1.5 text-text-muted hover:text-blue-400 rounded-md hover:bg-slate-700 opacity-60 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEdit(conversation)}
                      title="Renommer la conversation">
                      <Edit3Icon size={16} />
                    </button>
                    <button
                      className="p-1.5 text-text-muted hover:text-red-500 rounded-md hover:bg-slate-700 opacity-60 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Êtes-vous sûr de vouloir supprimer la conversation "${conversation.name || 'Conversation sans nom'}" ? Cette action est irréversible.`,
                          )
                        ) {
                          onDeleteConversation(conversation.id);
                        }
                      }}
                      title="Supprimer la conversation">
                      <Trash2Icon size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="text-text-muted text-sm text-center py-4">Aucune conversation dans l'historique.</div>
        )}
      </div>
    </div>
  );
};

export default DodaiCanvasHistoryPanel;
