/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        category: {
          appointment: '#2563eb',
          bill: '#dc2626',
          reminder: '#f59e0b',
          milestone: '#16a34a',
          other: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
