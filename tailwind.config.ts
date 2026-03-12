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
          DEFAULT: "#00f0ff", // Electric Cyan
          lobster: "#e23d28",  // Lobster Red
        },
        muted: "#888888",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow": "radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.1), transparent 50%)",
      },
    },
  },
  plugins: [],
};
export default config;
