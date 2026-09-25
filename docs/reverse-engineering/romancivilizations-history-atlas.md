# RE-241 — RomanCivilizations clean-room donor dossier

## Source set

- Reddit launch thread: https://www.reddit.com/r/SideProject/s/FdkRjhVqAE
- Public product: https://romancivilizations.com/
- Public About page: https://romancivilizations.com/about

Research date: 2026-09-24

## Why this belongs in Earth Reference Rebuild

RomanCivilizations is not a separate destination product for this portfolio. Its strongest reusable capability is an **interactive history atlas** layered on a globe, which fits the existing `earth-reference-rebuild` product boundary: Earth through deep time, human geography/civilization, deterministic guided stories, and shareable reproducible visual states.

The clean-room implementation should therefore add an opt-in **History Atlas** surface to the existing Earth product rather than creating another globe renderer.

## Public behavior observed

The launch post and public pages establish the following behavior:

1. The atlas covers more than 100 ancient civilizations.
2. The primary navigation model is geographic: click a globe region, then choose a civilization in that region.
3. A civilization exposes roughly 20–50 events describing its rise, transformation and fall.
4. Individual events can be opened for additional detail.
5. The home experience offers a “Teach me about a random ancient civilization” action.
6. The product includes a cross-civilization editorial thread called “How We Got Here” containing 106 selected events that connect historical moments across time toward the present.
7. The creator describes desktop as the preferred experience while saying mobile is usable.
8. The product is intended for both children and adults and is positioned as a safe educational exploration environment.
9. The public discussion identifies native multilingual support as a planned improvement.
10. The About page emphasizes connecting events across geographies and eras, not presenting civilizations as isolated chapters.

These are product-behavior observations only. They do **not** establish the donor’s private data model, rendering stack, infrastructure, content-generation process or internal APIs.


## Reddit comment signals incorporated

The launch-thread comments add useful product signals beyond the original post:

- A commenter specifically validated the **region → civilization** flow as an intuitive entry point for a 9-year-old. Preserve that low-friction spatial navigation as a primary path rather than burying the experience behind search or dense menus.
- A commenter immediately requested **multilingual support**, and the creator responded that native multilingual support would be added. Locale-ready content and UI therefore move from a nice-to-have to an explicit product requirement.
- The creator’s Punic Wars reply illustrates another useful interaction principle: history becomes more engaging when users can connect civilizations and conflicts to family, culture, migration, and present-day identity. Our version should support optional **personal connection / heritage exploration** without inferring a user’s background.
- The comment thread is still young, so current feedback is directional rather than a statistically representative UX study. Continue treating future corrections, requested civilizations, and usability reports as evidence for backlog changes, not as unquestioned requirements.

### Backlog changes from comments

- [ ] Keep region-first navigation as a first-class mobile and desktop acceptance criterion.
- [ ] Add locale routing and translation fallback tests in the initial architecture, even if Phase A content ships English-first.
- [ ] Add a neutral “connections” surface that can trace trade, migration, conflict, succession, and cultural exchange across civilizations.
- [ ] Design an optional user-driven heritage/interest path where the user explicitly chooses regions/cultures to explore; never infer ancestry or identity.
- [ ] Track historical-correction feedback with provenance and editorial-review status.

## Clean-room boundaries

Do not copy or scrape proprietary prose, illustrations, event descriptions, hidden endpoints or private datasets.

Historical content for our implementation must be independently researched and recorded with source/provenance metadata. The donor’s event selection and narrative wording should be treated as inspiration for interaction structure, not as content to reproduce.

The existing `earth-reference-rebuild` rendering stack remains authoritative.

## Product capability delta

### Existing Earth capabilities we should reuse

- WebGL2/Canvas Earth rendering
- camera orbit and zoom
- Civilization experience routing
- opt-in Layers explorer
- city/human-geography selection
- deterministic story timeline
- `EarthConvergence.renderAt(t)`
- deterministic snapshots/shareable state
- reduced-motion/mobile acceptance patterns
- source/provenance conventions already used for scientific imagery/data

