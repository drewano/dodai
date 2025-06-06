import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'example@example.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: [
    '<all_urls>',
    'http://localhost:11434/',
    'http://localhost:*/*', // Pour les serveurs MCP locaux SSE
    'https://localhost:*/*', // Pour les serveurs MCP locaux SSE en HTTPS
    'http://127.0.0.1:8080/', // Ajout explicite du serveur MCP à l'adresse 127.0.0.1:8080
  ],
  permissions: ['storage', 'scripting', 'tabs', 'notifications', 'sidePanel', 'contextMenus'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    128: 'icon-128.png',
  },
  devtools_page: 'devtools/index.html',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['inline-assist/index.js'],
      all_frames: true,
      run_at: 'document_end',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'main/index.html'],
      matches: ['*://*/*'],
    },
  ],
  side_panel: {
    default_path: 'side-panel/index.html',
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:11434/ https://localhost:11434/ http://localhost:*/* https://localhost:*/* http://127.0.0.1:*/* http://127.0.0.1:8080/ https://127.0.0.1:8080/;",
  },
} satisfies chrome.runtime.ManifestV3;

export default manifest;
