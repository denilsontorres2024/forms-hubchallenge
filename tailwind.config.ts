import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hub: {
          primary: "#FFB000",
          hover: "#E89F00",
          background: "#F5F5F5",
          card: "#FFFFFF",
          border: "#E7E7E7",
          text: "#111111",
          muted: "#666666",
          placeholder: "#999999",
          success: "#16A34A",
          error: "#DC2626",
          warning: "#F59E0B",
        },
      },
      boxShadow: {
        panel: "0 1px 1px rgba(17, 17, 17, 0.02), 0 14px 40px rgba(17, 17, 17, 0.04)",
        focus: "0 0 0 4px rgba(255, 176, 0, 0.18)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
