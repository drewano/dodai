import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Artifact } from '../types';

interface DodaiContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  artifact: Artifact;
  setArtifact: React.Dispatch<React.SetStateAction<Artifact>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  sendMessage: (content: string, forceNewArtifact?: boolean) => Promise<void>;
}

const defaultContext: DodaiContextType = {
  messages: [],
  setMessages: () => {},
  input: '',
  setInput: () => {},
  artifact: {
    type: 'text',
    title: 'Bienvenue',
    fullMarkdown: '',
  },
  setArtifact: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sendMessage: async () => {},
};

const DodaiContext = createContext<DodaiContextType>(defaultContext);

export const useDodai = () => useContext(DodaiContext);

interface DodaiProviderProps {
  children: ReactNode;
}

export const DodaiProvider: React.FC<DodaiProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant Dodai Canvas. Comment puis-je vous aider aujourd'hui ?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [artifact, setArtifact] = useState<Artifact>({
    type: 'text',
    title: 'Bienvenue sur Dodai Canvas',
    fullMarkdown:
      '# Bienvenue sur Dodai Canvas\n\nCet espace vous permet de créer et éditer du contenu Markdown.\n\n## Fonctionnalités\n\n- Édition Markdown\n- Prévisualisation en temps réel\n- Support de la syntaxe GitHub Flavored Markdown\n\n```javascript\n// Exemple de code\nfunction helloWorld() {\n  console.log("Hello, Dodai!");\n}\n```',
  });
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string, forceNewArtifact: boolean = false) => {
    // Ignorer les messages vides
    if (!content.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Vider le champ de saisie
    setIsLoading(true);

    try {
      // Préparer l'historique des messages pour l'envoi au service worker
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Déterminer s'il s'agit d'une génération initiale ou d'une modification
      // Si l'artefact a déjà un contenu non vide et qu'on ne force pas une nouvelle génération, c'est une modification
      const hasExistingContent =
        artifact.type === 'text'
          ? (artifact as { fullMarkdown: string }).fullMarkdown.trim().length > 0
          : (artifact as { code: string }).code.trim().length > 0;

      const shouldModify = hasExistingContent && !forceNewArtifact;

      // Définir le type de requête et les données à envoyer
      const messageType = shouldModify
        ? 'MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST'
        : 'GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST';

      // Construire la requête de base
      const request: Record<string, unknown> = {
        type: messageType,
        prompt: content,
        history: chatHistory,
      };

      // Si c'est une modification, ajouter le contenu actuel de l'artefact
      if (shouldModify) {
        request.currentArtifact =
          artifact.type === 'text'
            ? (artifact as { fullMarkdown: string }).fullMarkdown
            : (artifact as { code: string }).code;
        request.artifactType = artifact.type;
      }

      // Envoyer la requête au service worker
      const response = await chrome.runtime.sendMessage(request);

      if (response.success && response.artifact) {
        // Mettre à jour l'artefact avec le contenu généré ou modifié
        if (forceNewArtifact || !hasExistingContent) {
          // Pour un nouvel artefact, définir le type comme text par défaut
          setArtifact({
            type: 'text',
            title: forceNewArtifact ? 'Nouvel artefact' : 'Artefact généré',
            fullMarkdown: response.artifact,
          });
        } else if (artifact.type === 'text') {
          // Pour une modification d'un artefact text existant
          setArtifact({
            ...artifact,
            fullMarkdown: response.artifact,
          });
        } else if (artifact.type === 'code') {
          // Pour une modification d'un artefact code existant
          setArtifact({
            ...artifact,
            code: response.artifact,
          });
        }

        // Ajouter la réponse de l'assistant
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: shouldModify
            ? "J'ai modifié l'artefact selon votre demande. Vous pouvez consulter les changements dans le panneau de droite."
            : "J'ai généré un nouvel artefact basé sur votre demande. Vous pouvez le consulter dans le panneau de droite.",
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Gérer les erreurs
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `Désolé, je n'ai pas pu ${shouldModify ? 'modifier' : 'générer'} l'artefact : ${response.error || "Une erreur s'est produite."}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Erreur lors de la communication avec le service worker:', error);
      // Ajouter un message d'erreur
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "Une erreur s'est produite lors de la communication avec le service worker. Veuillez réessayer.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    messages,
    setMessages,
    input,
    setInput,
    artifact,
    setArtifact,
    isLoading,
    setIsLoading,
    sendMessage,
  };

  return <DodaiContext.Provider value={value}>{children}</DodaiContext.Provider>;
};
