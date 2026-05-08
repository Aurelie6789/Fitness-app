// Raw design tokens — use in SVG props, inline styles, and non-Tailwind code.
// Tailwind classes are the primary API; import these only when Tailwind can't help
// (e.g. SVG stroke/fill colors, dynamic boxShadow strings).

export const T = {
  bg:       '#0E0D0B',
  surface:  '#171512',
  elevated: '#211E1A',
  inset:    '#080706',

  fg:      '#F5F1E8',
  fgMid:   'rgba(245,241,232,0.62)',
  fgDim:   'rgba(245,241,232,0.38)',
  fgFaint: 'rgba(245,241,232,0.18)',

  hairline:  'rgba(255,245,225,0.07)',
  hairline2: 'rgba(255,245,225,0.13)',

  accent:     '#9FE6B5',
  accentDeep: '#5DC98A',
  accentInk:  '#0E0D0B',
  accentTint: 'rgba(159,230,181,0.08)',
  accentGlow: 'rgba(159,230,181,0.4)',

  coral: '#FF6A4D',
  amber: '#FFB23A',
} as const;
