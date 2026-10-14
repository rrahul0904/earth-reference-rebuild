# Earth master implementation baseline

**Observed:** 2026-10-13 (America/New_York)  
**Repository:** `rrahul0904/earth-reference-rebuild`  
**Branch:** `codex/earth-now-live-runtime`, created from `origin/main`  
**Canonical URL:** https://earth-reference-rebuild.vercel.app

This is the verified starting receipt for the current implementation. Earlier certification files remain historical records and are not overwritten.

## Verified source and production

- `origin/main`: `88abe555798356e64b24e6422137e8731695e8f1` (`docs: certify deployed Earth production baseline`).
- Runtime deployed SHA: `8a2ad0678fadb793e1f820a64b718a278aaf44f3`.
- `https://earth-reference-rebuild.vercel.app/release.json`: HTTP 200; body `{"sha":"8a2ad0678fadb793e1f820a64b718a278aaf44f3"}`.
- Canonical homepage: HTTP 200. `/api/release`, `/earth-convergence.js`, `/app-1.js`, and `/assets/earth/earth_atmos_2048.jpg`: HTTP 200.
- Expected Earth Now and Wildlife runtime entry points are not deployed yet: `/earth-now-core.js`, `/earth-now-browser.js`, `/wildlife-core.js` return HTTP 404.
- This proves the current production release is the previously certified runtime, not the later documentation-only `main` SHA. No candidate Preview or rollback deployment ID was available to inspect.

## Quality and visual evidence

- Latest successful quality workflow: [run #146](https://github.com/rrahul0904/earth-reference-rebuild/actions/runs/38339721286), exact `main` SHA `88abe555798356e64b24e6422137e8731695e8f1`, completed 2026-10-13 03:25 UTC.
- Result: success; hosted Playwright suite reported 40 passed (23.0m).
- Artifact `earth-browser-evidence`: ID `11787036870`, 6,018,739 bytes, SHA-256 `48acec495d81a1d4a466c6cbcd01f13ee3a2a82c1b8e4a2199920bd16bb60604`.
- Artifact downloaded to `/tmp/earth-main-146`; reviewed `test-results/00-planet-present.png`. It shows the present-day photographic globe, editorial copy, top-level navigation, and timeline. This is a current-main baseline capture, not a Preview of this implementation.
- Local baseline checks passed: `tests/smoke.mjs`, `tests/living-world-core.mjs`, and `tests/release-metadata.spec.mjs` (3/3).

## GitHub reconciliation

- PR #11 and PR #13 are merged; integration PR #16 merged at runtime SHA `8a2ad0678fadb793e1f820a64b718a278aaf44f3`.
- PR #18 (Earth Now) was open/draft at baseline, head `f796b852e7b932ee183007cbc726f9a2455c007d`, based on stale integration commit `3e4340c23cb3f43187e2a85bbcee5bd70d3016b8`; its 12 commits were recovered as source material, not merged blindly. It is now closed and linked to its successor PR #21, preserving the original history.
- PR #20 (RE-396 / biodiversity) remains open/draft, head `ddb600fba120056d43835c720fc88457cdc13aff`, based on old `main` `e314e8c015bb87a481985b195148c2585b0f10bf`; the deterministic provider contracts and tests exist, but browser product UI is not yet included.
- Issue #12's checklist still claims exact-head verification and merge are outstanding, despite PR #13 and #16 being merged. Its status must be reconciled with the merge evidence while retaining the issue history.
- GitHub Actions production deploy run #92 failed at authorization because `VERCEL_TOKEN` is missing; no repository secret is configured. The failure occurred before deployment, and no deployment mutation was attempted.
- The Vercel team/project IDs in prior records are `team_zmEezpOKGZy2sH5nqTfO44LD` / `prj_UL4T4q0fiT7KdEKoBLai6i44E4YS`. They identify the intended project but do not provide deploy authorization. No Vercel CLI login, deploy integration tool, Preview URL, or rollback deployment ID is available in this session.
- GitHub reports `main` is not protected. Governance remains an unresolved repository setting.

## Phase ledger

| Phase | State | Evidence / next gate |
| --- | --- | --- |
| 0 — baseline and recovery | VERIFIED | Current main and production receipts above; baseline suite passes; current browser artifact reviewed. Issue #12 was commented with merge evidence and closed; historical issue text remains available. |
| 1 — Earth Now fixture vertical | TESTED | The 12 feature commits from PR #18 replayed cleanly. Contracts pass (26 node tests across the suite); focused Chromium Earth Now tests pass (4/4), including fixture truth, provider outage, event selection, shared 24-hour timeline, and mocked same-origin live mode. |
| 2 — live USGS/NOAA runtime | TESTED LOCALLY; Preview pending | Same-origin Vercel functions, bounded upstream fetch, exponential retry/cooldown, TTL cache, stale-provider-down states, evidence receipts, source links, and 24-hour timeline integration are implemented. Both actual handlers returned HTTP 200 against the official feeds with validated signals and receipts; the sampled feed data classified as stale, and the UI preserves that freshness state. Exact-head hosted CI and Vercel Preview remain next. |
| Preview / production | BLOCKED EXTERNAL | Vercel authorization and deployment evidence unavailable; do not claim deployment readiness or production verification. |

Current implementation PR: [#21](https://github.com/rrahul0904/earth-reference-rebuild/pull/21), head `30af7be300a06d2e9b57bdf9d9acf4bb9030ec1c`. Issue #17 now links the implementation and remaining gates. GitHub exact-head quality is pending.

Machine-readable mirror: [`earth-master-implementation-ledger.json`](earth-master-implementation-ledger.json).
