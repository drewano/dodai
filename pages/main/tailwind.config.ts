import baseConfig from '@extension/tailwindcss-config';
import { withUI } from '@extension/ui';
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

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
      typography: {
        DEFAULT: {
          css: {
            color: '#94a3b8',
            a: {
              color: '#3b82f6',
              '&:hover': {
                color: '#60a5fa',
              },
            },
            code: {
              color: '#60a5fa',
            },
            'pre code': {
              color: 'inherit',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} as Config);
