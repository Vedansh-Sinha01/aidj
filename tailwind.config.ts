import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        booth: {
          bg: "#0a0a0d",
          panel: "#131318",
          panel2: "#1b1b22",
          border: "#26262f",
          text: "#e9e9ef",
          dim: "#8b8b9a",
          accent: "#1db954",
          accent2: "#c084fc",
          warn: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
