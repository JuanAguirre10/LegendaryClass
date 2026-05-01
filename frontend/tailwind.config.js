/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        'cinzel':            ['Cinzel', 'serif'],
        'cinzel-decorative': ['Cinzel Decorative', 'serif'],
        'playfair':          ['Playfair Display', 'serif'],
      },
      colors: {
        primary:   { DEFAULT: '#6366F1', hover: '#4F46E5' },
        secondary: { DEFAULT: '#8B5CF6', hover: '#7C3AED' },
        success:   { DEFAULT: '#10B981', hover: '#059669' },
        danger:    { DEFAULT: '#EF4444', hover: '#DC2626' },
        warning:   { DEFAULT: '#F59E0B', hover: '#D97706' },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow':  'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 5px #6366F1, 0 0 10px #6366F1' },
          to:   { boxShadow: '0 0 20px #6366F1, 0 0 40px #8B5CF6' },
        },
      },
    },
  },
  plugins: [],
};
