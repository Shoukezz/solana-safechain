/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#7c5cff",
          600: "#6b4dff",
        },
      },
      boxShadow: {
        soft: "0 16px 48px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
