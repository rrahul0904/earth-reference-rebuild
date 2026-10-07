# Earth Now — live-signals reverse-engineering dossier

Snapshot: 2026-10-07  
Tracking issue: #17  
Implementation branch: `reverse/earth-now-live-signals`  
Stacked base: `3e4340c23cb3f43187e2a85bbcee5bd70d3016b8` from draft PR #16

## 1. Source identification

User-supplied launch:
- https://www.reddit.com/r/SideProject/s/8ooYK5wvkQ
- resolved: https://www.reddit.com/r/SideProject/comments/1wztt77/i_made_a_live_globe_that_shows_whats_happening_on/

First-party product:
- https://earth.mejjad.se/

Related first-party technical discussion:
- https://www.reddit.com/r/threejs/comments/1wzy5h5/i_made_a_live_globe_in_threejs_that_shows_whats/

Comparators used only for public product/capability research:
- NASA Worldview
- Zoom Earth
- Windy
- earth.nullschool
- Radio Garden
- NASA Eyes

## 2. Evidence classes

### Observed public product behavior / copy
The public product exposes an interactive Earth with multiple environmental, astronomical, transport and media layers. Its About/source material distinguishes direct imagery/observations from forecasts/models and discloses that some celestial display distances/sizes are symbolic even when directions/timing are astronomical.

### Creator statements
The launch/technical threads describe plain Three.js + vanilla JavaScript, NASA Blue Marble imagery, compressed globe textures with higher-resolution view-dependent tiles, a real-time day/night treatment, weather textures above the globe, and a real-star catalog. These statements inform capability analysis but are not copied implementation requirements.

### Public feedback
Observed feedback highlights:
- strong visual/load-time appeal;
- concern about physical scale/realism in celestial presentation;
- education/geography potential;
- unusually strong interest in the niche mushroom-weather score;
- criticism that generic Blue Marble/WMS-style globes are established territory and need stronger technical/product differentiation;
- receiver-dependent limitations for ship/AIS coverage.

No private service inspection, hidden API discovery, donor source extraction or copied UI/assets are part of this work.

## 3. Product workflow reconstruction

The donor loop is approximately:

1. open a living rotating Earth;
2. enable a layer or enter ambient mode;
3. see recent/current signals in geographic context;
4. rotate/zoom/time-shift;
5. inspect a place/event/source;
6. jump between environmental, astronomical, transport and media perspectives;
7. return for a personally useful derived layer.

The important insight is that the globe is the **navigation substrate**, not the product thesis by itself.

## 4. Failure modes we must design out

- stale cached evidence presented as live;
- model/forecast data visually indistinguishable from observation;
- provider outage blanking the whole experience;
- global-source coverage gaps presented as global certainty;
- conflicting timestamps across heterogeneous providers;
- rate-limit/retry storms;
- unbounded point counts or texture memory on mobile;
- precise user-location collection when coarse/no location is sufficient;
- remote news/radio metadata rendered as trusted markup;
- AI translation/summarization drifting beyond sourced facts;
- derived condition scores that look scientific but have no transparent formula/input lineage;
- non-scale celestial visuals interpreted as physically scaled.

## 5. Competitive conclusion

The market already has excellent specialized tools for satellite/weather imagery, atmospheric flows, radio discovery and space visualization. Therefore the product should not optimize for “more toggles than competitors.”

The opportunity is a coherent **global situational discovery engine** that combines:

- trust/freshness/provenance;
- cross-domain events;
- deterministic time replay;
- useful derived condition recipes;
- a calm narrative/ambient mode;
- shareable evidence-backed world states.

## 6. Internal audit

`earth-reference-rebuild` already owns the reusable visualization and interaction shell:

- WebGL Earth + photographic present-day layer;
- day/night presentation;
- deep-time reconstruction;
- Civilization, Orbit, Moon, Solar System, Earthquakes and Oceans;
- deterministic time/story engine;
- geospatial layer registry;
- place selection/camera targeting;
- shareable state;
- desktop/mobile/reduced-motion/WebGL fallback;
- browser acceptance and Vercel release gates.

The existing `earth-convergence.js` deliberately keeps future live scientific/environmental data integration separate from the visualization shell. Earth Now is the next data/truth layer on that boundary.

## 7. Target product boundary

Working capability name: **Earth Now**.

Core loop:

`NOW -> WHAT CHANGED -> WHY IT MATTERS -> EXPLORE -> TIME-SHIFT -> SAVE/SHARE`

### Match
- globe-first navigation;
- astronomical Sun/day-night state;
- time window;
- ambient discovery;
- environmental/geophysical/space signals.

### Improve
- source type is first-class;
- timestamps/freshness are first-class;
- provider status is first-class;
- per-layer degradation instead of global failure;
- deterministic snapshot/replay;
- explicit privacy/network boundaries;
- derived-score explanation + confidence + input lineage.

