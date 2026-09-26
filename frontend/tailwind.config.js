/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Metallic Titanium & Platinum Slate Palette
        slate: {
          950: '#0B0F17',
          900: '#0F172A',
          850: '#131D31',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        metallic: {
          dark: '#0B0F17',
          base: '#0F172A',
          surface: '#1E293B',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-highlight': 'rgba(255, 255, 255, 0.25)',
          platinum: '#F8FAFC',
          silver: '#E2E8F0',
          chrome: '#94A3B8',
          steel: '#38BDF8',
        },
        neon: {
          blue: '#38BDF8',
          'blue-dark': '#0284C7',
          purple: '#818CF8',
          'purple-light': '#A5B4FC',
          'purple-glow': '#C7D2FE',
        },
        deep: {
          900: '#0B0F17',
          800: '#0F172A',
          700: '#1E293B',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          hover: 'rgba(255, 255, 255, 0.08)',
          active: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-highlight': 'rgba(255, 255, 255, 0.22)',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        accent: {
          cyan: '#38BDF8',
          indigo: '#6366F1',
          violet: '#818CF8',
          amber: '#F59E0B',
          emerald: '#10B981',
        }
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(135deg, #0B0F17 0%, #0F172A 100%)',
        'metallic-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
        'metallic-card-gradient': 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        'chrome-shine': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        'executive-blue': 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
        'neon-gradient': 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
        'neon-glow-gradient': 'linear-gradient(180deg, #0284C7 0%, #475569 100%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      boxShadow: {
        'metallic-glow': '0 0 20px rgba(226, 232, 240, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'metallic-subtle': '0 0 15px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'specular-rim': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
        'neon-blue': '0 0 16px rgba(56, 189, 248, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'neon-purple': '0 0 16px rgba(129, 140, 248, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'neon-glow': '0 0 16px rgba(56, 189, 248, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'glass': '20px',
      }
    },
  },
  plugins: [],
}
