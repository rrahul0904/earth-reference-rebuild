# RE-396 — Anidex biodiversity / visual wildlife field-guide donor

Status: **UNDERSTAND + DEFINE + bounded C1 core / not deployed**  
Canonical destination: `rrahul0904/earth-reference-rebuild`  
Coordination: Issue #19 / draft PR #20  
Source supplied by user: https://www.reddit.com/r/vibecoding/s/RXdKMGsjlY  
Resolved launch thread: https://www.reddit.com/r/vibecoding/comments/1x2k1j6/visual_animal_site/  
Observed product: https://anidex.fyi/

> Tracker identity correction: this intake briefly used RE-395 against the then-current RE-394 workbook. A newer canonical tracker landed concurrently and assigned RE-395 to Abhidu. This lane was moved to collision-free **RE-396** before tracker promotion.

## 1. Evidence boundary

This dossier uses public behavior, launch copy, public provider documentation, and owned-repository evidence only. It does **not** infer or copy Anidex private source code, private APIs, prompts, assets, models, database design, branding, screenshots, or implementation details.

The creator says the public experience was built with Opus 5.5 and ThreeJS. That is a source claim, not a requirement that our implementation mirror the same stack.

At research time, the supplied Reddit thread exposed the launch post and creator link but no substantive independent human feedback. We therefore record **no independent user-feedback conclusions** yet.

Older projects with the same `Anidex` name surfaced in search. They are treated as name collisions and are not presumed to be related to the supplied product.

## 2. Observed product proposition

The launch post describes a visual, low-clutter “real animal Pokédex” intended to make animal discovery easier than dense reference pages. The observable product promises three differentiating interactions:

1. compare animal statistics / scale directly against yourself;
2. discover wildlife living near you;
3. see population trends / conservation context with just the essentials.

The live page title observed during research frames the product as a field guide to animals that may be lost, which makes conservation state a central product signal rather than decorative metadata.

### What is *not* established

- the site's private data model or backend;
- which biodiversity providers it actually uses;
- whether population trend is live, historical, modeled, or hand-curated;
- whether nearby wildlife comes from observations, range polygons, or a proprietary index;
- whether animal measurements are averaged, sex-specific, life-stage-specific, or maximum values;
- content/image/model licensing;
- analytics, auth, persistence, monetization, or scale architecture;
- ThreeJS scene structure or source implementation.

## 3. Canonical product mapping

Do not create a duplicate standalone product yet.

`earth-reference-rebuild` already owns interactive Earth-system experiences, geospatial layer composition and point selection, present-day/historical Earth presentation, mobile/browser interaction patterns, evidence/provenance notices, and deterministic fallback behavior.

RE-396 therefore becomes an optional **Life / Wildlife** experience or Earth layer. It should reuse the existing Earth shell and provenance/resilience patterns while contributing a biodiversity-specific domain model.

## 4. Competitor / reference scan

These references are capability comparators and data-contract inputs, not UI/code donors.

### iNaturalist

Official API/docs:

- https://api.inaturalist.org/
- https://www.inaturalist.org/pages/developers
- https://www.inaturalist.org/pages/api+recommended+practices

Relevant facts:

- geographic observation queries are supported;
- provider geoprivacy / obscured observations must remain obscured;
- iNaturalist asks API clients to stay at or below roughly 60 requests/minute even though throttling is higher;
- current/new API is preferred over deprecated endpoints.

Engineering synthesis: strongest first live adapter for a read-only “near me” feature after fixture acceptance.

### GBIF

Official technical docs:

- https://techdocs.gbif.org/en/openapi/v1/occurrence
- https://techdocs.gbif.org/en/data-use/api-sql-downloads

Relevant facts:

- occurrence search supports indexed biodiversity occurrence records;
- records can carry decimal coordinates and coordinate uncertainty;
- geospatial predicates / within queries are available.

Engineering synthesis: useful secondary provider and cross-check source, not needed in the first provider slice.

### IUCN Red List

Official supporting-information docs:

- https://nrl.iucnredlist.org/assessment/supporting-information

Relevant fact: current population trend is a categorical assessment value: **increasing, decreasing, stable, or unknown**.

Engineering synthesis: never turn this field into a synthetic historical line chart. If we later show a historical population series, it must come from a separate quantitative, source-dated series with explicit uncertainty.

## 5. Product synthesis

Our independent version should answer five questions with almost no cognitive overhead:

1. **What is it?** — identity, taxonomy, short evidence-backed summary.
2. **How big is it?** — measurement-aware scale against a local user-height reference.
3. **Where is it?** — range and/or recent nearby observations, clearly distinguished.
4. **How is it doing?** — conservation category + current population direction + assessment date.
5. **Can I trust this?** — provenance, freshness, rights, and uncertainty visible without leaving the experience.

## 6. Domain contracts

