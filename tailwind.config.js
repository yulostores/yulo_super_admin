/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          red: "#A4161A",
          orange: "#D9480F",
          orange2: "#F0592A",
          maroon: "#B11226",
          cream: "#F5DFCE",
          cream2: "#FAE4D3",
          dark: "#23180E",
          dark2: "#1A120A",
          page: "#FFF8F5",
          saffron: "#F2A65A",
          green: "#2E7D32",
          // Supporting palette — these were inlined as arbitrary-value hex
          // literals across the screens (48 copies of #D9480F alone).
          blue: "#1565C0",
          blue2: "#1E88E5",
          teal: "#0E7C7B",
          ink: "#24190F",
          ink2: "#5A453A",
          muted: "#8A7566",
          line: "#F6EFE9",
          neutral: "#9CA3AF",
          surface: "#FAFAF8",
          hover: "#F5EDE4",
          amber: "#F59E0B",
          indigo: "#3B73D4",
          leaf: "#43A047",
        },
        // Status tints used by Badge and the status pills.
        status: {
          ok: "#2E7D32",
          "ok-bg": "#E8F5EC",
          warn: "#D9480F",
          "warn-bg": "#FFF3E0",
          info: "#1565C0",
          "info-bg": "#E7F0FB",
          danger: "#B11226",
          "danger-bg": "#FCE9E4",
          muted: "#5F5F5F",
          "muted-bg": "#F3F4F6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #A4161A 0%, #D9480F 100%)",
        "brand-gradient-v": "linear-gradient(180deg, #D9480F 0%, #A4161A 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #23180E 0%, #1A120A 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
