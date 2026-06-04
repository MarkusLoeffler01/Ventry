import { existsSync, readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Usage: node set-package-version.mjs <major.minor.patch>. Received: ${version || "<empty>"}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const packageJson = readJson("package.json");
packageJson.version = version;
writeJson("package.json", packageJson);

if (existsSync("package-lock.json")) {
  const packageLock = readJson("package-lock.json");

  if (typeof packageLock.version === "string") {
    packageLock.version = version;
  }

  if (packageLock.packages?.[""] && typeof packageLock.packages[""].version === "string") {
    packageLock.packages[""].version = version;
  }

  writeJson("package-lock.json", packageLock);
}

console.log(`Set package version to ${version}.`);
