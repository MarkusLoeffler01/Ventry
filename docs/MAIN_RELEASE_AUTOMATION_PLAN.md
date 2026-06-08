# Main Release Automation Plan

## Goal

Automate releases from `dev` to `main` without mutating `dev` before the release is actually merged.

The `dev -> main` pull request should show a release preview in read-only mode. After that pull request is merged into `main`, the release workflow should bump `package.json`, create the tag, create the GitHub Release, and open a sync-back pull request from `main` to `dev` so future release pull requests do not conflict on version files.

## Final Flow

### 1. Feature Pull Request Into `dev`

Branch example:

```text
51-test-automation2
```

Expected behavior:

- A feature pull request targets `dev`.
- The workflow reads the leading issue number from the branch name.
- The workflow adds `Fixes #51` to the pull request body.
- When the pull request is merged into `dev`, the linked issue moves to `Testing`.
- No release versioning happens at this stage.

### 2. Release Pull Request From `dev` to `main`

Pull request example:

```text
dev -> main
```

Expected behavior when the pull request is opened or updated:

- The workflow compares `main..dev`.
- It scans commits and pull request metadata.
- It determines the next semantic version from `package.json`.
- It generates preview release notes.
- It updates the pull request body with the release preview.

Important constraints:

- The workflow does not commit anything.
- The workflow does not modify `package.json`.
- The workflow does not create a tag.
- The workflow does not create a GitHub Release.

The release pull request is only a preview until it is merged.

### Release Version Override

The release workflow calculates the next semantic version from the commits in `dev -> main`. A maintainer can override the calculated version by adding a line like this to the release pull request body:

```text
Release version override: 0.2.1
```

The override is used by both the release preview and the final post-merge release workflow. It must be a valid `X.Y.Z` semantic version and must be greater than the base version selected from `package.json` and the latest `v*` tag.

### Main Target Guard

A pull request targeting `main` is expected to use:

```text
dev -> main
```

The `Guard main PR target` workflow fails for pull requests targeting `main` from any other branch. This makes accidental feature-branch-to-`main` pull requests visible in GitHub checks and can block merging when branch protection requires the check to pass.

For an intentional emergency or hotfix pull request directly into `main`, a maintainer can add the `confirmed-main-target` label. With that label present, the guard passes but still emits a warning in the check summary.

### 3. Merge `dev -> main`

Expected behavior when the release pull request is merged into `main`:

- The workflow checks out `main`.
- The workflow recomputes the release from the merged changes.
- It reads the current version from `package.json`.
- It calculates the next version.
- It commits the version bump directly to `main`.
- It creates tag `vX.Y.Z` on the version bump commit.
- It creates a GitHub Release using the generated notes.
- GitHub closes issues from `Closes #123` references in the merged release pull request.
- Closed issues move to `Done`.

### 4. Sync `main` Back Into `dev`

After the release is created, `main` is ahead of `dev` by the release bump commit.

To prevent future `dev -> main` conflicts on `package.json` or lockfiles, the workflow opens or updates a pull request:

```text
main -> dev
```

The sync pull request uses a release branch:

```text
release/sync-main-vX.Y.Z
```

Expected behavior:

- The branch is created from the released `main` commit.
- The pull request targets `dev`.
- The title is `chore(release): sync vX.Y.Z back into dev`.
- If it is clean, it can be merged normally or auto-merged later.
- If it conflicts, the conflict is visible and can be fixed manually.

Release sync commits and release sync merge commits must be ignored by future release-note generation so they do not create empty patch releases.

## Semantic Version Rules

Use Conventional Commit parsing and SemVer 2.0.0.

| Commit type | Release bump |
| --- | --- |
| `feat:` | minor |
| `feat(scope):` | minor |
| `fix:` | patch |
| `fix(scope):` | patch |
| `chore:` | patch |
| `chore(scope):` | patch |
| `refactor:` | patch |
| `refactor(scope):` | patch |
| `perf:` | patch |
| `perf(scope):` | patch |
| `feat!:` | major |
| `feat(scope)!:` | major |
| `fix!:` | major |
| `fix(scope)!:` | major |
| `BREAKING CHANGE:` | major |

The highest detected bump wins.

Examples:

```text
0.1.0 + fix: bugfix      -> 0.1.1
0.1.0 + feat: dashboard -> 0.2.0
0.1.0 + feat!: rewrite  -> 1.0.0
```

## Workflow Design

### `update-main-pr-description.yml`

Trigger:

```yaml
on:
  pull_request_target:
    types: [opened, edited, synchronize, reopened, ready_for_review]
    branches: [main]
```

Guards:

- Only run when the pull request targets `main`.
- Only run when the pull request head branch is `dev`.
- Only run for same-repository pull requests.

Responsibilities:

- Generate the release preview.
- Determine release type and next version.
- Generate grouped release notes.
- Collect linked pull request numbers.
- Collect linked issue numbers.
- Update the pull request body between stable marker comments.
- Never push commits.

Required permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

### `create-main-release.yml`

Trigger:

```yaml
on:
  pull_request_target:
    types: [closed]
    branches: [main]
```

Guards:

- Only run when the pull request was merged.
- Only run when the pull request head branch was `dev`.
- Do nothing if the merge commit is already contained in an existing `v*` release tag.
- Do nothing if there are no release-relevant commits.

Responsibilities:

- Check out `main` with the release automation token.
- Generate final release notes from the merged changes.
- Calculate the next version.
- Update `package.json`.
- Update `package-lock.json` when present.
- Commit the version bump:

```text
chore(release): vX.Y.Z
```

- Create tag `vX.Y.Z` on the version bump commit.
- Create the GitHub Release.
- Create or update the sync-back pull request from `release/sync-main-vX.Y.Z` into `dev`.

Required permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
```

## Branch Protection Constraint

The post-merge release workflow needs permission to push one version bump commit to `main`.

If `main` is protected, one of these must be true:

- the GitHub App can bypass branch protection,
- GitHub Actions is allowed to push to protected branches,
- or the workflow creates a follow-up version-bump pull request instead of committing directly to `main`.

The preferred implementation is allowing the GitHub App to push only this release bump commit to `main`.

## Existing Scripts To Reuse

Reuse and extend:

```text
.github/scripts/generate-release-notes.mjs
```

The script should continue to produce:

- release type,
- next version,
- tag name,
- grouped commits,
- pull request numbers,
- issue numbers,
- markdown release notes.

Add a package version bump helper:

```text
.github/scripts/set-package-version.mjs
```

The workflows use the same generation logic in two modes:

```text
preview mode: generate release metadata only
release mode: generate release metadata, bump package metadata, tag, release, and open sync PR
```

## Desired End State

Before merge, the `dev -> main` pull request shows:

- next version preview,
- release type,
- grouped release notes,
- issues that will close.

After merge, `main` contains:

- the merged `dev` changes,
- a `package.json` version bump commit,
- an updated `package-lock.json` when present,
- git tag `vX.Y.Z`,
- GitHub Release `vX.Y.Z`,
- closed issues moved to `Done`.

After release, `dev` receives:

- a sync-back pull request from released `main`,
- the same package version metadata as `main`,
- no release-note noise from the sync commit itself.
