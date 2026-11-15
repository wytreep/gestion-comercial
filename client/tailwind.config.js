export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul corporativo: el acento principal del ERP.
        primary: {
          DEFAULT: '#0b5cab',
          light:   '#2f7fc1',
          hover:   '#084a8c',
          dark:    '#083a6e',
          50:      'rgb(var(--primary-soft) / <alpha-value>)',
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
        // `DEFAULT/light/dark/soft` leen variables: en oscuro suben de luminosidad.
        // `solid` se reserva para fondos con texto blanco (botones, contadores).
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          light:   'rgb(var(--success-light) / <alpha-value>)',
          dark:    'rgb(var(--success-dark) / <alpha-value>)',
          soft:    'rgb(var(--success-soft) / <alpha-value>)',
          solid:   '#157347',
          'solid-hover': '#0f5c39',
          // Tinte claro para texto sobre superficies oscuras (navy).
          invert:  '#6ee7b7',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          light:   'rgb(var(--warning-light) / <alpha-value>)',
          dark:    'rgb(var(--warning-dark) / <alpha-value>)',
          soft:    'rgb(var(--warning-soft) / <alpha-value>)',
          solid:   '#b45309',
          'solid-hover': '#8f4207',
          invert:  '#fcd34d',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          light:   'rgb(var(--danger-light) / <alpha-value>)',
          dark:    'rgb(var(--danger-dark) / <alpha-value>)',
          soft:    'rgb(var(--danger-soft) / <alpha-value>)',
          solid:   '#b42318',
          'solid-hover': '#8f1c13',
          invert:  '#fca5a5',
        },
        // Azul de marca para fondos sólidos: no cambia con el tema.
        brand: {
          DEFAULT: '#0b5cab',
          hover:   '#084a8c',
          dark:    '#083a6e',
        },
        emerald: { DEFAULT: '#047857' },
        teal:    { DEFAULT: '#0f766e', light: '#14b8a6' },

        // ── Superficies y jerarquía de texto ──────────────
        // Todos leen variables CSS para que el tema oscuro no duplique clases.
        canvas:    'rgb(var(--canvas) / <alpha-value>)',
        card:      'rgb(var(--card) / <alpha-value>)',
        surface:   'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        line:      'rgb(var(--line) / <alpha-value>)',
        ink:       'rgb(var(--ink) / <alpha-value>)',
        body:      'rgb(var(--body) / <alpha-value>)',
        soft:      'rgb(var(--soft) / <alpha-value>)',
        muted:     'rgb(var(--muted) / <alpha-value>)',
        subtle:    'rgb(var(--subtle) / <alpha-value>)',
        // Azul para texto, enlaces e iconos: se aclara sobre fondo oscuro.
        accent:    'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'Segoe UI', 'system-ui', 'sans-serif'],
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
        panel:    '0 1px 2px rgb(var(--shadow) / 0.06)',
        dropdown: '0 8px 24px rgb(var(--shadow) / 0.16)',
      },
      fontSize: {
        // Etiquetas, encabezados de tabla y metadatos. Mínimo legible del ERP.
        '2xs': ['11px', '15px'],
        'tiny': ['11.5px', '16px'],
      },
      // Capas de gestión: un solo orden para drawer, modales, menús y avisos.
      zIndex: {
        sticky:   '10',
        dropdown: '30',
        drawer:   '40',
        modal:    '50',
        toast:    '60',
        skip:     '70',
      },
    },
  },
  plugins: [],
};
