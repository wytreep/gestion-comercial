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
        },
        // Barra lateral y superficies oscuras.
        navy: {
          DEFAULT: '#16232f',
          800:     '#1b2c3b',
          900:     '#121e29',
          950:     '#0c151d',
        },
        // Verde financiero para utilidades y flujo positivo.
        success: { DEFAULT: '#157347', light: '#1f9d5c' },
        warning: { DEFAULT: '#b45309', light: '#d97706' },
        danger:  { DEFAULT: '#b42318', light: '#d92d20' },
        emerald: { DEFAULT: '#047857' },
        teal:    { DEFAULT: '#0f766e', light: '#14b8a6' },
        // Superficies y líneas del sistema.
        canvas:  '#eef1f5',
        line:    '#dfe4ea',
        ink:     '#1f2937',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm:      '2px',
        md:      '4px',
        lg:      '6px',
        xl:      '8px',
      },
      boxShadow: {
        panel:    '0 1px 2px rgba(16, 24, 40, 0.05)',
        dropdown: '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
}
