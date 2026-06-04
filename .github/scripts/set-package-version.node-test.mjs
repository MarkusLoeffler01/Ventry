import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const scriptPath = new URL("./set-package-version.mjs", import.meta.url).pathname;

function exec(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("updates package.json and package-lock root package versions", () => {
  const cwd = mkdtempSync(join(tmpdir(), "ventry-set-package-version-"));

  writeFileSync(join(cwd, "package.json"), JSON.stringify({
    name: "ventry",
    version: "1.2.3",
  }, null, 2));

  writeFileSync(join(cwd, "package-lock.json"), JSON.stringify({
    name: "ventry",
    version: "1.2.3",
    packages: {
      "": {
        name: "ventry",
        version: "1.2.3",
      },
      "node_modules/example": {
        version: "0.0.1",
      },
    },
  }, null, 2));

  exec("node", [scriptPath, "2.0.0"], cwd);

  const packageJson = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const packageLock = JSON.parse(readFileSync(join(cwd, "package-lock.json"), "utf8"));

  assert.equal(packageJson.version, "2.0.0");
  assert.equal(packageLock.version, "2.0.0");
  assert.equal(packageLock.packages[""].version, "2.0.0");
  assert.equal(packageLock.packages["node_modules/example"].version, "0.0.1");
});
