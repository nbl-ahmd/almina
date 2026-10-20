# Branch workflow and cleanup — 20 October 2026

## Current branches

- `master`: protected default and release branch. Local `master` now matches `origin/master`; deployment workflows continue using this existing name.
- `codex/homepage-product-redesign`: current development branch, tracking the same GitHub branch and containing all of `master`. Its outstanding changes are reviewed in [PR #54](https://github.com/nbl-ahmd/almina/pull/54).

These two branches intentionally differ while the PR is open. Cleanup does not authorize merging unfinished work or deploying it. Merge through the protected PR process after required checks and release review.

## Cleanup performed

Removed 65 obsolete remote branches and 64 obsolete local branches. Candidates were verified as reachable from release history, already merged through a GitHub PR (including squash/changed-history merges), or containing no unique non-merge commits beyond current development. The one local-only publication documentation checkpoint is preserved on GitHub as `archive/catalogue-publication-record-2026-10-20`; it records historical observations and was not reapplied over newer documentation.

All original local and remote branch tips, classifications, PR evidence and deletion decisions are retained in ignored `outputs/branch-cleanup-2026-10-20/`. Its verified `all-refs.bundle` preserves the original Git history for recovery. Keep this local backup. A branch can be recovered using its original SHA recorded in `refs-before.txt` after importing the bundle if necessary.

The clean OpenCode admin checkout remains at its existing commit with detached HEAD. Its files were not removed. Start a new feature branch there before making further changes.

## Ongoing workflow

1. Start each new concern from an updated `master` in a short-lived `codex/<concern>` branch.
2. Commit and push work to that branch; open a PR targeting `master`.
3. Keep the branch updated from `origin/master` without rewriting shared history.
4. Merge after required checks and release review. GitHub now automatically deletes merged PR branches.
5. Fetch with pruning, fast-forward local `master`, and remove the completed local branch. Avoid reusing an already merged PR branch for a new concern.

No application code, production data, branch protection or release branch name changed in this cleanup. No production merge or deployment was triggered by updating `master`.
