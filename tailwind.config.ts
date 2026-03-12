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
        card: "rgba(255, 255, 255, 0.03)",
        border: "rgba(255, 255, 255, 0.08)",
        primary: {
          DEFAULT: "#E23D28", // OpenClaw Lobster Red
          cyan: "#00F0FF",
        },
        muted: "#888888",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
