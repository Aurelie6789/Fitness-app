const path = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src') + '/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0E0D0B',
        surface:  '#171512',
        elevated: '#211E1A',
        inset:    '#080706',
        fg:       '#F5F1E8',
        'fg-mid':   'var(--c-fg-mid)',
        'fg-dim':   'var(--c-fg-dim)',
        'fg-faint': 'var(--c-fg-faint)',
        hairline:  'var(--c-hairline)',
        hairline2: 'var(--c-hairline2)',
        accent:        '#9FE6B5',
        'accent-deep': '#5DC98A',
        'accent-ink':  '#0E0D0B',
        'accent-tint': 'var(--c-accent-tint)',
        coral: '#FF6A4D',
        amber: '#FFB23A',
      },
      fontFamily: {
        display:   ['Anton', 'Helvetica Neue', 'sans-serif'],
        tight:     ['"Inter Tight"', 'Inter', '-apple-system', 'sans-serif'],
        mono:      ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        editorial: ['"Playfair Display"', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        'card-sm': '16px',
        card:      '22px',
        'card-lg': '28px',
        pill:      '999px',
        tab:       '26px',
      },
      boxShadow: {
        'accent-glow': '0 4px 14px rgba(159,230,181,0.4)',
        'dot-glow':    '0 0 10px #9FE6B5',
        tab:           '0 12px 30px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
}
