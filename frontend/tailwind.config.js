/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope"', 'Segoe UI', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        canvas: '#f6f1e8',
        ink: '#1f2937',
        brand: {
          50: '#eef8f7',
          100: '#d7eeeb',
          300: '#7fc8bf',
          500: '#2a7f77',
          600: '#22675f',
          700: '#1b524c'
        },
        accent: {
          100: '#f8e3c7',
          300: '#efbe83',
          500: '#c98135',
          700: '#8a5520'
        }
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.08)',
        soft: '0 12px 30px rgba(15, 23, 42, 0.08)'
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(circle at top left, rgba(42,127,119,0.18), transparent 45%), radial-gradient(circle at bottom right, rgba(201,129,53,0.16), transparent 40%)'
      }
    }
  },
  plugins: []
};

