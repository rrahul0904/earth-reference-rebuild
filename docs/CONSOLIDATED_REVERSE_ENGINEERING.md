# Consolidated reverse-engineering: Earth systems convergence

This document records the clean-room product and engine capabilities intentionally consolidated into `earth-reference-rebuild`.

The goal is one coherent Earth exploration product, not a collection of copied mini-products. Each source contributes a bounded capability to the existing reference-faithful Earth shell.

## Product boundary

The combined product remains centered on:

- Earth through deep time
- human geography and civilization
- near-Earth orbit
- lunar exploration
- earthquakes and tectonics
- oceans and circulation
- the Solar System
- deterministic guided stories across those experiences
- shareable and reproducible visual states

The default reference composition remains unchanged. Consolidated capabilities are exposed as opt-in systems through the **Layers** explorer.

## Reverse-engineered capability mapping

### earth.ethanplus.ai / Earth History Explorer — core product

Source: https://earth.ethanplus.ai/

Retained as the primary interaction and editorial model:

- photographic Earth
- geological timeline and deep-time reconstruction
- continuous scrubbing and playback
- Civilization / migration
- Orbit
- Moon
- Solar System
- Earthquakes
- Oceans
- camera orbit / zoom
- Natural / After dark / Blue hour
- desktop and mobile composition

The repository’s existing rendering stack remains authoritative.

### Moonstake — lunar exploration capabilities

Source: https://www.moonstake.org/

Observed/rebuilt capability set that is relevant here:

- interactive lunar surface
- pan / zoom exploration
- selectable lunar locations
- landmark search
- named mission states
- responsive map exploration

Integrated here as:

- searchable lunar landmark catalog
- selection state and visual marker
- linkage to existing Apollo 11, Apollo 17 and Chang’e 4 states
- additional scientific landmarks such as Tycho, Copernicus, Mare Imbrium, Shackleton and Aristarchus

Explicitly excluded:

- land sales
- pricing / quotes
- checkout
- ownership
- brand flags
- marketplace ranking

Reference implementation work also exists in `rrahul0904/moonstake-rebuild`, but this project reuses product concepts rather than copying that product wholesale.

### Orbital Speeders / Slingshot Speeders — orbital simulation

Reference implementation: `rrahul0904/orbital-speeders`

Relevant prior implementation characteristics:

- deterministic simulation
- fixed-step orbital motion
- inverse-square gravity concepts
- trajectory prediction
- replay / serialization
- reproducible state

Integrated here as:

- deterministic orbit presets
- two-body orbital period computation using Earth radius and the standard gravitational parameter
- LEO / MEO / GEO presets
- replayable trajectory visualization
- representative ground track
- public API for setting orbit parameters and retrieving a deterministic snapshot

Explicitly excluded:

- racing
- fuel / boost economy
- checkpoints
- leaderboards
- ghosts
- daily challenges
- competitive scoring

### Infinite Canadaverse / Infinite City — human geography

Source: https://infinite.canadaverse.org/

Prior clean-room reverse engineering established:

- persistent explorable city/world
- roads and neighborhoods
- pan / zoom
- deterministic geography
- building/place history
- day/night presentation
- responsive canvas exploration

Integrated here as:

- city and human-geography layer
- named urban anchors across continents
- location search
- selected-place state
- globe camera targeting
- time-filterable geographic features

Explicitly excluded:

- contribution cooldown mechanics
- anonymous building ownership/contribution
- multiplayer persistence rules
- construction/game mechanics

### Agent Atlas + Zenity Census Molty — geospatial data engine

Public research source:
https://labs.zenity.io/post/turning-moltbook-into-a-global-botnet-map

Prior implementation:
`rrahul0904/agent-atlas`

Relevant concepts:

- dataset aggregation
- geographic projection
- region grouping
- counters
- event/time playback
- layer filtering
- streaming-ready architecture
- deterministic visual summaries

Integrated here as a generic client-side layer registry:

- register/toggle layers
- active-layer metrics
- time filtering/playback
- deterministic local datasets
- cities
- migration
- curated seismic signals
- circulation paths
- orbital ground track

The bundled data is intentionally local and deterministic. It is **not presented as live telemetry**.

Explicitly excluded:

- IP collection
- botnet/campaign collection behavior
- fingerprinting
- security telemetry ingestion
- surveillance-oriented workflows

