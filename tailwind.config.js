/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          light: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        light: {
          bg: 'rgb(var(--color-light-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-light-surface) / <alpha-value>)',
          gray: 'rgb(var(--color-light-gray) / <alpha-value>)',
          text: 'rgb(var(--color-light-text) / <alpha-value>)',
        },
        dark: {
          bg: 'rgb(var(--color-dark-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-dark-surface) / <alpha-value>)',
          gray: 'rgb(var(--color-dark-gray) / <alpha-value>)',
          text: 'rgb(var(--color-dark-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Raleway', 'sans-serif'],
      },
      borderRadius: {
        'design': 'var(--radius)',
        'design-sm': 'calc(var(--radius) / 2)',
        'design-lg': 'calc(var(--radius) * 1.5)',
        // For rectangular media/cards: tracks --radius but never goes pill.
        'design-card': 'var(--radius-card)',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
      },
    },
  },
  plugins: [],
};