```text
SpeciesProfile
  id
  commonName
  scientificName
  taxonomy
  summary
  heroAssetId?
  sourceReceiptIds[]

SpeciesMeasurement
  id
  speciesId
  dimensionType      // body_length | shoulder_height | standing_height | wingspan | mass | ...
  value?
  min?
  max?
  unit
  qualifier          // typical | mean | range | maximum | estimate
  sex?
  lifeStage?
  sourceReceiptId

ConservationAssessment
  id
  speciesId
  status
  populationTrend    // increasing | decreasing | stable | unknown
  trendQualifier?
  assessedAt?
  publishedAt?
  sourceReceiptId

OccurrenceObservation
  provider
  providerObservationId
  speciesId?
  scientificName
  observedAt?
  coarseLatitude?
  coarseLongitude?
  positionalUncertaintyM?
  obscured
  sourceReceiptId

NearbyQuery
  coarseArea
  radiusKm
  taxonFilters[]?
  requestedAt

SourceReceipt
  id
  provider
  sourceUrlOrId
  fetchedAt
  license?
  attribution?
  freshnessClass
  evidenceHash?

VisualAsset
  id
  type
  sourceUrlOrId
  license
  attribution
  derivativeAllowed
  sourceReceiptId
```

### Measurement invariant

There is no generic “animal size” field. Every rendered comparison must identify what is being compared: body length, shoulder height, wingspan, standing height, mass, etc. Typical, range, maximum, sex, and life-stage semantics cannot be silently collapsed.

## 7. Privacy / safety contract for “near me”

- location permission is optional;
- user can choose a place manually;
- precise browser coordinates stay in memory only unless a later explicit feature requires persistence;
- logs, analytics, receipts, screenshots, and crash reports must not contain raw precise coordinates;
- provider-obscured locations are never sharpened, interpolated, or deanonymized;
- cache keys use bounded/coarsened areas rather than raw device coordinates;
- location denial is a normal supported state, not an error dead-end.

## 8. Provenance and asset rights

Every user-visible fact that can materially affect interpretation needs a `SourceReceipt`. Every visual asset needs explicit rights metadata.

Fail closed when a measurement lacks its source/meaning, a conservation fact lacks source/assessment context, an asset has unknown/incompatible reuse rights, or an occurrence would expose a more precise location than its provider returned.

## 9. Roadmap gates

### A — UNDERSTAND

Status: **PASS / evidence captured with gaps explicit**

Exit evidence: supplied launch behavior captured; visible comment corpus audited; source/provider unknowns separated from facts; internal tracker dedupe performed; canonical Earth mapping selected; clean-room boundary explicit; comparator/provider scan sufficient to define contracts.

Do not claim: private architecture, source parity, data-provider parity, benchmark parity.

### B — DEFINE

Status: **PASS / bounded contract frozen in Issue #19 + this dossier**

Fixture-first acceptance slice:

`species index → species detail → compare-to-me → nearby fixture → conservation state → provenance drawer`

Use 12–20 curated fixtures with field-level source receipts and no dependency on live providers.

Required failure cases:

- ambiguous measurement semantics rejected;
- missing provenance cannot enter verified state;
- hidden/obscured occurrence remains hidden/obscured;
- precise user location excluded from persisted evidence;
- stale source labeled stale;
- unknown-rights visual blocked;
- no-WebGL path remains usable and accessible.

### C1 — BUILD

Status: **STARTED / bounded provider-neutral core present in draft PR #20**

Current code adds strict source/measurement/conservation validators, human-scale comparison math, privacy-safe occurrence receipt sanitization, provider-obscuration protection, a release asset-rights gate, fixture nearby adapter, and focused negative tests.

This is **not** a runnable product UI and **not** a live-provider integration.

### C2 — RUNNABLE

Status: **NOT STARTED**

Local/browser flow must work without network first.

### C3 — PREVIEW / UAT

Status: **NOT STARTED**

Require desktop + mobile browser acceptance, reduced motion, keyboard navigation, location denial/manual place, slow/offline behavior, and provenance readability.

### C4 — LIVE ADAPTERS

Status: **NOT STARTED**

Add one provider only after fixture baseline is exact-head green. Prefer iNaturalist read-only nearby observations first. Certify rate limits, caching, errors, obscured locations, freshness, attribution, and deterministic fixture fallback before adding GBIF/IUCN live paths.

### D — CERTIFY

Status: **NOT STARTED**

No production/completion claim before exact-head tests + browser suite, privacy review, licensing/provenance review, hosted deployment ID/SHA, mobile/desktop UAT, provider degradation/freshness tests, and independent evidence review.

### E — ITERATE

Future work should be driven by measured user feedback. Do not preemptively add scanning, chat, accounts, badges, social features, or gamification because the supplied launch does not establish them as part of this product's value.

## 10. Phase A/B exclusions

- animal image recognition / scanning;
- user accounts and location history;
- observation uploads / citizen-science community;
- chat or AI tutor;
- badges/challenges/gamification;
- fabricated population charts;
- scraping sites that prohibit it;
- copying Anidex design, code, copy, source data, or branded assets.

## 11. First implementation target

The current bounded implementation is deliberately network-free:

- strict validators for evidence-bearing contracts;
- dimension-aware scale comparison;
- fixture nearby provider preserving obscured/uncertain occurrence data;
- provenance completeness checks;
- release-asset rights gate;
- negative tests for privacy/provenance/measurement failure cases.

Only after this exact-head slice is green should browser UI integration and a live iNaturalist adapter begin.
