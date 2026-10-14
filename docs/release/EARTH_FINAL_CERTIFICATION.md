# Earth final integration and certification

**Audit date:** 2026-10-12 (America/New_York)  
**Repository:** `rrahul0904/earth-reference-rebuild`  
**Canonical hostname:** <https://earth-reference-rebuild.vercel.app>  
**Core release status:** **PRODUCTION VERIFIED**  
**Expansion roadmap status:** **ACTIVE — not all donor/roadmap work is production-complete**

## Superseding observation — 2026-10-13

The certification above records the 2026-10-12 observation and remains historical evidence. A fresh read-only check found `main` at `88abe555798356e64b24e6422137e8731695e8f1`; canonical production continues to serve runtime SHA `8a2ad0678fadb793e1f820a64b718a278aaf44f3` according to `/release.json`. Quality run #146 passed on the current `main` SHA. Earth Now/Wildlife source modules are not present in that deployed runtime. Production workflow run #92 stopped before deployment because `VERCEL_TOKEN` is unavailable. No new Preview, deployment ID, or rollback target was observed. See the date-stamped evidence record [`EARTH_MASTER_IMPLEMENTATION_BASELINE_2026-10-13.md`](EARTH_MASTER_IMPLEMENTATION_BASELINE_2026-10-13.md).

This record distinguishes the certified production baseline from later expansion work. Do not use completion of the core release to imply that every future donor integration or roadmap issue is complete.

## Certified production baseline

The certified application revision is `8a2ad0678fadb793e1f820a64b718a278aaf44f3`.

- PR #16 (`feat: integrate Earth release hardening and Living World`) is merged to `main`.
- `main` points to `8a2ad0678fadb793e1f820a64b718a278aaf44f3`.
- GitHub Actions quality run #144 / `38119459448` completed successfully on that exact SHA.
- Run #144 produced the `earth-browser-evidence` artifact (ID `11695730742`, SHA-256 `5c04a403c846f430124d4ede96dc03fe25f76e7a184bd7c48aab1e288e820ca7`).
- The artifact includes desktop, mobile, Moon, orbit, earthquakes, oceans, solar-system, convergence-layer, Living World, and fallback screenshots. Manual review on 2026-10-12 found no obvious gross layout or rendering regressions in the captured tested states.

## Production deployment

Vercel production deployment `dpl_3NFCpTvtiyGQzAKqPctNcerP6uZe` is `READY` on project `prj_UL4T4q0fiT7KdEKoBLai6i44E4YS`, team `team_zmEezpOKGZy2sH5nqTfO44LD`.

Observed release evidence on 2026-10-12:

- canonical root `https://earth-reference-rebuild.vercel.app/` returns HTTP 200 and serves the Earth application shell;
- `https://earth-reference-rebuild.vercel.app/release.json` returns HTTP 200 with SHA `8a2ad0678fadb793e1f820a64b718a278aaf44f3`;
- the deployment metadata reports the same GitHub commit SHA;
- the canonical alias is attached to the production deployment;
- no production `error` or `fatal` runtime logs were returned in the most recent 50-minute Vercel Hobby retention window checked during this audit;
- prior production deployment `dpl_2LRsXkNpvTRXfVz5FLQZE5Xhq296` remains available as a concrete rollback candidate.

This closes the former `BLOCKED_EXTERNAL: VERCEL_DEPLOY_AUTHORIZATION` condition and the former inability to prove which source SHA was serving production.

## What the certified baseline contains

The merged baseline includes the Earth/deep-time experience plus integrated exploration work covering orbit, Moon/landmarks, earthquakes, oceans/currents, solar-system states, connected Earth-system layers, city/place behavior, Story behavior, share/runtime assets, release provenance, and the opt-in deterministic Living World layer.

Hardening includes deterministic event IDs/replay behavior, bounded orbital sampling, saved-preference validation, regional place filtering, keyboard focus behavior, reduced-motion and Story interruption handling, release metadata verification, candidate/production SHA checks, and rollback-aware release logic.

## Expansion work that is not part of the certified production claim

The project continues to accept new reverse-engineering donors and capability lanes. Those lanes must meet the same fixture → browser → hosted-preview → exact-SHA → production gates before they can be called complete.

Known open work at this audit includes:

- PR #18 / Earth Now live signals: currently a draft, fixture-certified slice. It explicitly does not yet claim production readiness or broad live-provider ingestion.
- PR #20 / RE-396 biodiversity field guide: currently a draft contract/privacy lane. It does not yet include the complete browser product slice, live biodiversity providers, or production certification.

These open expansions do **not** invalidate the certified core deployment, but they mean the wider roadmap remains active.

## Release discipline / remaining engineering housekeeping

- `main` is currently not protected by a GitHub branch-protection rule. Production quality checks exist, but repository protection should be enabled administratively so direct accidental changes cannot bypass the intended merge/check discipline.
- The release document must be updated whenever the certified production SHA changes; a stale certification record is itself a release-process defect.
- Runtime-log retention on the current Vercel Hobby plan is limited; longer production observability requires a plan/observability change rather than an application-code fix.

## Capability boundaries

The Earth project integrates capabilities, not donor branding or proprietary source. Commerce/economy mechanics, contribution games, fingerprinting, scoring systems, or other donor-specific product mechanics remain out of scope unless explicitly approved as Earth requirements. RomanCivilizations remains excluded from Earth under the user's earlier direction.

## Certification verdict

**CORE EARTH PRODUCT: PASS / DEPLOYED / SHA-VERIFIED.**

Do not describe the entire evolving Earth roadmap as finished while draft expansion PRs or newly accepted reverse-engineering lanes remain incomplete. Each added lane must earn its own production evidence before being merged into the certified baseline.
