import nextConfig from "eslint-config-next";
import tseslint from "@typescript-eslint/eslint-plugin";

const config = [
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
  },
];

export default config;
