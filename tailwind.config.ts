import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Board surfaces: the dark, gameboard-like ground the whole app sits on.
        ink: {
          50: "#f3f4f7",
          100: "#e2e4ea",
          200: "#c4c8d3",
          300: "#9ba1b0",
          400: "#767d8f",
          500: "#565d70",
          600: "#3d4353",
          700: "#2a2f3d",
          800: "#1b1f2a",
          850: "#151822",
          900: "#10131b",
          950: "#0a0c12",
        },
        indigo: {
          50: "#f2f0ff",
          100: "#e4e0ff",
          200: "#c9c0ff",
          300: "#aa9dff",
          400: "#9080ff",
          500: "#7c66ff",
          600: "#6a4ff0",
          700: "#5539d1",
          800: "#3f2ba3",
          900: "#2a1e73",
        },
        emerald: {
          50: "#ecfdf6",
          100: "#d1fae9",
          200: "#a3f3d3",
          300: "#6ee7b7",
          400: "#3ad999",
          500: "#1fc27f",
          600: "#149e68",
          700: "#127d55",
          800: "#126247",
          900: "#0f4f3c",
        },
        amber: {
          50: "#fffaeb",
          100: "#fef0c7",
          200: "#fde08a",
          300: "#fbc94d",
          400: "#f7b024",
          500: "#ef9a0c",
          600: "#cf7907",
          700: "#a5590a",
          800: "#86460f",
          900: "#6f3a10",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
      },
      backgroundImage: {
        board:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
