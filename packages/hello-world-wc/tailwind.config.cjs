/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'copilotkit-',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/**/*.{ts,tsx,js,jsx,html}',
    './demo.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};