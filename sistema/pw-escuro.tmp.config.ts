import base from "./playwright.config.ts";
export default { ...base, testDir: "/home/claude/t3jus/sistema/tests/e2e", webServer: undefined,
  projects: base.projects!.map((p) => ({ ...p, use: { ...p.use, colorScheme: "dark" as const } })) };
