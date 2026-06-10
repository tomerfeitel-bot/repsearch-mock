const { platformSelect } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mirror of the web app's "Rubber Brass" remap (tailwind.config.js in the
      // repo root) so className strings port from src/ verbatim. Keep the two
      // files in sync when the web palette changes.
      colors: {
        brand: '#242825',
        gray: {
          50: '#ffffff',
          100: '#f3f5f1', // --text
          200: '#e2e7e0',
          300: '#c5cdc4',
          400: '#8a948c', // --ink-soft (dim text, hints)
          500: '#aab3ab', // --text-muted
          600: '#6b746d', // dividers / dimmest text
          700: '#4a514b', // --border-strong
          750: '#3a403b',
          800: '#363c37', // --border
          850: '#2a2f2b',
          900: '#141615', // --surface (cards)
          950: '#08090a', // --bg (page base)
        },
        indigo: {
          100: '#ece9e3',
          200: '#e8c074',
          300: '#e8c074',
          400: '#f3f5f1',
          500: '#242825',
          600: '#242825',
          700: '#0d0f0e',
        },
        emerald: {
          300: '#2f6e4a', 400: '#2f6e4a', 500: '#506343', 600: '#506343',
        },
        amber: {
          300: '#b07a1e', 400: '#b07a1e', 500: '#d59a3a', 600: '#d59a3a',
        },
        sky: {
          300: '#2b6a86', 400: '#2b6a86', 500: '#3f7da0', 600: '#3f7da0',
        },
        orange: {
          300: '#c2410c', 400: '#c2410c',
        },
        red: {
          300: '#9b463d', 400: '#9b463d', 500: '#9b463d', 600: '#9b463d',
          900: '#c98f88', 950: '#f0e3e1',
        },
        warm: {
          bg: '#ddd0c2',
          card: '#e8ddd0',
          border: '#d4c8b8',
          push: '#b85c38',
          pull: '#5a7a90',
          legs: '#6a8a5a',
        },
        study: {
          accent: '#6fcab8',
        },
      },
      fontFamily: {
        sans: platformSelect({ ios: 'System', android: 'sans-serif', default: 'System' }),
        mono: platformSelect({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      },
      fontSize: {
        micro: ['11px', { lineHeight: '15px' }],
        caption: ['12px', { lineHeight: '17px' }],
        meta: ['13px', { lineHeight: '20px' }],
        body: ['15px', { lineHeight: '23px' }],
        read: ['16px', { lineHeight: '26px' }],
        title: ['17px', { lineHeight: '22px', letterSpacing: '-0.2px' }],
        head: ['19px', { lineHeight: '22px', letterSpacing: '-0.32px' }],
        lead: ['21px', { lineHeight: '25px', letterSpacing: '-0.42px' }],
        display: ['24px', { lineHeight: '27px', letterSpacing: '-0.53px' }],
      },
    },
  },
  plugins: [],
};
