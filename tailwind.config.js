/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // sharper radius scale than tailwind's default — cards top out
    // at 12px, controls at 8px, for a tighter, more modern feel
    borderRadius: {
      none: "0",
      sm: "0.125rem",
      DEFAULT: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.625rem",
      "2xl": "0.75rem",
      "3xl": "1rem",
      full: "9999px",
    },
    extend: {
      colors: {
        // near-black neutral dark palette with a pastel indigo accent
        canvas: "#0d0e12",
        surface: "#15161c",
        "surface-2": "#1c1e26",
        "surface-3": "#252833",
        line: "#282b37",
        muted: "#9099ad",
        accent: {
          DEFAULT: "#b8c4ff",
          hover: "#cbd4ff",
          soft: "#b8c4ff26",
          // secondary hue, used sparingly in gradients
          2: "#8798e8",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
