import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        foreground: "#ededed",
        card: "rgba(255, 255, 255, 0.02)",
        border: "rgba(255, 255, 255, 0.06)",
        primary: {
          DEFAULT: "#E23D28", // OpenClaw Lobster Red
          hover: "#ff4d3d",
        },
        secondary: "#0a0a0a",
        muted: "#666666",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        'neon': '0 0 20px rgba(226, 61, 40, 0.15)',
      }
    },
  },
  plugins: [],
};
export default config;
