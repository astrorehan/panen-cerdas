import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        // Paper / ink — the foundation
        paper: {
          DEFAULT: "#F4EFE6",
          deep: "#EBE5D6",
          edge: "#E2DBC7",
        },
        ink: {
          DEFAULT: "#1A1D1B",
          soft: "#3C4138",
          faint: "#6B6F5F",
          light: "#9A9A88",
        },
        rule: "#C8C0A8",

        // Brand greens (earthier than Material green)
        moss: {
          DEFAULT: "#2A3D2F",
          deep: "#1A2620",
          mid: "#456049",
          pale: "#87A07D",
          wash: "#E5EBDA",
        },

        // Accents
        saffron: "#C97B1A",
        amber: "#D4933A",
        clay: "#A8442C",
        sky: "#5C7F8F",

        // Status (used in choropleth + KPIs)
        status: {
          surplus: "#2A3D2F",
          cukup: "#87A07D",
          waspada: "#D4933A",
          defisit: "#A8442C",
        },

        // shadcn semantic tokens (kept for Card/Button compatibility)
        border: "#C8C0A8",
        input: "#C8C0A8",
        ring: "#2A3D2F",
        background: "#F4EFE6",
        foreground: "#1A1D1B",
        muted: { DEFAULT: "#EBE5D6", foreground: "#6B6F5F" },
        card: { DEFAULT: "#F4EFE6", foreground: "#1A1D1B" },
        // legacy `brand` aliases so any leftover refs still resolve
        brand: {
          50: "#E5EBDA",
          100: "#D7DEC5",
          200: "#B5C39B",
          300: "#87A07D",
          400: "#5E7B5C",
          500: "#456049",
          600: "#345237",
          700: "#2A3D2F",
          800: "#1A2620",
          900: "#0D1410",
        },
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        smallcaps: "0.14em",
        cap: "0.08em",
      },
      keyframes: {
        "ink-rise": {
          "0%": { opacity: "0", transform: "translateY(6px)", filter: "blur(2px)" },
          "60%": { opacity: "1", filter: "blur(0)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-x-in": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "ink-rise": "ink-rise 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease-out both",
        "scale-x-in": "scale-x-in 0.9s cubic-bezier(0.65, 0, 0.35, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
