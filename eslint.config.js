import { solvro } from "@solvro/config/eslint";

export default solvro(
  {
    ignores: ["src/components/ui/**"],
  },
  {
    rules: {
      "@typescript-eslint/restrict-template-expressions": "off",
      "unicorn/prevent-abbreviations": [
        "error",
        {
          replacements: {
            env: false,
            envs: false,
            props: false,
            prop: false,
            ref: false,
            utils: false,
          },
          allowList: {
            db: true,
            e2e: true,
          },
          ignore: [String.raw`e2e`],
        },
      ],
    },
  },
  {
    files: ["drizzle.config.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["src/db/seed.ts"],
    rules: {
      "no-console": "off",
      "unicorn/no-process-exit": "off",
    },
  },
);
