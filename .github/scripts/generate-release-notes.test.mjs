import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const scriptPath = new URL("./generate-release-notes.mjs", import.meta.url).pathname;

function exec(command, args, cwd, env = {}) {
  return execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createRepo() {
  const cwd = mkdtempSync(join(tmpdir(), "ventry-release-notes-"));

  exec("git", ["init", "-b", "main"], cwd);
  exec("git", ["config", "user.email", "actions@example.com"], cwd);
  exec("git", ["config", "user.name", "Actions"], cwd);
  exec("git", ["config", "commit.gpgsign", "false"], cwd);

  writeFileSync(join(cwd, "package.json"), JSON.stringify({
    name: "ventry",
    version: "1.2.3",
  }, null, 2));

  exec("git", ["add", "package.json"], cwd);
  exec("git", ["commit", "-m", "chore: initial"], cwd);
  exec("git", ["tag", "v1.2.3"], cwd);
  exec("git", ["checkout", "-b", "dev"], cwd);

  return cwd;
}

function emptyCommit(cwd, subject, body) {
  const args = ["commit", "--allow-empty", "-m", subject];
  if (body) args.push("-m", body);

  exec("git", args, cwd);
}

function generate(cwd, range = "main..dev") {
  const notesPath = join(cwd, "release-notes.md");
  const outputPath = join(cwd, "github-output.txt");

  exec("node", [scriptPath], cwd, {
    GITHUB_OUTPUT: outputPath,
    RELEASE_NOTES_FILE: notesPath,
    RELEASE_RANGE: range,
  });

  return {
    notes: readFileSync(notesPath, "utf8"),
    output: readFileSync(outputPath, "utf8"),
  };
}

test("generates a minor release and groups conventional commits", () => {
  const cwd = createRepo();

  emptyCommit(cwd, "feat(ui): add dashboard", "Fixes #10");
  emptyCommit(cwd, "fix(db): repair migration");
  emptyCommit(cwd, "chore: update dependencies");

  const { notes, output } = generate(cwd);

  assert.match(notes, /^# ventry v1\.3\.0/m);
  assert.match(output, /^version=1\.3\.0$/m);
  assert.match(output, /^tag_name=v1\.3\.0$/m);
  assert.match(output, /^release_type=minor$/m);

  const featuresIndex = notes.indexOf("### Features");
  const choresIndex = notes.indexOf("### Chores");
  const fixesIndex = notes.indexOf("### Fixes");

  assert.notEqual(featuresIndex, -1);
  assert.notEqual(choresIndex, -1);
  assert.notEqual(fixesIndex, -1);
  assert.ok(featuresIndex < choresIndex);
  assert.ok(choresIndex < fixesIndex);

  assert.match(notes, /feat\(ui\): add dashboard/);
  assert.match(notes, /fix\(db\): repair migration/);
  assert.match(notes, /chore: update dependencies/);
  assert.match(notes, /^Closes #10$/m);
});

test("collects issue numbers from merged branch names as a fallback", () => {
  const cwd = createRepo();

  emptyCommit(cwd, "Merge pull request #12 from Ventry-io/21-fix-names");

  const { notes, output } = generate(cwd);

  assert.match(output, /^release_type=patch$/m);
  assert.match(notes, /^- #12 `/m);
  assert.match(notes, /^Closes #21$/m);
});
