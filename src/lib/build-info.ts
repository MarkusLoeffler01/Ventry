import { execFileSync } from "node:child_process";
import packageJson from "@root/package.json";

const REPOSITORY_URL = "https://github.com/Ventry-io/Ventry";

function readGitValue(args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function formatBuildDate(value: string | undefined) {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function getBuildInfo() {
  const commit =
    process.env.NEXT_PUBLIC_GIT_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    readGitValue(["rev-parse", "--short", "HEAD"]);

  const tag =
    process.env.NEXT_PUBLIC_GIT_TAG ??
    readGitValue(["describe", "--tags", "--abbrev=0"]) ??
    "";

  return {
    buildDate: formatBuildDate(
      process.env.NEXT_PUBLIC_BUILD_DATE ??
        process.env.BUILD_DATE ??
        readGitValue(["show", "-s", "--format=%cI", "HEAD"]),
    ),
    commit: commit || "unknown",
    repositoryUrl: REPOSITORY_URL,
    tag: tag || `v${packageJson.version}`,
    version: packageJson.version,
  };
}