### New
- `earth-signal/v1`;
- `condition-recipe/v1`;
- provider health/freshness receipts;
- global “What changed?” projection;
- evidence-grounded classroom/story snapshots;
- later terrain/bathymetry differentiation.

### Omit/defer
- donor branding/UI/source/assets;
- claims that all sources are real time;
- device location by default;
- AI-authored facts without grounding;
- all-provider integration in one step;
- terrain/bathymetry before the data contract is proven.

## 8. Phase A — implemented contract boundary

`earth-signal-core.js` provides a side-effect-free truth contract.

### `LayerSpec`
Each layer declares:
- stable ID/label;
- evidence class: `observation | forecast | model | historical | derived`;
- freshness and expiration windows;
- future timestamp tolerance;
- provider ID/name/source reference;
- coverage text;
- explicit network mode and host allowlist.

### `Signal`
Each normalized signal carries:
- stable signal/layer IDs;
- evidence class;
- observed/received/optional-validity timestamps;
- optional bounded geographic position;
- bounded title/summary/properties;
- source reference.

### freshness projection
Deterministic states:
- `fresh`
- `aging`
- `stale`
- `expired`
- `future`
- `invalid`

### provider state
Provider health is independent of evidence freshness:
- `unknown`
- `healthy`
- `degraded`
- `down`

A provider outage does not erase cached evidence; the layer becomes `cached-provider-down` rather than falsely current.

### derived Condition Recipe
A score requires:
- stable recipe ID;
- explicit recipe version;
- 0–100 score;
- 0–1 confidence;
- explanation;
- computation timestamp;
- at least one source/input reference;
- optional coarse region/properties.

Derived evidence is labelled `derived` and cannot silently masquerade as observation.

### snapshot receipt
Layer states are canonically ordered/serialized and can receive a SHA-256 digest for replay/evidence comparison.

## 9. Phase A acceptance

Automated tests cover:
- evidence-class allowlist;
- network-policy declaration;
- malformed coordinate/timestamp refusal;
- future timestamp refusal as fresh;
- freshness boundaries;
- cached evidence during provider outage;
- stale evidence under a healthy provider;
- versioned/source-backed condition score requirements;
- confidence bounds;
- deterministic canonical snapshots + SHA-256 digest;
- no inferred/required user location.

No network, browser, Git or deploy mutation exists in Phase A.

## 10. Phase B — first useful live vertical

Implement after Phase A exact-head tests are green:

1. recent earthquake provider adapter + deterministic fixture;
2. geomagnetic Kp/aurora model adapter + deterministic fixture;
3. existing astronomical Sun/day-night state normalized into the same timeline;
4. 24-hour Earth Now projection;
5. globe focus + evidence card;
6. provenance/freshness/coverage badge;
7. provider-offline fixture proving one failed source does not disable the product;
8. browser tests in desktop/mobile/reduced-motion modes.

## 11. Later phases

### Phase C — adapter catalog
Storms, lightning, satellite/cloud imagery, orbital objects, AIS ships, news and radio. Each source receives its own rights, latency, coverage, cache and failure review.

### Phase D — Condition Recipes
Examples may include mushroom-weather, aurora-viewing, stargazing and sea/surf conditions. A recipe must be domain-reviewed and must never present an illustrative score as scientific fact.

### Phase E — visual fidelity differentiation
Terrain/bathymetry, higher-resolution surface LOD, bounded streaming/cache budgets and mobile degradation.

### Phase F — product discovery
“What changed?” feed, ambient narrative, saved views, shareable timestamped states and classroom mode.

### Phase G — certification
Real-provider runtime, outage/recovery, browser/device performance, Preview UAT, exact-SHA production deployment and post-deploy smoke.

## 12. Verification ladder

`Static -> Unit -> Integration -> Contract -> Runtime -> Browser -> Persistence -> Provider Failure/Recovery -> Preview -> Production`

A later source may be called “live” only when its actual latency/refresh semantics justify that label. Model, forecast, historic and cached evidence must stay visibly distinct.

## 13. Privacy/security boundary

- external feeds are untrusted data;
- sanitize remote metadata;
- declare outbound hosts;
- proxy secrets/server credentials rather than exposing them to the browser;
- bounded cache/retry/backoff;
- no precise user location without explicit opt-in;
- do not retain raw IP for visualization;
- fail closed on malformed evidence;
- do not let generated summaries overwrite source facts.

## 14. Current truth

Research/product reconstruction: started and documented.  
Phase A contract: implemented on dedicated branch.  
Phase A CI: pending PR workflow receipt.  
Phase B live adapters/UI: not yet implemented.  
Preview/production: not claimed.  
Donor parity: not claimed.
