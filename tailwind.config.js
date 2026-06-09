/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Rubber Brass re-theme. The app was authored dark (gray-950 canvas,
        // indigo accent). We invert the gray ramp to a light "gym hardware"
        // surface ramp and point the accent scales at graphite + brass, so the
        // hundreds of existing utility classes flip to the light palette with
        // no per-class edits. Hex (not var()) so Tailwind /opacity modifiers
        // (e.g. bg-gray-950/95, bg-indigo-600/15) keep generating valid colors.
        brand: '#242825',
        // Inverted neutral ramp: low shades = dark ink (were light text),
        // high shades = light surfaces (were dark backgrounds).
        gray: {
          50:  '#ffffff',
          100: '#f3f5f1', // --text
          200: '#e2e7e0',
          300: '#c5cdc4',
          400: '#8a948c', // --ink-soft (dim text, hints)
          500: '#aab3ab', // --text-muted
          600: '#6b746d', // dividers / dimmest text
          700: '#4a514b', // --border-strong (off-track, strong borders)
          750: '#3a403b', // hover surface
          800: '#363c37', // --border (borders + dark button surface)
          850: '#2a2f2b', // hover surface
          900: '#141615', // --surface (cards)
          950: '#08090a', // --bg (dark page base)
        },
        // Accent scale → graphite, with brass for the lighter "accent text" shades.
        indigo: {
          100: '#ece9e3',
          200: '#e8c074', // brass ink (Dark Jewel) — link text on dark
          300: '#e8c074', // brass ink — link / hover
          400: '#f3f5f1', // active nav, links, focus border (light on dark)
          500: '#242825', // --accent (primary button fill; keeps white labels)
          600: '#242825', // --accent (primary buttons; keeps white labels)
          700: '#0d0f0e', // pressed
        },
        // Semantic scales retuned so /15-style tints + -300 text read on light.
        emerald: {
          300: '#2f6e4a', 400: '#2f6e4a', 500: '#506343', 600: '#506343',
        },
        amber: {
          300: '#b07a1e', 400: '#b07a1e', 500: '#d59a3a', 600: '#d59a3a',
        },
        sky: {
          300: '#2b6a86', 400: '#2b6a86', 500: '#3f7da0', 600: '#3f7da0',
        },
        // Upvote accent (Reddit-style). 600 kept default for Avatar fills.
        orange: {
          300: '#c2410c', 400: '#c2410c',
        },
        red: {
          300: '#9b463d', 400: '#9b463d', 500: '#9b463d', 600: '#9b463d',
          900: '#c98f88', 950: '#f0e3e1',
        },
        // Progress page warm palette
        warm: {
          bg: '#ddd0c2',
          card: '#e8ddd0',
          border: '#d4c8b8',
          push: '#b85c38',
          pull: '#5a7a90',
          legs: '#6a8a5a',
        },
        // Study page accent (Dark Jewel pine/teal)
        study: {
          accent: '#6fcab8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      // Rubber Brass type scale. Fixed rem, ~1.12–1.2 ratio (product UI, not
      // fluid). Lower steps are dense metadata; reading prose sits at 16px;
      // headings carry baked line-height and progressively tighter tracking so
      // the same role looks identical across the feed and the thread. Weight is
      // applied separately via font-* utilities, so these steps stay reusable.
      fontSize: {
        micro:   ['0.6875rem', { lineHeight: '0.95rem' }],                            // 11 — badges, counts, status
        caption: ['0.75rem',   { lineHeight: '1.05rem' }],                            // 12 — timestamps, secondary meta
        meta:    ['0.8125rem', { lineHeight: '1.25rem' }],                            // 13 — dense secondary, prompts
        body:    ['0.9375rem', { lineHeight: '1.45rem' }],                            // 15 — compact body / previews
        read:    ['1rem',      { lineHeight: '1.6rem' }],                             // 16 — reading prose (post + comment)
        title:   ['1.0625rem', { lineHeight: '1.35rem', letterSpacing: '-0.012em' }], // 17 — card lead
        head:    ['1.1875rem', { lineHeight: '1.4rem',  letterSpacing: '-0.017em' }], // 19 — section heading
        lead:    ['1.3125rem', { lineHeight: '1.55rem', letterSpacing: '-0.02em' }],  // 21 — thread post title
        display: ['1.5rem',    { lineHeight: '1.7rem',  letterSpacing: '-0.022em' }], // 24 — page title
      },
    },
  },
  plugins: [],
}
