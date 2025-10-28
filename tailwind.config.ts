import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Sequel Sans Display Book",
          "Sequel Sans Display Book Placeholder",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }], // 10px
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Light theme base colors
        background: "#ffffff",
        foreground: "#1a1a1a",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1a1a1a",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#1a1a1a",
        },
        primary: {
          DEFAULT: "#CD66FB",
          foreground: "#ffffff",
          50: "#f9f2fe",
          100: "#f4e6fd",
          200: "#e9cffd",
          300: "#dbb7fc",
          400: "#cd9ffb",
          500: "#CD66FB",
          600: "#c147fa",
          700: "#b22cf9",
          800: "#a21cf8",
          900: "#8a10f7",
        },
        secondary: {
          DEFAULT: "#f8fafc",
          foreground: "#475569",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#f1f5f9",
          foreground: "#1e293b",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#CD66FB",
        chart: {
          "1": "#CD66FB",
          "2": "#06b6d4",
          "3": "#10b981",
          "4": "#f59e0b",
          "5": "#ef4444",
        },
        // Success, warning, error colors
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
          light: "#d1fae5",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
          light: "#fef3c7",
        },
        error: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
          light: "#fee2e2",
        },
        // Neutral grays for light theme
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      screens: {
        xs: "480px",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
