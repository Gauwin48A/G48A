
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
      display: ['Sora', 'Manrope', 'ui-sans-serif', 'system-ui'],
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        light: '#F8F9FA',
        dark: '#212121',
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        border: 'var(--border)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        ring: 'var(--ring)',
        input: 'var(--input)',
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
      spacing: {
        'base': '8px',
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px 0 rgba(76,175,80,0.08)',
        'elevation-2': '0 2px 8px 0 rgba(76,175,80,0.12)',
        'theme-card': 'var(--card-shadow)',
        'theme-card-hover': 'var(--card-shadow-hover)',
        'theme-soft': 'var(--shadow-soft)',
        'theme-btn': 'var(--btn-shadow)',
      },
      fontSize: {
        'display': ['1.5rem', { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.02em' }],
        'heading': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.02em' }],
        'body': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400', letterSpacing: '-0.01em' }],
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0em' }],
      },
    },
  },
  plugins: [],
}
