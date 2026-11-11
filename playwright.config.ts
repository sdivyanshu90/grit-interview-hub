declare const process: { env: Record<string, string | undefined> };
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
