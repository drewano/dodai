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
        background: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          quaternary: 'var(--color-bg-quaternary)',
          accent: 'var(--color-bg-accent)',
          'accent-hover': 'var(--color-bg-accent-hover)',
          destructive: 'var(--color-bg-destructive)',
          'destructive-hover': 'var(--color-bg-destructive-hover)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          accent: 'var(--color-text-accent)',
          inverted: 'var(--color-text-inverted)',
          destructive: 'var(--color-text-destructive)',
          success: 'var(--color-text-success)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          accent: 'var(--color-border-accent)',
        },
        slate: {
          825: '#263246',
          850: 'var(--color-bg-secondary)',
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: 'var(--color-text-secondary)',
            a: {
              color: 'var(--color-text-accent)',
              '&:hover': {
                color: theme('colors.blue.300'),
              },
            },
            code: {
              color: theme('colors.sky.400'),
              backgroundColor: theme('colors.slate.700'),
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'pre code': {
              color: 'inherit',
              backgroundColor: 'transparent',
              padding: '0',
              borderRadius: '0',
              fontWeight: 'inherit',
            },
            pre: {
              backgroundColor: theme('colors.slate.800'),
              color: theme('colors.slate.200'),
              padding: theme('spacing.4'),
              borderRadius: theme('borderRadius.md'),
            },
            strong: {
              color: 'var(--color-text-primary)',
            },
            h1: { color: 'var(--color-text-primary)' },
            h2: { color: 'var(--color-text-primary)' },
            h3: { color: 'var(--color-text-primary)' },
            h4: { color: 'var(--color-text-primary)' },
          },
        },
      }),
    },
  },
  plugins: [typography],
} as Config);
