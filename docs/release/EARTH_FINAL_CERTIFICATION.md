# Earth final integration and certification

**Audit date:** 2026-10-01 (America/New_York)
**Repository:** `rrahul0904/earth-reference-rebuild`
**Canonical hostname:** <https://earth-reference-rebuild.vercel.app>
**Status:** IN PROGRESS; production certification is not established.

This record separates observed state from work that remains unverified. The machine-readable evidence ledger is [`earth-final-certification.json`](earth-final-certification.json). Per-task records live in [`agents/`](agents/), and tracker history is in [`TRACKER_RECONCILIATION.md`](TRACKER_RECONCILIATION.md).

## Repository and remote state

The latest read-only remote check confirms `main` is still `e314e8c015bb87a481985b195148c2585b0f10bf`. PR #13 remains draft, open, unmerged and mergeable-clean, with head `e95d6f9c435ae68e78118fe85d9281bf0522992b`, base `e314e8c015bb87a481985b195148c2585b0f10bf`, 10 commits and 9 files. Its supplied quality run #121 / `35677531139` is verified as successful on that exact PR head and its unexpired `earth-browser-evidence` artifact is present (6,004,593 bytes). The latest successful quality workflow on main is run #114 / `35362128207`, conclusion `success`, on the same main SHA (2026-09-18). Neither run certifies this local integration candidate.

The current local branch is `codex/earth-final-integration`, based on main and locally merged with PR #13's fetched candidate. The final candidate is committed locally but has not been pushed. No authenticated GitHub write credential or Vercel CLI credential is available. The canonical page returns HTTP 200, while `/release.json` returns HTTP 404. There is no deployment ID or source SHA evidence for production.

## Work and checks

The integration branch contains the PR #13 dependency lockfile and hardening for malformed saved preferences, event retention and deterministic IDs, region-aware place listings, bounded orbital sampling, cached orbital prediction, synchronous Story seeking, Story interruption and reduced-motion camera behavior, keyboard-accessible city-neighborhood focus, and release metadata validation. Two browser regressions found during testing are fixed: the Story Pause control could immediately restart on mobile, and an internally triggered experience switch could close the Systems drawer.

The locally integrated Living World changes add option/tick/event bounds, household membership consistency, snapshot graph validation, and a bounded population cache. They passed deterministic replay, restore-continuation, bounds and graph-invariant tests, and the opt-in layer's browser acceptance. The fetched PR remains unmerged remotely.

Verification performed after a clean `npm ci --no-audit --no-fund`:

- `npm test` passes: static smoke, deterministic Living World replay/bounds/snapshot invariants, and release metadata tests (3/3).
- `tests/quality.spec.mjs` passes 9/9; `tests/security.spec.mjs` passes 9/9; `tests/convergence.spec.mjs` passes 8/8. Three separately targeted browser regressions also passed.
- The existing visual `tests/browser.spec.mjs` run passed 4 of 6 tests before it was stopped under the user's instruction to avoid further long-running local Chromium work. Two did not run. Existing `productization` and `resilience` browser suites were not run. The complete visual review and full browser acceptance therefore remain unverified locally.
- Workflow YAML, the Vercel rollback URL guard, and `git diff --check` pass local validation. No deployment or production mutation was attempted.

The repository's `quality` action runs `npm test` and the full Playwright suite on pushes to `main` and pull requests. The release action repeats browser acceptance before promotion and against the canonical alias afterward. No candidate SHA has run in GitHub Actions yet.

## Release gates

The Vercel workflow requires a successful quality run for the current `main` SHA, fails closed if no safe previous Vercel deployment can be captured for rollback, stamps the exact candidate SHA, verifies the immutable candidate marker/assets, runs browser acceptance before promotion, then checks the canonical alias and conditionally rolls back after a post-promotion failure. YAML parsing and the rollback URL normalization guard pass locally. GitHub Actions has not executed this revised workflow.

No immutable candidate, deployment ID, production promotion, fresh production browser run, rollback test, or exact SHA equality proof exists. The release is not ready. The external release owner must enable authenticated GitHub write/Actions access and the Vercel project token/permissions so the finalized candidate can be pushed, merged and deployed through the guarded action. Tracker reconciliation also requires the canonical tracker connection. Do not paste credentials into chat.

## Capability review

The starting PR #11 documentation records selected lunar exploration and city discovery and deliberately excludes Moonstake commerce, orbital racing/economy, Infinite City contribution games, Agent Atlas fingerprinting, and Where Is Mr. Kim scoring. Earth issue #12 / PR #13 map World-Sim to an opt-in local deterministic layer. RomanCivilizations remains excluded from Earth under the user's explicit instruction; its older repository proposal is historical. The local repository and complete available Git history contain no verified approved STEMKit requirement.
