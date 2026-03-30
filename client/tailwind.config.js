
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
        primary: 'var(--primary)',
        secondary: '#FFFFFF',
        light: '#F8F9FA',
        dark: '#212121',
        accent: 'var(--accent)',
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
      },
    },
  },
  plugins: [],
}
