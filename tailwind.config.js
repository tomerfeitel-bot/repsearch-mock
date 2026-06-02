/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#6366f1',
        // Progress page warm palette
        warm: {
          bg: '#ddd0c2',
          card: '#e8ddd0',
          border: '#d4c8b8',
          push: '#b85c38',
          pull: '#5a7a90',
          legs: '#6a8a5a',
        },
        // Study page accent (sage green)
        study: {
          accent: '#7CA982',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
}
