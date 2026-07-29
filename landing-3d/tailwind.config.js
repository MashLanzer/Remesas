/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Acentos de marca (mismos que la app). Cámbialos aquí para re-tematizar.
        brand: {
          DEFAULT: "#12b866",
          light: "#2fe08a",
          dark: "#0c6b3f",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
