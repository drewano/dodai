import baseConfig from '@extension/tailwindcss-config';
import { withUI } from '@extension/ui';
import type { Config } from 'tailwindcss';

export default withUI({
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#1e293b', // Couleur intermédiaire entre slate-800 et slate-900
        },
      },
    },
  },
} as Config);
