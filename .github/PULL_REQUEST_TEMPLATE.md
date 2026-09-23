## What changed, and why

<!-- One behaviour per pull request. The changelog line under [Unreleased] says it for the reader. -->

## Before asking for review

- [ ] The gate is green (`npm run gate`), and CI runs the same steps
- [ ] A line under `## [Unreleased]` in the changelog, written for the reader
- [ ] No floor raised, no threshold lowered, no rule switched off without a reason in the decisions file
- [ ] A new guard or probe was seen red before green (a planted violation, then the fix)
- [ ] Docs that describe the changed code were re-read against it (`last_verified`), not just dated
- [ ] Behaviour kept identical in a refactor, and the commit says how that was checked
