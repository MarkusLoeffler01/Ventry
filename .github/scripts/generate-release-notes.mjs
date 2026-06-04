import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const range = process.env.RELEASE_RANGE || "origin/main..origin/dev";
const outputPath = process.env.RELEASE_NOTES_FILE || "release-notes.md";
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

const groupOrder = ["feat", "chore", "fix", "other"];
const groupLabels = {
  feat: "Features",
  fix: "Fixes",
  chore: "Chores",
  other: "Other",
};

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"],
    }).trim();
  } catch (error) {
    if (options.allowFailure) return "";
    throw error;
  }
}

function parseVersion(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported semantic version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function compareVersions(left, right) {
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }

  return 0;
}

function maxVersion(left, right) {
  return compareVersions(left, right) >= 0 ? left : right;
}

function incrementVersion(version, releaseType) {
  if (releaseType === "major") {
    return { major: version.major + 1, minor: 0, patch: 0 };
  }

  if (releaseType === "minor") {
    return { major: version.major, minor: version.minor + 1, patch: 0 };
  }

  return { major: version.major, minor: version.minor, patch: version.patch + 1 };
}

function latestTagVersion() {
  const tags = git(["tag", "--list", "v[0-9]*", "--sort=-v:refname"], { allowFailure: true })
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean);

  for (const tag of tags) {
    try {
      return parseVersion(tag);
    } catch {
      continue;
    }
  }

  return null;
}

function parseConventionalCommit(subject) {
  const match = subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i);

  if (!match) {
    return {
      type: "other",
      breaking: false,
      description: subject,
    };
  }

  const type = match[1].toLowerCase();

  return {
    type: groupLabels[type] ? type : "other",
    breaking: Boolean(match[3]),
    description: match[4],
  };
}

function isReleaseAutomationCommit(subject) {
  return /^chore\(release\)!?:\s+/i.test(subject)
    || /^Merge pull request #\d+\b.*\/release\/sync-main-v\d+\.\d+\.\d+\b/i.test(subject);
}

function issueNumbersFrom(text) {
  const numbers = new Set();
  const regex = /\b(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\s+(?:https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/|(?:[\w.-]+\/[\w.-]+)?#)(\d+)\b/gi;
  let match;

  while ((match = regex.exec(text || ""))) {
    numbers.add(Number(match[1]));
  }

  return numbers;
}

function mergePrNumberFrom(subject) {
  const match = subject.match(/^Merge pull request #(\d+)\b/);
  return match ? Number(match[1]) : null;
}

function branchIssueNumberFromMergeSubject(subject) {
  const match = subject.match(/^Merge pull request #\d+ from [^/]+\/(\d+)(?:[-_/]|$)/);
  return match ? Number(match[1]) : null;
}

async function fetchPullRequest(prNumber) {
  if (!repository || !token) return null;

  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${prNumber}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });

  if (!response.ok) {
    console.warn(`Could not read PR #${prNumber}: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

function readCommits() {
  const output = git(["log", "--reverse", "--format=%H%x1f%s%x1f%b%x1e", range], {
    allowFailure: true,
  });

  if (!output) return [];

  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, ...bodyParts] = record.split("\x1f");
      const body = bodyParts.join("\x1f");
      const conventional = parseConventionalCommit(subject);

      return {
        hash,
        shortHash: hash.slice(0, 7),
        subject,
        body,
        conventional,
        mergePrNumber: mergePrNumberFrom(subject),
        branchIssueNumber: branchIssueNumberFromMergeSubject(subject),
        breaking: conventional.breaking || /BREAKING[ -]CHANGE:/i.test(body),
      };
    });
}

function releaseTypeFor(commits) {
  if (commits.some((commit) => commit.breaking)) return "major";
  if (commits.some((commit) => commit.conventional.type === "feat")) return "minor";
  return "patch";
}

function commitLine(commit) {
  return `- \`${commit.shortHash}\` ${commit.subject}`;
}

function closeLine(number) {
  return `Closes #${number}`;
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageVersion = parseVersion(packageJson.version);
const latestVersion = latestTagVersion();
const baseVersion = latestVersion ? maxVersion(packageVersion, latestVersion) : packageVersion;
const commits = readCommits().filter((commit) => !isReleaseAutomationCommit(commit.subject));
const hasRelease = commits.length > 0;
const releaseType = hasRelease ? releaseTypeFor(commits) : "none";
const nextVersion = hasRelease ? incrementVersion(baseVersion, releaseType) : baseVersion;
const tagName = `v${formatVersion(nextVersion)}`;

const grouped = Object.fromEntries(groupOrder.map((group) => [group, []]));
const issueNumbers = new Set();
const includedPullRequests = [];

for (const commit of commits) {
  if (commit.mergePrNumber) {
    includedPullRequests.push(commit);
    if (commit.branchIssueNumber) {
      issueNumbers.add(commit.branchIssueNumber);
    }
  } else {
    grouped[commit.conventional.type].push(commit);
  }

  for (const number of issueNumbersFrom(`${commit.subject}\n${commit.body}`)) {
    issueNumbers.add(number);
  }
}

for (const commit of includedPullRequests) {
  const pullRequest = await fetchPullRequest(commit.mergePrNumber);
  if (!pullRequest) continue;

  commit.pullRequestTitle = pullRequest.title;

  for (const number of issueNumbersFrom(pullRequest.body || "")) {
    issueNumbers.add(number);
  }
}

const lines = [
  `# ${packageJson.name} ${tagName}`,
  "",
  `Base version: ${formatVersion(baseVersion)}`,
  `Package version: ${packageJson.version}`,
];

if (latestVersion) {
  lines.push(`Latest tag version: ${formatVersion(latestVersion)}`);
}

lines.push(`Release type: ${releaseType}`);
lines.push(`Has release: ${hasRelease ? "yes" : "no"}`);
lines.push("");

if (includedPullRequests.length > 0) {
  lines.push("## Pull Requests");
  lines.push("");

  for (const commit of includedPullRequests) {
    const title = commit.pullRequestTitle ? ` - ${commit.pullRequestTitle}` : "";
    lines.push(`- #${commit.mergePrNumber} \`${commit.shortHash}\` ${commit.subject}${title}`);
  }

  lines.push("");
}

lines.push("## Release Notes");
lines.push("");

let hasGroupedCommits = false;

for (const group of groupOrder) {
  if (grouped[group].length === 0) continue;

  hasGroupedCommits = true;
  lines.push(`### ${groupLabels[group]}`);
  lines.push("");
  lines.push(...grouped[group].map(commitLine));
  lines.push("");
}

if (!hasGroupedCommits) {
  lines.push("_No non-merge commits were detected in the release diff._");
  lines.push("");
}

lines.push("## Issues");
lines.push("");

if (issueNumbers.size === 0) {
  lines.push("_No linked issues were detected in the release diff._");
} else {
  lines.push(...[...issueNumbers].sort((a, b) => a - b).map(closeLine));
}

lines.push("");

const markdown = lines.join("\n");
writeFileSync(outputPath, markdown);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${formatVersion(nextVersion)}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=${tagName}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `release_type=${releaseType}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `has_release=${hasRelease ? "true" : "false"}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `notes_path=${outputPath}\n`);
}

console.log(`Generated ${tagName} release notes from ${commits.length} commits.`);
