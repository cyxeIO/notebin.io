/** @type {import('tailwindcss').Config} */
module.exports = {
    // Enable class-based dark mode
    darkMode: "class",
    content: [
      "./src/app/**/*.{ts,tsx,js,jsx,mdx}",
      "./src/components/**/*.{ts,tsx,js,jsx,mdx}",
      "./src/providers/**/*.{ts,tsx,js,jsx,mdx}",
    ],
    theme: {
      extend: {
        colors: {
          background: "var(--background)",
          foreground: "var(--foreground)",
          border: "var(--border)",
          muted: "var(--muted)",
          accent: "var(--accent)",
          destructive: "var(--destructive)",
          ring: "var(--ring)",
          input: "var(--input)",
          sidebar: "var(--sidebar)",
          "sidebar-border": "var(--sidebar-border)",
          "sidebar-secondary": "var(--sidebar-secondary)",
        },
        fontFamily: {
          sans: ["var(--font-sans)", "system-ui", "sans-serif"],
          mono: ["var(--font-mono)", "monospace"],
        },
        borderRadius: {
          sm: "var(--radius-sm)",
          md: "var(--radius-md)",
          lg: "var(--radius-lg)",
        },
        boxShadow: {
          card: "0 4px 8px rgba(0,0,0,0.5)",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: 0 },
            "100%": { opacity: 1 },
          },
          slideIn: {
            "0%": { transform: "translateX(-20px)", opacity: 0 },
            "100%": { transform: "translateX(0)", opacity: 1 },
          },
        },
        animation: {
          fadeIn: "fadeIn 0.3s ease-out forwards",
          slideIn: "slideIn 0.4s ease-out forwards",
        },
        screens: {
          xs: "480px",
        },
      },
    },
    plugins: [
      require("@tailwindcss/forms"),      // beautifully style your inputs & selects
      require("@tailwindcss/typography"), // prose classes for markdown/content
    ],
  };