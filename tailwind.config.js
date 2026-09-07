/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Official NHS Palette: Navy & Keystone Gold
        "nhs-navy": {
          DEFAULT: "#0a1e3f",
          dark: "#061328",
          light: "#16325c",
          surface: "#0e254d",
        },
        "nhs-gold": {
          DEFAULT: "#c59b27",
          hover: "#b58b1e",
          light: "#e5bc4b",
          dark: "#8c6d1f",
          bg: "#fcf8ed",
          border: "#ead59b",
        },
        "surface": "#fbfbfa",
        "surface-container": "#f4f4f1",
        "surface-container-low": "#f8f8f6",
        "surface-container-lowest": "#ffffff",
        "primary": "#0a1e3f",
        "primary-container": "#16325c",
        "secondary": "#565e74",
        "tertiary": "#c59b27",
        "on-surface": "#0a1e3f",
        "outline-variant": "#e2e8f0",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        cinzel: ["'Cinzel'", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        "card": "0 2px 12px -2px rgba(10, 30, 63, 0.06), 0 1px 3px rgba(10, 30, 63, 0.03)",
        "card-hover": "0 8px 24px -4px rgba(10, 30, 63, 0.1), 0 2px 6px rgba(10, 30, 63, 0.04)",
        "button": "0 1px 3px rgba(10, 30, 63, 0.12), 0 1px 2px rgba(10, 30, 63, 0.08)",
      }
    }
  },
  plugins: [],
}
