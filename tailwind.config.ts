import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "var(--felt)",
        "felt-deep": "var(--felt-deep)",
        "felt-line": "var(--felt-line)",
        paper: "var(--paper)",
        "paper-hi": "var(--paper-hi)",
        "paper-line": "var(--paper-line)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        gold: "var(--gold)",
        "gold-bright": "var(--gold-bright)",
        seal: "var(--seal)",
        "seal-soft": "var(--seal-soft)",
        "gold-deep": "var(--gold-deep)",
        peach: "var(--peach)",
      },
      fontFamily: {
        display: ["Charmonman", "serif"],
        body: ["Mitr", "sans-serif"],
      },
      boxShadow: {
        deep: "0 20px 44px -8px rgba(61, 46, 34, 0.38), 0 2px 8px rgba(61, 46, 34, 0.14)",
        panel: "0 10px 26px -6px rgba(61, 46, 34, 0.28)",
        die: "0 4px 10px rgba(61, 46, 34, 0.3)",
      },
      keyframes: {
        "dice-shake": {
          "0%,100%": { transform: "rotate(0deg) scale(1)" },
          "25%": { transform: "rotate(-14deg) scale(1.08)" },
          "50%": { transform: "rotate(10deg) scale(0.94)" },
          "75%": { transform: "rotate(-6deg) scale(1.05)" },
        },
        "token-hop": {
          "0%,100%": { transform: "translate(-50%,-50%) scale(1)" },
          "50%": { transform: "translate(-50%,-85%) scale(1.18)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.9) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "flip-card": {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(180deg)" },
        },
      },
      animation: {
        "dice-shake": "dice-shake 0.35s ease-in-out infinite",
        "token-hop": "token-hop 0.78s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "pop-in": "pop-in 0.55s cubic-bezier(0.34,1.56,0.64,1)",
        "flip-card": "flip-card 0.55s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
