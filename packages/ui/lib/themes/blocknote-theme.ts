import type { Theme } from '@blocknote/mantine';

// Define the custom dark theme for BlockNote
export const dodaiDarkTheme: Theme = {
  colors: {
    editor: {
      text: '#e2e8f0', // slate-200
      background: '#1e293b', // slate-850
    },
    menu: {
      text: '#e2e8f0', // slate-200
      background: '#0f172a', // slate-900
    },
    tooltip: {
      text: '#e2e8f0', // slate-200
      background: '#0f172a', // slate-900
    },
    hovered: {
      text: '#f1f5f9', // slate-100
      background: '#334155', // slate-700
    },
    selected: {
      text: '#f1f5f9', // slate-100
      background: '#2563eb', // blue-600 (accent for selection)
    },
    disabled: {
      text: '#475569', // slate-600
      background: '#1e293b', // slate-850
    },
    shadow: '#0f172a', // slate-900
    border: '#334155', // slate-700
    sideMenu: '#94a3b8', // slate-400 (for the drag handle)
    highlights: {
      gray: { text: '#e2e8f0', background: '#334155' }, // slate-200 on slate-700
      brown: { text: '#e2e8f0', background: '#78350f' }, // slate-200 on amber-800 (example)
      red: { text: '#e2e8f0', background: '#991b1b' }, // slate-200 on red-800 (example)
      orange: { text: '#e2e8f0', background: '#9a3412' }, // slate-200 on orange-800 (example)
      yellow: { text: '#1e293b', background: '#facc15' }, // slate-800 on yellow-400 (example)
      green: { text: '#e2e8f0', background: '#166534' }, // slate-200 on green-800 (example)
      blue: { text: '#e2e8f0', background: '#1e40af' }, // slate-200 on blue-800 (example)
      purple: { text: '#e2e8f0', background: '#581c87' }, // slate-200 on purple-800 (example)
      pink: { text: '#e2e8f0', background: '#9d174d' }, // slate-200 on pink-800 (example)
    },
  },
  borderRadius: 4,
  fontFamily:
    'Source Sans Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
};
