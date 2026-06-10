import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-public-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#FBFAF7",
        ink: "#14233D",
        muted: "#5C6B82",
        line: "#E7E2D8",
        columbia: { DEFAULT: "#5B8FB9", soft: "#E8F0F7", deep: "#3D6E97" },
        sell: { DEFAULT: "#1F7A63", soft: "#E6F2ED" },
        buy: { DEFAULT: "#A8651A", soft: "#F7ECDB" },
      },
    },
  },
  plugins: [],
};

export default config;
