#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const envFile = resolve(process.cwd(), ".env");

if (!existsSync(envFile)) {
  console.error("❌ No .env file found in the current directory.");
  process.exit(1);
}

const result = dotenv.config({ path: envFile });

if (result.error) {
  console.error("❌ Could not load .env file:");
  console.error(result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in the .env file.");
  process.exit(1);
}

const args = ["prisma", "migrate", "dev", ...process.argv.slice(2)];

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`❌ Process was terminated by signal: ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});