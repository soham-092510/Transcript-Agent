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
        neon: {
          blue: '#00D9FF',
          'blue-dark': '#0EA5E9',
          purple: '#8B5CF6',
          'purple-light': '#A855F7',
          'purple-glow': '#C084FC',
        },
        deep: {
          900: '#0A0A1F',
          800: '#12122B',
          700: '#1A1A3A',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.09)',
          active: 'rgba(255, 255, 255, 0.13)',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-highlight': 'rgba(0, 217, 255, 0.3)',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#00D9FF',
          600: '#0EA5E9',
          700: '#8B5CF6',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          cyan: '#00D9FF',
          indigo: '#8B5CF6',
          violet: '#A855F7',
          amber: '#F59E0B',
          emerald: '#10B981',
        }
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(135deg, #0A0A1F 0%, #12122B 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00D9FF 0%, #8B5CF6 100%)',
        'neon-glow-gradient': 'linear-gradient(135deg, #3B82F6 0%, #C084FC 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 217, 255, 0.2)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.25)',
        'neon-glow': '0 0 25px rgba(0, 217, 255, 0.25), 0 0 10px rgba(139, 92, 246, 0.2)',
        'glass-edge': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
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
