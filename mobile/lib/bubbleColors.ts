// Port of src/lib/bubbleColors.js — the shared categorical hue palette. The
// label hash must stay identical so a topic keeps its color across web/native.
export type BubbleHue = {
  key: string;
  fill: string;
  on: string;
  ink: string;
  text: string;
  tint: string;
};

export const BUBBLE_HUES: BubbleHue[] = [
  { key: 'green', fill: '#0B7A43', on: '#ffffff', ink: '#34BE73', text: '#34BE73', tint: 'rgba(11, 122, 67, 0.16)' },
  { key: 'teal', fill: '#007661', on: '#ffffff', ink: '#44BFA5', text: '#44BFA5', tint: 'rgba(0, 118, 97, 0.16)' },
  { key: 'blue', fill: '#2D6DA5', on: '#ffffff', ink: '#5CABF2', text: '#5CABF2', tint: 'rgba(45, 109, 165, 0.16)' },
  { key: 'violet', fill: '#7B5AAE', on: '#ffffff', ink: '#B38EF1', text: '#B38EF1', tint: 'rgba(123, 90, 174, 0.16)' },
  { key: 'berry', fill: '#AB4477', on: '#ffffff', ink: '#EA7AAE', text: '#EA7AAE', tint: 'rgba(171, 68, 119, 0.16)' },
  { key: 'amber', fill: '#B48226', on: '#0c0c0c', ink: '#F2B036', text: '#F2B036', tint: 'rgba(180, 130, 38, 0.16)' },
];

// Deterministic hash so a given topic label always maps to the same hue.
export function hueForLabel(label = ''): BubbleHue {
  const s = String(label);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return BUBBLE_HUES[Math.abs(h) % BUBBLE_HUES.length];
}

// SOLID colored chip style for a label. RN style keys instead of CSS.
export function labelStyle(label: string) {
  const h = hueForLabel(label);
  return { backgroundColor: h.fill, color: h.on };
}