### New History Atlas capabilities

- region → civilization navigation
- civilization directory and search
- civilization overview cards
- civilization-specific chronological event timeline
- event detail drawer/page
- BCE/CE-aware date ordering
- geographic event anchors
- civilization-to-civilization connection edges
- curated connected-history paths
- deterministic random-civilization discovery
- deep links restoring region/civilization/event
- citation/provenance display on historical content
- multilingual-ready content fields
- editorial validation tooling

## Proposed information model

The schema below is our design, not a claim about the donor.

### Region

```ts
type HistoryRegion = {
  id: string;
  name: string;
  centroid: { lat: number; lon: number };
  bounds?: number[][];
  civilizationIds: string[];
};
```

### Civilization

```ts
type Civilization = {
  id: string;
  slug: string;
  name: string;
  aliases?: string[];
  regionIds: string[];
  summary: LocalizedText;
  startYear: number; // astronomical signed year: BCE < 0
  endYear: number;
  center: { lat: number; lon: number };
  extent?: GeoShape;
  eventIds: string[];
  sourceIds: string[];
  contentStatus: "draft" | "reviewed" | "published";
};
```

### Event

```ts
type HistoryEvent = {
  id: string;
  slug: string;
  civilizationIds: string[];
  title: LocalizedText;
  summary: LocalizedText;
  startYear: number;
  endYear?: number;
  precision: "year" | "decade" | "century" | "range" | "circa";
  locations: Array<{ lat: number; lon: number; label?: string }>;
  tags: string[];
  connectionIds: string[];
  sourceIds: string[];
  contentStatus: "draft" | "reviewed" | "published";
};
```

### Connection

```ts
type HistoryConnection = {
  id: string;
  fromEventId: string;
  toEventId: string;
  relationship:
    | "influenced"
    | "enabled"
    | "reacted-to"
    | "trade"
    | "migration"
    | "conflict"
    | "knowledge-transfer"
    | "successor";
  rationale: LocalizedText;
  sourceIds: string[];
};
```

### Curated path

```ts
type HistoryPath = {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  eventIds: string[];
  sourceIds: string[];
};
```

### Provenance

```ts
type HistorySource = {
  id: string;
  title: string;
  publisher?: string;
  url?: string;
  citation?: string;
  accessedOn?: string;
  license?: string;
  notes?: string;
};
```

## Interaction design

### 1. Globe-first discovery

- Add a History Atlas toggle under the opt-in Layers explorer.
- Regions become selectable through the same camera/selection system already used by cities and other Earth layers.
- Selecting a region opens a civilization list without replacing the existing Earth renderer.
- Region highlighting must remain legible in Natural / After dark / Blue hour modes.

### 2. Civilization navigation

The side panel should provide:

- civilization name and date range
- short independently written overview
- chronological event list
- related civilizations
- source/citation entry point
- focus-on-globe action

Search should support civilization name, aliases, region and event text.

### 3. Event detail

An event detail state should show:

- title
- approximate or exact date/range
- involved civilization(s)
- location(s)
- concise narrative
- connections to earlier/later events
- citations
- previous/next event navigation

Opening an event should update the URL/state so it can be restored and shared.

### 4. Connected-history paths

Instead of copying the donor’s 106-event editorial sequence, our product should support generic curated paths and ship an independently researched first path.

A path is a deterministic sequence of event IDs. It should integrate with the existing Story system so a path can:

- focus the correct geography
- show the current event
- animate or scrub deterministically
- expose previous/next
- restore the same visual state for the same path/event index

### 5. Random civilization

Use a deterministic seeded selector when a seed is supplied; otherwise use a normal random choice. Exclude unpublished/invalid records.

This action should be testable and deep-link the selected civilization.

