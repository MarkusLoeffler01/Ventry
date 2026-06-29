#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";

const requiredBinaries = ["pg_dump", "psql", "pg_restore"];
const args = new Set(process.argv.slice(2));
const keepDump = args.has("--keep-dump");
const showHelp = args.has("--help") || args.has("-h");
const skipConfirm = args.has("--yes") || args.has("-y");

if (showHelp) {
  printHelp();
  process.exit(0);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

async function main() {
  dotenv.config({ quiet: true });

  const dumpUrl = process.env.DB_DUMP_URL;
  const restoreUrl = process.env.DB_RESTORE_URL;
  const excludedExtensions = (process.env.DB_EXCLUDE_EXTENSIONS ?? "prisma_postgres,pg_stat_statements")
    .split(",")
    .map((extension) => extension.trim())
    .filter(Boolean);

  if (!dumpUrl) {
    throw new Error("DB_DUMP_URL is not set.");
  }

  if (!restoreUrl) {
    throw new Error("DB_RESTORE_URL is not set.");
  }

  if (dumpUrl === restoreUrl) {
    throw new Error("DB_DUMP_URL and DB_RESTORE_URL point to the same value.");
  }

  for (const binary of requiredBinaries) {
    await run(binary, ["--version"], { quiet: true }).catch(() => {
      throw new Error(`${binary} is not installed or not in PATH.`);
    });
  }

  if (!skipConfirm) {
    if (!process.stdin.isTTY) {
      throw new Error("Refusing to overwrite without confirmation. Pass --yes in non-interactive runs.");
    }

    console.warn("WARNING: This will permanently overwrite the DB_RESTORE_URL database.");
    const answer = await prompt("Type 'yes' to continue: ");

    if (answer !== "yes") {
      console.log("Aborting.");
      return;
    }
  }

  const workDir = mkdtempSync(join(tmpdir(), "ventry-db-sync-"));
  const dumpFile = join(workDir, "dump.pgcustom");
  const restoreListFile = join(workDir, "restore.list");

  try {
    console.log("Creating dump from DB_DUMP_URL...");
    await run("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      ...excludedExtensions.map((extension) => `--exclude-extension=${extension}`),
      "--file",
      dumpFile,
      dumpUrl,
    ]);

    console.log("Preparing restore list...");
    const restoreList = await runOutput("pg_restore", ["--list", dumpFile]);
    writeFileSync(restoreListFile, filterRestoreList(restoreList));

    console.log("Clearing target schema on DB_RESTORE_URL...");
    await run("psql", [
      restoreUrl,
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      `DO $$
DECLARE
  publication_name text;
BEGIN
  FOR publication_name IN
    SELECT pubname
    FROM pg_publication
  LOOP
    EXECUTE format('DROP PUBLICATION IF EXISTS %I', publication_name);
  END LOOP;
END $$;
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
  END LOOP;
END $$;
CREATE SCHEMA public;`,
    ]);

    console.log("Restoring structure and data into DB_RESTORE_URL...");
    await run("pg_restore", [
      "--dbname",
      restoreUrl,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      "--use-list",
      restoreListFile,
      dumpFile,
    ]);

    console.log("Database sync complete.");
  } finally {
    if (keepDump) {
      console.log(`Kept dump file: ${dumpFile}`);
    } else {
      console.log(`Cleaning up temporary files... ${workDir}`);
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}

function filterRestoreList(restoreList) {
  return restoreList
    .split("\n")
    .filter((line) => !line.includes(" SCHEMA - public ") && !line.includes(" COMMENT - SCHEMA public "))
    .join("\n");
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: options.quiet ? "ignore" : "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} was terminated by signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runOutput(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "inherit"],
    });
    const chunks = [];

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} was terminated by signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve(Buffer.concat(chunks).toString("utf8"));
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(data.trim());
    });
  });
}

function printHelp() {
  console.log(`Usage: node scripts/db-sync-overwrite.mjs [options]

Dumps DB_DUMP_URL and overwrites DB_RESTORE_URL with the dumped structure and data.

Required environment variables:
  DB_DUMP_URL      PostgreSQL connection URL to dump from
  DB_RESTORE_URL   PostgreSQL connection URL to overwrite

Optional environment variables:
  DB_EXCLUDE_EXTENSIONS  Comma-separated extensions to skip. Defaults to prisma_postgres,pg_stat_statements

Options:
  -y, --yes        Skip the interactive overwrite confirmation
  --keep-dump      Keep the temporary pg_dump file and print its path
  -h, --help       Show this help
`);
}