### Where Is Mr. Kim? — interaction engine

Source: https://whereismrkim.com/

Reverse-engineered capabilities:

- orthographic pan/zoom
- moving visual entities
- raycast-style target selection
- seeded world state
- camera targeting
- selection state
- lightweight HUD feedback

Integrated here as:

- point selection from the rendered Earth/Moon surface
- nearest-visible-feature hit testing
- persistent selected-place state
- selection pulse and label
- camera targeting for Earth locations

Explicitly excluded:

- search-game objective
- clues
- timer
- scoring
- difficulty progression

### ClaudeAI procedural animation / BA9oDfPutz — deterministic visual engine

Source:
https://www.reddit.com/r/ClaudeAI/s/BA9oDfPutz

Observed architecture:

- single deterministic Canvas animation
- seeded randomness
- pure-time `render(t)` concept
- reusable procedural scenes/transitions
- screenshot/contact-sheet QA
- no required network/runtime assets

Integrated here as:

- seeded transition particles
- deterministic story state
- `EarthConvergence.renderAt(seconds)`
- reproducible snapshots
- same-time → same-scene behavior
- browser regression coverage

The original scene content is not copied.

### Hypit — semantic timeline choreography

Source:
https://github.com/hypit-ai/hypit

Relevant concepts:

- semantic timing
- phrase/time → render-time mapping
- intermediate timeline representation
- deterministic scene planning
- provider-independent choreography

Integrated here as:

- a semantic Earth story timeline
- exact scene start/duration values
- deterministic time scrubbing
- existing Earth experience routing from timeline state

No Hypit video-generation product UI is imported.

### Orshot / Orshot Motion — motion composition

Relevant sources:

- https://orshot.com/blog/how-to-make-faceless-videos-with-n8n
- prior Orshot-class work in `rrahul0904/faceless-content-creator`

Relevant concepts:

- parameterized visual layers
- timeline compilation
- reusable motion primitives
- camera/scene transitions
- async render-oriented deterministic state

Integrated here as:

- parameterized story scenes
- reusable scene routing
- progress compiler
- deterministic visual transition state

No publishing, social-video or template-marketplace UI is imported.

## Implemented convergence architecture

### 1. Core Earth renderer

Existing files remain responsible for the reference product:

- `app-1.js` … `app-5.js`
- `experiences.js`
- `visual-fixes.js`
- `moon-fidelity.js`
- `reference-polish.js`
- `reference-finalizer.js`

### 2. Convergence engine

`earth-convergence.js` adds:

- layer registry
- data-time playback
- city/human-geography catalog
- lunar landmark catalog
- interaction hit testing
- deterministic orbital simulation
- orbital ground-track layer
- semantic story compiler
- public deterministic API

### 3. UI

`earth-convergence.css` adds an opt-in **Layers** explorer with four surfaces:

- Layers
- Places
- Orbit
- Story

The default Earth reference composition is unchanged until the user opens or enables these capabilities.

### 4. Public API

`window.EarthConvergence` exposes:

- `registerLayer(id, spec)`
- `setLayer(id, enabled)`
- `clearLayers()`
- `renderAt(seconds)`
- `snapshot()`
- `selectCity(id)`
- `selectMoonLandmark(id)`
- `setOrbit(altitudeKm, inclinationDeg)`
- `listLayers()`
- `listCities()`
- `listMoonLandmarks()`
- `storyDuration`

This keeps future live scientific/environmental data integration separate from the visualization shell.

## Verification

`tests/convergence.spec.mjs` verifies:

- convergence engine loads without changing the default Planet state
- layer registry toggles data overlays
- time filtering is deterministic
- Moon landmarks connect to the existing Moon experience
- orbital period is physically computed and bounded correctly for LEO
- GEO preset routes into Orbit and renders the ground-track layer
- semantic `renderAt(t)` maps to deterministic Earth scenes
- city selection works without importing marketplace/game mechanics
- mobile keeps the explorer reachable

## Remaining production boundary

This branch adds repository behavior only. Production promotion still depends on the repository’s existing gated Vercel workflow and a configured `VERCEL_TOKEN` secret.

Do not call the combined product production-complete until:

1. branch CI passes,
2. visual browser evidence is reviewed,
3. the branch is merged,
4. exact merged SHA is deployed,
5. canonical production URL is verified against that SHA.
