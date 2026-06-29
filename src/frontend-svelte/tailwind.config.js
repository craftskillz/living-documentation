const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{svelte,js,ts}"),
  ],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
};
