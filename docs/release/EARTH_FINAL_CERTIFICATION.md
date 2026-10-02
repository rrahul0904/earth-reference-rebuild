# Earth final integration and certification

**Audit date:** 2026-10-02 (America/New_York)
**Repository:** `rrahul0904/earth-reference-rebuild`
**Canonical hostname:** <https://earth-reference-rebuild.vercel.app>
**Status:** IN PROGRESS; production certification is not established.

This record separates observed state from work that remains unverified. The machine-readable evidence ledger is [`earth-final-certification.json`](earth-final-certification.json). Per-task records live in [`agents/`](agents/), and tracker history is in [`TRACKER_RECONCILIATION.md`](TRACKER_RECONCILIATION.md).

## Repository and remote state

The latest read-only remote check confirms `main` is still `e314e8c015bb87a481985b195148c2585b0f10bf`. PR #13 remains open, draft, unmerged and mergeable-clean, with head `e95d6f9c435ae68e78118fe85d9281bf0522992b`. Its prior quality run #121 / `35677531139` passed on that exact head. The latest successful quality workflow on main remains run #114 / `35362128207` on the main SHA; neither historical run certifies the current integration candidate.

The integration candidate is pushed on `codex/earth-final-integration` at `6e01a26a858562c9d02ab4efbe507339ef829c27`; draft PR [#16](https://github.com/rrahul0904/earth-reference-rebuild/pull/16) is open against `main`. Its exact-head quality run [#127](https://github.com/rrahul0904/earth-reference-rebuild/actions/runs/37016618421) passed, including 40/40 hosted Chromium Playwright tests. Artifact `earth-browser-evidence` (ID `11231583639`, 6,043,337 bytes) was uploaded. Run #126 passed 38/40 tests but exposed an Oceans screenshot timeout and a city-centering assertion by 0.18 pixels; both focused tests passed locally after a CI timeout allowance and a 4-pixel centering tolerance, then run #127 passed. The preceding candidate `e23081f67b98b512f06a3d9e55ebdeca2be4f369` also passed run #125. The canonical page previously returned HTTP 200, while `/release.json` returned HTTP 404. No candidate deployment ID, Preview URL, or production source SHA is observable.

## Work and checks

The integration branch contains the PR #13 dependency lockfile and hardening for malformed saved preferences, event retention and deterministic IDs, region-aware place listings, bounded orbital sampling, cached orbital prediction, synchronous Story seeking, Story interruption and reduced-motion camera behavior, keyboard-accessible city-neighborhood focus, and release metadata validation. Two browser regressions found during testing are fixed: the Story Pause control could immediately restart on mobile, and an internally triggered experience switch could close the Systems drawer.

The locally integrated Living World changes add option/tick/event bounds, household membership consistency, snapshot graph validation, and a bounded population cache. They passed deterministic replay, restore-continuation, bounds and graph-invariant tests, and the opt-in layer's browser acceptance. The fetched PR remains unmerged remotely.

Verification performed after a clean `npm ci --no-audit --no-fund`:

- `npm test` passes: static smoke, deterministic Living World replay/bounds/snapshot invariants, and release metadata tests (3/3).
- Focused local retests of the Oceans capture and city centering checks pass. The current hosted quality run completed the full 40-test Playwright suite successfully on the exact candidate SHA.
- Run #127 uploaded `earth-browser-evidence` (artifact ID `11231583639`, 6,043,337 bytes). This verifies automated acceptance; an independent human visual/accessibility review of hosted screenshots remains outstanding.
- Workflow YAML, all workflow shell blocks, the static smoke/core/release-metadata suites, and `git diff --check` pass local validation. No deployment or production mutation was attempted.

The repository's `quality` action runs `npm test` and the full Playwright suite on pushes to `main` and pull requests. The release action repeats browser acceptance before promotion and against the canonical alias afterward. Exact candidate SHA `6e01a26a858562c9d02ab4efbe507339ef829c27` passed GitHub Actions quality run #127 / `37016618421`.

## Release gates

The Vercel workflow requires a successful push-triggered quality run for the current `main` SHA, fails closed if no safe previous Vercel deployment can be captured for rollback, stamps the exact candidate SHA, verifies immutable candidate metadata and assets, runs browser acceptance before promotion, reconfirms `main`, its exact quality run, and the prior alias in the promotion step, then checks the canonical alias and conditionally verifies rollback after a post-promotion failure. Promotion and alias checks are separate operations; Vercel exposes no atomic compare-and-swap guard here, so an external promotion can still race the check. Local YAML parsing, workflow shell syntax parsing, smoke tests, deterministic kernel checks, release metadata tests, focused Playwright retests, and `git diff --check` pass. Exact-head run #127 passed; the production deployment workflow has not been run.

**Status: `BLOCKED_EXTERNAL: VERCEL_DEPLOY_AUTHORIZATION`.** The user supplied the verified existing Vercel team/project IDs (`team_zmEezpOKGZy2sH5nqTfO44LD` / `prj_UL4T4q0fiT7KdEKoBLai6i44E4YS`). No repository `VERCEL_TOKEN` secret is configured, no authenticated Vercel CLI/dashboard session or deployment history is available, and no PR-head Preview URL has been observed. The release operator must authorize Vercel deployment access to this existing project, preferably through the repository secret or an authenticated Vercel-native integration. Then stage and independently verify the exact Preview before considering merge. No production mutation has been attempted. Tracker reconciliation also requires the canonical tracker connection. Do not paste credentials into chat.

## Capability review

The starting PR #11 documentation records selected lunar exploration and city discovery and deliberately excludes Moonstake commerce, orbital racing/economy, Infinite City contribution games, Agent Atlas fingerprinting, and Where Is Mr. Kim scoring. Earth issue #12 / PR #13 map World-Sim to an opt-in local deterministic layer. RomanCivilizations remains excluded from Earth under the user's explicit instruction; its older repository proposal is historical. The local repository and complete available Git history contain no verified approved STEMKit requirement.
