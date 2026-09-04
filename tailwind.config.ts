import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07070d",
        track: "#14141f",
        cheese: "#ffd84d",
      },
    },
  },
  plugins: [],
};

export default config;