## Historical time handling

A history atlas needs stronger time semantics than normal UI dates.

Rules:

- store sortable years numerically, using negative values for BCE
- preserve human-facing uncertainty such as “c. 1200 BCE”
- do not fabricate precision
- permit ranges that span BCE/CE
- provide one formatter for all history dates
- unit-test boundary behavior around 1 BCE / 1 CE; there is no historical year zero in display text
- support century-only and circa dates without coercing them into false exactness

## Content integrity

Every published civilization and event should have at least one source record.

The validation command should fail when:

- a referenced source does not exist
- a civilization references a missing event
- an event references a missing civilization
- a connection endpoint is missing
- start/end dates are inverted
- duplicate slugs exist
- an event has no geography when the UI requires mapping
- published content lacks provenance

Historical disputes should be represented as uncertainty/alternative interpretations rather than flattened into an unsupported single claim.

## Multilingual architecture

Do not hard-code English-only strings into the data model.

Use a lightweight localized-text contract:

```ts
type LocalizedText = {
  default: string;
  translations?: Record<string, string>;
};
```

Phase A can ship English-only content while keeping the schema and UI routing locale-ready.

## Child-friendly / educational boundary

The product may describe wars, massacres, colonialism, pandemics and other difficult history. “Safe for kids” should mean age-appropriate presentation and clear context, not historical sanitization.

Add optional content metadata such as:

- `sensitivity: none | mild | moderate | strong`
- `topics: string[]`

This can later support guardian/educator presentation controls without changing the historical record.

## Suggested implementation surfaces

Keep the new work additive and opt-in.

Proposed files:

- `history-atlas.js` — catalog, indexing, selection state, URL serialization
- `history-atlas.css` — panel/timeline presentation
- `data/history/regions.json`
- `data/history/civilizations/*.json`
- `data/history/events/*.json`
- `data/history/paths/*.json`
- `data/history/sources.json`
- `tests/history-atlas.spec.mjs`
- `scripts/validate-history-content.mjs`

The exact file boundaries can be adjusted to the existing repository conventions.

## Phase A — first bounded vertical slice

Goal: prove the complete interaction/data model with a tiny independently researched content set before scaling the catalog.

Deliver:

1. History Atlas toggle and region layer.
2. Region → civilization selection.
3. Searchable civilization sidebar.
4. One civilization with at least 20 independently sourced structured events.
5. Event detail state with citations.
6. Deep-link restoration.
7. Deterministic random-civilization action.
8. Generic connection graph and one short cross-civilization path.
9. Content validator.
10. Desktop and mobile browser acceptance.
11. Reduced-motion and keyboard behavior.
12. No change to default Planet experience when History Atlas is off.

## Phase B — catalog scale

- expand to 100+ civilizations
- add stronger geographic extents and event maps
- ship multiple independently researched connected-history paths
- add multilingual translations
- add bookmarks/progress
- add educator/learner filters
- add editorial review tooling

## Acceptance matrix

### Data

- [ ] BCE/CE order is deterministic
- [ ] all published content has sources
- [ ] no dangling IDs
- [ ] no duplicate slugs
- [ ] uncertainty/precision survives round-trip serialization

### Globe/UI

- [ ] History Atlas is opt-in
- [ ] region selection focuses the expected civilization list
- [ ] civilization selection focuses Earth correctly
- [ ] event selection restores from URL
- [ ] random civilization always selects a valid published record
- [ ] connected path is deterministic under `renderAt(t)`
- [ ] mobile panel remains reachable and usable

### Regression

- [ ] Planet default state unchanged
- [ ] Moon/Orbit/Oceans/Earthquakes/Solar System still route correctly
- [ ] existing convergence tests remain green

## Current status

Research and architecture have started. The donor is now mapped to the canonical Earth product under RE-241. Native History Atlas functionality is not yet implemented or launch-certified.

Tracking issue: #14
