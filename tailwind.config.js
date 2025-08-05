/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'insurance-blue': '#1e40af',
        'insurance-light': '#dbeafe',
        'insurance-dark': '#1e3a8a',
      },
    },
  },
  plugins: [],
} 