/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#060913",
          900: "#0b1120",
          850: "#10192e",
          800: "#15223c",
          700: "#1e3156",
          600: "#2d487d",
          accent: "#38bdf8",
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
