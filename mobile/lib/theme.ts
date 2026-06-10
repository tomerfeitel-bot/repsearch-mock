// JS mirror of the web app's CSS design tokens (src/index.css :root). The web
// app reads these as CSS variables in inline styles; on native we import this
// object instead. Keep in sync with src/index.css.
export const colors = {
  bg: '#08090a',
  surface: '#141615',
  surfaceAlt: '#1e221f',
  border: '#363c37',
  borderStrong: '#4a514b',
  text: '#f3f5f1',
  textMuted: '#aab3ab',
  inkSoft: '#7f897f',
  accent: '#f3f5f1',
  accentInk: '#16191a',
  accentSoft: 'rgba(26, 29, 27, 0.92)',
  positive: '#506343',
  negative: '#9b463d',
  brass: '#d59a3a',
  brassSoft: 'rgba(213, 154, 58, 0.16)',
  heroFade: 'rgba(213, 154, 58, 0.23)',
  azure: '#2d6da5',
  azureInk: '#5cabf2',
  azureSoft: 'rgba(45, 109, 165, 0.16)',
  emerald: '#0B7A43',
  emeraldHover: '#0E8E4E',
  emeraldInk: '#34BE73',
  emeraldSoft: 'rgba(11, 122, 67, 0.16)',
  onEmerald: '#ffffff',
} as const;

// Aliases matching the web's --brand*/--moss* variables.
export const brand = {
  brand: colors.emerald,
  brandHover: colors.emeraldHover,
  brandInk: colors.emeraldInk,
  onBrand: colors.onEmerald,
} as const;

export const radius = 18;
