# Dodai - Votre Cerveau Augmenté par l'IA

**Dodai** est une extension de navigateur open-source conçue pour être votre second cerveau. Elle combine un puissant système de gestion de connaissances personnelles (PKM) avec des capacités d'intelligence artificielle locales, fonctionnant grâce à [Ollama](https://ollama.com/). Capturez, organisez, et interagissez avec vos informations comme jamais auparavant, directement depuis votre navigateur.

[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version du projet](https://img.shields.io/badge/version-0.4.3-brightgreen.svg)]()

![screenshot_placeholder](https://github.com/drewano/dodai/blob/main/screenshot/Capture%20d'%C3%A9cran%202025-06-08%20160810.png)

## ✨ Fonctionnalités Principales

### 🧠 **Dodai Canvas** : Un Espace de Travail Génératif
Le cœur de l'application. Le Canvas est un environnement interactif où vous dialoguez avec l'IA pour créer des "artefacts" :
- **Génération de Contenu** : Demandez à l'IA de rédiger des articles, des poèmes, des résumés ou tout autre type de document Markdown.
- **Modification Itérative** : Affinez et modifiez les artefacts générés avec des instructions en langage naturel (ex: "rends ce texte plus concis", "adopte un ton plus professionnel").
- **Historique des Versions** : Chaque modification crée une nouvelle version de l'artefact, vous permettant de naviguer et de revenir à des états précédents.

### 📝 **Gestionnaire de Notes Avancé**
Un système de gestion de connaissances (PKM) complet, directement dans votre navigateur.
- **Éditeur Riche** : Un éditeur de notes basé sur BlockNote, offrant une expérience d'édition moderne et fluide.
- **Organisation Hiérarchique** : Organisez vos notes dans une arborescence de dossiers avec une profondeur illimitée.
- **Système de Tags** : Taguez vos notes pour une organisation transversale et retrouvez facilement l'information.
- **Graphe de Tags Interactif** : Visualisez les connexions entre vos notes grâce à un graphe de tags dynamique.
- **Import/Export** : Sauvegardez et restaurez vos notes aux formats JSON ou Markdown (ZIP).

![screenshot_placeholder](https://github.com/drewano/dodai/blob/main/screenshot/Capture%20d'%C3%A9cran%202025-06-08%20160942.png)

### 💬 **Assistant IA Intégré (Side Panel)**
Discutez avec votre assistant IA à tout moment depuis le panneau latéral du navigateur.
- **Chat Contextuel** : L'assistant peut utiliser le contenu de la page que vous consultez pour fournir des réponses plus pertinentes.
- **Raisonnement de l'IA** : Visualisez les étapes de pensée de l'agent pour comprendre comment il arrive à ses conclusions.
- **Sauvegarde en Note** : Transformez n'importe quelle réponse de l'assistant en une nouvelle note en un seul clic.

### 🔍 **Recherche Augmentée par la Génération (RAG)**
Conversez directement avec vos notes !
- **Mode "Mémoire"** : Activez le mode RAG pour que l'assistant base ses réponses sur le contenu de votre base de notes personnelles.
- **Sources Citées** : L'assistant indique quelles notes ont été utilisées pour formuler sa réponse, vous permettant de vérifier et d'approfondir.

### 🛠️ **Outils Extensibles (MCP)**
Augmentez les capacités de votre IA en la connectant à des outils externes via le **Model Context Protocol (MCP)**.
- **Configuration Facile** : Ajoutez des serveurs MCP depuis la page d'options pour donner à votre agent l'accès à de nouvelles capacités (ex: interagir avec le système de fichiers local, appeler des APIs, etc.).
- **Découverte Automatique** : Les outils disponibles sont automatiquement découverts et mis à disposition de l'agent.

### ✍️ **Assistance à la Rédaction Inline**
Obtenez des suggestions d'autocomplétion basées sur l'IA directement dans les champs de texte de n'importe quelle page web.
- **Suggestions Contextuelles** : L'IA analyse le texte que vous écrivez, ainsi que le contenu de la page, pour proposer des complétions pertinentes.
- **Acceptation Simple** : Acceptez les suggestions d'une simple combinaison de touches (Ctrl+Espace).

### 🌐 **Capture Web Intelligente**
Sauvegardez du contenu depuis n'importe quelle page web grâce au menu contextuel.
- **Sauvegarde de Sélection** : Sélectionnez du texte et sauvegardez-le directement dans une nouvelle note.
- **Sauvegarde de Page** : Capturez l'URL et le titre d'une page pour créer une note de référence.
- **Tagging Automatique par IA** : Lors de la capture, l'IA analyse le contenu et suggère automatiquement des tags pertinents pour une organisation sans effort.

---

## 🏗️ Architecture Technique

Le projet est structuré en **monorepo** géré avec `pnpm` et `Turbo`.

- **`chrome-extension/`**: Le cœur de l'extension, contenant le `manifest.ts` et le script d'arrière-plan (`background`). C'est ici que les services principaux comme `agent-service`, `mcp-service` et `rag-service` sont orchestrés.
- **`pages/`**: Contient les différentes vues (interfaces utilisateur) de l'extension, chacune étant une application Vite indépendante (Popup, Side Panel, Options, Canvas, Notes, etc.).
- **`packages/`**: Héberge le code partagé à travers le monorepo :
  - **`storage`**: Une abstraction robuste au-dessus de `chrome.storage` pour une gestion de données typée et réactive.
  - **`ui`**: Une bibliothèque de composants React partagés, construite avec TailwindCSS.
  - **`shared`**: Utilitaires et hooks partagés.
  - Et d'autres paquets pour la configuration (Vite, TSConfig, i18n, etc.).

---

## 🚀 Installation et Démarrage

Pour lancer ce projet en local, suivez ces étapes :

### Prérequis
1.  **Node.js** : `v22.12.0` ou supérieure.
2.  **pnpm** : `v9.15.1` ou supérieure.
3.  **Ollama** : [Installez Ollama](https://ollama.com/) sur votre machine.
4.  **Un modèle IA** : Téléchargez au moins un modèle.
    ```bash
    ollama pull llama3
    ```

### Étapes d'installation
1.  **Clonez le dépôt :**
    ```bash
    git clone https://github.com/votre-utilisateur/votre-repo.git
    cd votre-repo
    ```

2.  **Installez les dépendances :**
    ```bash
    pnpm install
    ```

3.  **Configurez l'environnement :**
    Copiez le fichier d'exemple `.env`. Aucune modification n'est nécessaire pour démarrer.
    ```bash
    cp .example.env .env
    ```

4.  **Lancez le build en mode développement :**
    Cette commande va construire l'extension et surveiller les changements de fichiers.
    ```bash
    pnpm dev
    ```

5.  **Chargez l'extension dans votre navigateur :**
    -   Ouvrez la page des extensions (`chrome://extensions` ou `edge://extensions`).
    -   Activez le "Mode développeur".
    -   Cliquez sur "Charger l'extension non empaquetée".
    -   Sélectionnez le dossier `dist` à la racine du projet.

---

## 📁 Structure du Projet

```
.
├── chrome-extension/   # Coeur de l'extension (background, services)
├── pages/              # Chaque sous-dossier est une UI de l'extension
│   ├── canvas/         # Espace de travail génératif
│   ├── notes/          # Interface de gestion des notes
│   ├── side-panel/     # Panneau latéral de chat
│   ├── popup/          # Popup de l'extension
│   └── ...             # Autres vues (options, etc.)
├── packages/           # Code partagé
│   ├── storage/        # Gestion du stockage
│   ├── ui/             # Composants React partagés
│   ├── shared/         # Hooks et utilitaires
│   └── ...             # Configurations (Vite, TypeScript, etc.)
└── ...
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Que ce soit pour rapporter un bug, proposer une nouvelle fonctionnalité ou soumettre une pull request, n'hésitez pas.

1.  Forkez le projet.
2.  Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-super-feature`).
3.  Commitez vos changements (`git commit -m 'Ajout de ma-super-feature'`).
4.  Poussez vers la branche (`git push origin feature/ma-super-feature`).
5.  Ouvrez une Pull Request.

---

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
