import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        // The Apple system font (San Francisco) can't be loaded as a webfont,
        // so this is the standard stack that resolves to it on Apple devices
        // and to each platform's native UI face everywhere else.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        paper: "#FAF8F2",
        // Ink ramp: four fixed tones, darkest to lightest. `ink` (DEFAULT)
        // stays the primary tone everywhere it's already used; secondary/
        // tertiary are additions for graduated hero-text hierarchy.
        ink: { DEFAULT: "#17293F", secondary: "#33404F", tertiary: "#6A7382" },
        muted: "#5C6B7A",
        line: "#E7E2D8",
        columbia: { DEFAULT: "#4E7BA6", soft: "#E8F0F7", deep: "#3D6382" },
        sell: { DEFAULT: "#125C42", soft: "#E6F2ED" },
        buy: { DEFAULT: "#A8651A", soft: "#F7ECDB" },
        // Ticket-stock additions: a whiter card surface to rest on the cream
        // page, and a foil accent reserved for scarcity/ownership states.
        card: "#FFFDF8",
        foil: "#B0642F",
      },
    },
  },
  plugins: [],
};

export default config;
