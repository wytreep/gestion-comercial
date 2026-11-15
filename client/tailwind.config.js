export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Azul corporativo: el acento principal del ERP.
        primary: {
          DEFAULT: '#0b5cab',
          light:   '#2f7fc1',
          hover:   '#084a8c',
          dark:    '#083a6e',
          50:      '#eef5fd',
          // Tinte claro para acentos sobre la barra lateral navy.
          invert:  '#7dd3fc',
        },
        // Barra lateral y superficies oscuras.
        navy: {
          DEFAULT: '#16232f',
          800:     '#1b2c3b',
          900:     '#121e29',
          950:     '#0c151d',
        },
        // Verde financiero para utilidades y flujo positivo.
        success: {
          DEFAULT: '#157347',
          light:   '#1f9d5c',
          dark:    '#0f5c39',
          soft:    '#e9f5ef',
          // Tinte claro para texto sobre superficies oscuras (navy).
          invert:  '#6ee7b7',
        },
        warning: {
          DEFAULT: '#b45309',
          light:   '#d97706',
          dark:    '#8f4207',
          soft:    '#fdf3e4',
          invert:  '#fcd34d',
        },
        danger: {
          DEFAULT: '#b42318',
          light:   '#d92d20',
          dark:    '#8f1c13',
          soft:    '#fdeceb',
          invert:  '#fca5a5',
        },
        emerald: { DEFAULT: '#047857' },
        teal:    { DEFAULT: '#0f766e', light: '#14b8a6' },
        // Superficies, líneas y jerarquía de texto.
        canvas:  '#eef1f5',
        line:    '#dfe4ea',
        ink:     '#1f2937',
        // Texto secundario legible (5.4:1 sobre blanco).
        muted:   '#5b6b7f',
        // Solo iconos decorativos y estados deshabilitados.
        subtle:  '#8a99ab',
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm:      '3px',
        md:      '5px',
        lg:      '7px',
        xl:      '9px',
      },
      boxShadow: {
        panel:    '0 1px 2px rgba(16, 24, 40, 0.05)',
        dropdown: '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      fontSize: {
        // Etiquetas, encabezados de tabla y metadatos. Mínimo legible del ERP.
        '2xs': ['11px', '15px'],
        'tiny': ['11.5px', '16px'],
      },
    },
  },
  plugins: [],
};
