/**
 * Utilitaire de logging pour le service worker de l'extension.
 * Permet de centraliser et standardiser les logs avec différents niveaux.
 */

// Configuration du logger
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
  prefix: string;
  enabled: boolean;
}

// Niveaux de log et leurs valeurs numériques pour la comparaison
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configuration par défaut - ajustable via des fonctions
let config: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  prefix: '[MCP Background]',
  enabled: true,
};

/**
 * Enregistre un message de débogage (niveau le plus détaillé)
 */
export function debug(message: string, ...args: any[]): void {
  logWithLevel('debug', message, ...args);
}

/**
 * Enregistre un message d'information (opérations normales)
 */
export function info(message: string, ...args: any[]): void {
  logWithLevel('info', message, ...args);
}

/**
 * Enregistre un avertissement (problème potentiel mais non bloquant)
 */
export function warn(message: string, ...args: any[]): void {
  logWithLevel('warn', message, ...args);
}

/**
 * Enregistre une erreur (problème sérieux nécessitant attention)
 */
export function error(message: string, ...args: any[]): void {
  logWithLevel('error', message, ...args);
}

/**
 * Active ou désactive les logs
 */
export function setEnabled(enabled: boolean): void {
  config.enabled = enabled;
}

/**
 * Définit le niveau minimum des logs à afficher
 */
export function setMinLevel(level: LogLevel): void {
  config.minLevel = level;
}

/**
 * Définit le préfixe pour tous les messages
 */
export function setPrefix(prefix: string): void {
  config.prefix = prefix;
}

/**
 * Fonction interne pour effectuer le log avec le niveau spécifié
 */
function logWithLevel(level: LogLevel, message: string, ...args: any[]): void {
  if (!config.enabled || LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[config.minLevel]) {
    return;
  }

  const formattedMessage = `${config.prefix} ${message}`;

  switch (level) {
    case 'debug':
      console.log(formattedMessage, ...args);
      break;
    case 'info':
      console.log(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
  }
}

// Exportation d'un objet logger pour une utilisation plus fluide
export const logger = {
  debug,
  info,
  warn,
  error,
  setEnabled,
  setMinLevel,
  setPrefix,
};

export default logger;
