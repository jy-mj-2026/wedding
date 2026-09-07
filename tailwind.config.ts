import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F4F0E7",
        ink: "#1C1B18",
        muted: "#77736A",
        line: "#CBC5B9",
        accent: "#8B4B3E",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "sans-serif"],
        serif: ["Iowan Old Style", "Noto Serif KR", "Batang", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
