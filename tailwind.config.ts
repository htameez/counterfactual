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
        neutral: {
          50: "#fafaf8",
          100: "#f5f5f0",
          200: "#e8e8e1",
          300: "#d4d4cc",
          400: "#a9a9a0",
          500: "#7a7a71",
          600: "#5a5a52",
          700: "#3f3f38",
          800: "#2a2a25",
          900: "#1a1a16",
        },
        navy: {
          50: "#f0f3f7",
          100: "#e0e7f0",
          200: "#c1cfe1",
          300: "#a2b7d2",
          400: "#6b8ab3",
          500: "#345d94",
          600: "#2a4a75",
          700: "#1f3656",
          800: "#152237",
          900: "#0a1118",
        },
        indigo: {
          50: "#f0f0ff",
          100: "#e0e0ff",
          200: "#c2c2ff",
          300: "#a3a3ff",
          400: "#6565ff",
          500: "#2727ff",
          600: "#1f1fd9",
          700: "#1818b3",
          800: "#10108c",
          900: "#080866",
        },
        emerald: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#134e4a",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
