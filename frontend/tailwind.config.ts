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
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Brand greens — deep, earthy, trustworthy
        primary: {
          DEFAULT: "#1F5132",
          foreground: "#FFFFFF",
          deep: "#143822",
          soft: "#E8F0E5",
          accent: "#5E8C5A",
        },

        // Surfaces
        background: "#FAF7F2",
        surface: "#FFFFFF",
        foreground: "#0F1F18",
        muted: {
          DEFAULT: "#F1ECE3",
          foreground: "#6B7568",
        },
        border: "#E7E2D6",
        input: "#E7E2D6",
        ring: "#1F5132",
        card: { DEFAULT: "#FFFFFF", foreground: "#0F1F18" },

        // Earth accents
        clay: "#A87042",
        amber: "#C97B1A",
        sand: "#F1ECE3",

        // Status — choropleth + KPIs
        status: {
          surplus: "#1F5132",
          cukup: "#7AA876",
          waspada: "#D4933A",
          defisit: "#B3573A",
        },

        // Destructive (shadcn slot)
        destructive: {
          DEFAULT: "#B3573A",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#E8F0E5",
          foreground: "#1F5132",
        },
        secondary: {
          DEFAULT: "#F1ECE3",
          foreground: "#0F1F18",
        },
        popover: { DEFAULT: "#FFFFFF", foreground: "#0F1F18" },
      },
      borderRadius: {
        none: "0",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 31, 24, 0.04), 0 4px 12px rgba(15, 31, 24, 0.06)",
        elevated: "0 4px 12px rgba(15, 31, 24, 0.08), 0 12px 32px rgba(15, 31, 24, 0.10)",
        glow: "0 0 0 1px rgba(31, 81, 50, 0.08), 0 8px 32px rgba(31, 81, 50, 0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out both",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.4s linear infinite",
      },
      backgroundImage: {
        "gradient-mesh":
          "radial-gradient(at 12% 0%, rgba(94, 140, 90, 0.18) 0px, transparent 50%), radial-gradient(at 88% 12%, rgba(31, 81, 50, 0.12) 0px, transparent 55%), radial-gradient(at 100% 100%, rgba(168, 112, 66, 0.10) 0px, transparent 50%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
