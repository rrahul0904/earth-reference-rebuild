# Earth final integration and certification

**Audit date:** 2026-10-01 (America/New_York)
**Repository:** `rrahul0904/earth-reference-rebuild`
**Canonical hostname:** <https://earth-reference-rebuild.vercel.app>
**Status:** IN PROGRESS; production certification is not established.

This record separates observed state from work that remains unverified. The machine-readable evidence ledger is [`earth-final-certification.json`](earth-final-certification.json). Per-task records live in [`agents/`](agents/), and tracker history is in [`TRACKER_RECONCILIATION.md`](TRACKER_RECONCILIATION.md).

## Repository and remote state

The latest read-only remote check confirms `main` is still `e314e8c015bb87a481985b195148c2585b0f10bf`. PR #13 remains draft, open, unmerged and mergeable-clean, with head `e95d6f9c435ae68e78118fe85d9281bf0522992b`, base `e314e8c015bb87a481985b195148c2585b0f10bf`, 10 commits and 9 files. Its supplied quality run #121 / `35677531139` is verified as successful on that exact PR head and its unexpired `earth-browser-evidence` artifact is present (6,004,593 bytes). The latest successful quality workflow on main is run #114 / `35362128207`, conclusion `success`, on the same main SHA (2026-09-18). Those earlier runs do not certify the current integration candidate.

The integration candidate is pushed on `codex/earth-final-integration` at `67932498a531a1436b5c8050f7586496b271874e`; draft PR [#16](https://github.com/rrahul0904/earth-reference-rebuild/pull/16) is open against `main`. PR #13 remains open and unmerged. GitHub Actions quality run [#124](https://github.com/rrahul0904/earth-reference-rebuild/actions/runs/36910230254) passed on that exact SHA. The canonical page returns HTTP 200, while `/release.json` returns HTTP 404. No candidate deployment ID, Preview URL, or production source SHA is observable.

## Work and checks

The integration branch contains the PR #13 dependency lockfile and hardening for malformed saved preferences, event retention and deterministic IDs, region-aware place listings, bounded orbital sampling, cached orbital prediction, synchronous Story seeking, Story interruption and reduced-motion camera behavior, keyboard-accessible city-neighborhood focus, and release metadata validation. Two browser regressions found during testing are fixed: the Story Pause control could immediately restart on mobile, and an internally triggered experience switch could close the Systems drawer.

The locally integrated Living World changes add option/tick/event bounds, household membership consistency, snapshot graph validation, and a bounded population cache. They passed deterministic replay, restore-continuation, bounds and graph-invariant tests, and the opt-in layer's browser acceptance. The fetched PR remains unmerged remotely.

Verification performed after a clean `npm ci --no-audit --no-fund`:

- `npm test` passes: static smoke, deterministic Living World replay/bounds/snapshot invariants, and release metadata tests (3/3).
- `tests/quality.spec.mjs` passes 9/9; `tests/security.spec.mjs` passes 9/9; `tests/convergence.spec.mjs` passes 8/8. Three separately targeted browser regressions also passed.
- The hosted GitHub Actions quality workflow ran the complete browser acceptance on the exact candidate SHA: 40/40 Playwright tests passed. It uploaded `earth-browser-evidence` (artifact ID `11188567076`, 6,044,730 bytes). This verifies automated acceptance; an independent human visual/accessibility review of the screenshots remains outstanding.
- Workflow YAML, the Vercel rollback URL guard, and `git diff --check` pass local validation. No deployment or production mutation was attempted.

The repository's `quality` action runs `npm test` and the full Playwright suite on pushes to `main` and pull requests. The release action repeats browser acceptance before promotion and against the canonical alias afterward. The exact candidate SHA has run successfully in GitHub Actions (quality run #124 / `36910230254`).

## Release gates

The Vercel workflow requires a successful quality run for the current `main` SHA, fails closed if no safe previous Vercel deployment can be captured for rollback, stamps the exact candidate SHA, verifies the immutable candidate marker/assets, runs browser acceptance before promotion, then checks the canonical alias and conditionally rolls back after a post-promotion failure. YAML parsing and the rollback URL normalization guard pass locally. The quality workflow passed on the candidate; the deployment workflow has not been run.

No immutable Vercel candidate, deployment ID, production promotion, fresh production browser run, rollback test, or exact SHA equality proof exists. The release is not ready. GitHub repository secret and variable listings are empty, and the deployments API returned no records. Vercel CLI access is unavailable and the dashboard redirected to sign-in; no credentials were entered. The workflow contains existing org/project IDs, but they could not be verified against the Vercel account. The release operator needs authenticated access to that existing Vercel project, must verify its GitHub repository/branch settings, and configure `VERCEL_TOKEN` before staging a Preview. Keep promotion gated on a separate release decision. Tracker reconciliation also requires the canonical tracker connection. Do not paste credentials into chat.

## Capability review

The starting PR #11 documentation records selected lunar exploration and city discovery and deliberately excludes Moonstake commerce, orbital racing/economy, Infinite City contribution games, Agent Atlas fingerprinting, and Where Is Mr. Kim scoring. Earth issue #12 / PR #13 map World-Sim to an opt-in local deterministic layer. RomanCivilizations remains excluded from Earth under the user's explicit instruction; its older repository proposal is historical. The local repository and complete available Git history contain no verified approved STEMKit requirement.
