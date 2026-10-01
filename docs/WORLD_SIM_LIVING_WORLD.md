# World-Sim → Earth Living World clean-room reverse engineering

Source targets:

- Reddit: https://www.reddit.com/r/SideProject/comments/1wmut0s/i_left_a_world_running_6000_people_later_nobodys/
- Product: https://world-sim.uk/
- Live viewer: https://world.world-sim.uk/

Canonical destination: `rrahul0904/earth-reference-rebuild`

## Decision

World-Sim is treated as a **capability donor** to Earth, not as a separate cloned product.

Earth already owns the globe, Civilization experience, deterministic playback, layer registry, story timeline, and reproducible render-state contract. The new capability should therefore appear as an opt-in **Living World** system inside the existing convergence architecture. The default reference composition must remain unchanged.

This is clean-room work. We are reproducing observable product behavior and general system ideas, not copying proprietary source code, assets, text, branding, prompts, data, or hidden APIs.

## Publicly observed product behavior

The current public product describes a persistent generational civilization simulation with thousands of individual inhabitants and hundreds of settlements. The world continues when nobody is watching.

Observed capabilities:

1. **Persistent population and settlements**
   - named individuals, families, houses, peoples and settlements
   - birth, death, ancestry and graves
   - colonies can split from their origin while retaining and later diverging from language, religion and customs

2. **Knowledge is embodied in people**
   - crafts are learned from other people
   - a technique can disappear if the final practitioner dies before teaching it
   - discoveries can later be reinvented
   - writing can preserve knowledge beyond the life of one person

3. **Matter / experiment engine**
   - materials expose physical properties rather than a hard-coded visible tech tree
   - progress depends on prerequisite processes such as heat, fuel, tools and material handling
   - failed experiments can become observations that guide later attempts

4. **Temperature ladder and emergent technology**
   - hearth → kiln → furnace is presented as a causal progression
   - pottery, metallurgy and later production emerge from usable processes rather than a UI unlock list

5. **Individual cognition + lightweight population simulation**
   - a small set of high-influence characters receives richer model-driven reasoning
   - the broader population runs primarily through cheaper/local deterministic or model-assisted routines
   - nightly “dream” passes consolidate observations, memory and future intent

6. **Memory, emotion and relationships**
   - individuals retain episodic history
   - emotional state influences social behavior and future choices
   - families, rivalries, alliances, shame, grief and goals persist over time

7. **Religion and culture**
   - beliefs are generated from lived environmental and historical experience
   - rituals, sacred places, priests, conversion and cultural divergence can emerge

8. **Language and identity**
   - peoples speak, split and culturally diverge
   - language changes across separated populations and can mix where cultures meet

9. **Ecology and environment**
   - public descriptions reference weather, clouds, evaporation, rivers, erosion, animals and climate
   - the viewer exposes climate-oriented surfaces such as temperature, CO₂, sea level and ozone

10. **Self-writing historical record**
    - important events are projected into a chronicle / “Book of Ages”
    - discoveries, deaths, political events, religious changes and lost crafts become historical records

11. **Read-only world viewer**
    - globe/map
    - settlement and territory views
    - mood / activity lenses
    - grave search
    - named individuals
    - “great moments”
    - current-world statistics
    - time-lapse / historical reading surfaces

12. **Community follow layer**
    - Discord commands expose world state
    - viewers can follow/adopt a named individual and receive life-event notifications

13. **Operator test bench**
    - the public staging UI exposes controls for advancing the clock, teaching an era, influencing a house and saving the world
    - this implies a separate privileged simulation-control surface from the public read-only viewer

## Clean-room product boundary for Earth

### Include

- deterministic persistent civilization state
- households / settlements / peoples
- births, deaths and family trees
- knowledge ownership, teaching, loss and rediscovery
- material experiments and prerequisite-based discovery
- settlement growth and migration
- culture / language divergence
- event ledger and historical chronicle
- reproducible simulation snapshots
- read-only Living World globe layer
- “follow a life” locally first, with notifications only after an explicit backend phase
- operator-only simulation controls behind a fail-closed authorization boundary

### Do not import by default

- original branding, names, prose or visual assets
- proprietary prompts
- any scraped world database
- the source product’s exact religion or “sin” content
- hidden APIs
- uncontrolled LLM calls for every simulated person
- user-facing controls that can mutate the shared canonical world

## Proposed Earth architecture

### 1. Deterministic simulation kernel

New module: `living-world-core.js`

Responsibilities:

- fixed-step tick loop
- seeded RNG
- world clock
- population lifecycle
- household formation
- settlement growth
- migration / colony split
- resource and environment observations
- deterministic event emission
- snapshot / restore

Core rule: same seed + same initial state + same ordered inputs = same world state.

### 2. Domain state

Suggested normalized entities:

```text
World
  id, seed, tick, year, climate_state, schema_version

Person
  id, born_tick, died_tick, sex, parents[], household_id, settlement_id,
  traits, emotion, health, memories[], skills{}, beliefs{}, language_id

Household
  id, members[], settlement_id, stores{}, relationships{}

Settlement
  id, lat, lon, founded_tick, population, households[], stores{},
  buildings{}, knowledge_summary{}, culture_id, polity_id

People/Culture
  id, parent_id, founded_tick, language_id, belief_system_id,
  customs{}, relations{}

Knowledge
  id, domain, prerequisites[], discoverer_id, discovered_tick,
  carriers[], written_record_id, evidence[]

Experiment
  id, actor_id, tick, inputs[], process{}, observations[], outcome,
  candidate_knowledge_id

Event
  id, tick, type, actors[], place_id, payload, significance, provenance

ChronicleEntry
  id, event_ids[], tick_range, generated_text, provenance
```

### 3. Knowledge graph

Knowledge must be tracked per carrier, not only globally.

Rules:

- a person may learn knowledge only through observation, teaching, text, or a reproducible experiment
- settlement-level “known” state is derived from living carriers + durable written records
- when the last carrier dies and no durable record exists, the knowledge is lost
- lost knowledge may be rediscovered through experiments
- every discovery stores provenance: actor, tick, prerequisites, experiment/event IDs

This gives us a real dark-age / rediscovery mechanic without a hard-coded user-visible tech tree.

### 4. Matter and experiment engine

First implementation should be **bounded and explainable**, not a fake general physics simulator.

Use a material/process rule graph:

- materials: wood, clay, water, stone, fiber, hide, copper ore, tin ore, charcoal
- properties: moisture, hardness, combustion, melting/smelting threshold, tensile category
- processes: dry, heat, fire, grind, mix, shape, weave, tan, smelt
- apparatus: hearth, pit kiln, kiln, bellows, furnace

Experiments produce observations. Observations may satisfy discovery rules.

Example:

```text
dry clay + shaped vessel + kiln temperature -> fired pottery
charcoal + forced air + furnace + copper ore -> copper
copper + tin + sufficient melt temperature -> bronze
```

The rule system remains internal; the simulation discovers outcomes by trying permitted actions.

### 5. Cognition tiers

Do not run a frontier LLM for every simulated person every tick.

Use three tiers:

- **Tier A — deterministic population agents**: needs, routines, movement, work, teaching probability, relationship updates
- **Tier B — periodic local/small-model reflection**: summarize recent memories, update goals, propose bounded intentions
- **Tier C — rare high-value reasoning**: leader/council decisions, major diplomacy, religion/culture narrative synthesis

All model output must be converted into a typed bounded action proposal. The simulation kernel validates the action before it can mutate state.

### 6. Memory model

Store structured memories first:

```text
{tick, kind, actors, place, valence, importance, facts, source_event_ids}
```

Reflection can produce a gist summary, but raw event IDs remain the evidence chain.

Memory decay should reduce retrieval weight, not rewrite history.

### 7. Chronicle pipeline

Simulation events are the source of truth.

```text
kernel event -> significance scoring -> event bundle -> narrative renderer -> chronicle
```

The narrative renderer may use templates first. LLM prose is optional and must include the underlying event IDs so the UI can show evidence/provenance.

### 8. Earth visualization integration

Add an opt-in **Living World** tab/layer under `EarthConvergence`.

Initial viewer:

- settlement dots
- population / mood / conflict / migration lenses
- selected settlement detail
- selected person / household detail
- event pulse layer
- chronological event rail
- deterministic `renderLivingWorldAt(tick)`
- shareable snapshot containing seed + tick + selection + active lens

The existing Planet/Civilization experience remains unchanged unless this layer is opened.

### 9. Persistence

Phase 1:
- deterministic local demo world
- snapshot JSON
- schema versioning
- import/export
- replay from seed + event inputs

Phase 2:
- authoritative server simulation
- append-only event log
- periodic compressed snapshots
- read replicas / cache for viewer traffic
- exactly-one simulation leader lease
- idempotent tick batches

### 10. Backend/API boundary

Read endpoints:

```text
GET /living-world/state
GET /living-world/settlements
GET /living-world/people/:id
GET /living-world/events?after=
GET /living-world/chronicle
GET /living-world/snapshot/:tick
```

Operator endpoints are separate and fail closed:

```text
POST /admin/living-world/clock
POST /admin/living-world/inject
POST /admin/living-world/snapshot
POST /admin/living-world/restore
```

No admin route is reachable from the public client without server-side authorization.

### 11. Community layer

Only after the canonical simulation is stable:

- follow person / settlement
- Discord or email notifications
- event subscriptions
- named-life page
- immutable historical profile after death

User actions may follow or annotate the world, but must not secretly mutate simulation truth.

## Delivery plan

### Phase 0 — repository contract (this branch)

- public evidence inventory
- clean-room boundary
- domain model
- deterministic architecture
- release/test gates

### Phase 1 — deterministic vertical slice

Implement:

- one seeded world
- 20–50 people
- 2–4 settlements
- birth/death
- households
- migration
- 5–8 knowledge items
- teaching/loss/rediscovery
- event ledger
- snapshot/restore
- no LLM dependency

Acceptance:

- 10,000 deterministic ticks produce identical snapshot hashes across repeated runs
- removing the last carrier loses an unwritten skill
- teaching transfers a skill with traceable provenance
- snapshot → restore → continue produces the same final hash as uninterrupted execution

### Phase 2 — material experiments

- clay/pottery
- charcoal
- kiln
- copper
- bronze
- simple hides/fiber

Acceptance:

- no direct “unlock age” API in the public simulation core
- knowledge is earned from observed outcomes
- causal prerequisites are test-covered

### Phase 3 — Living World Earth UI

- settlement layer
- event pulses
- timeline
- settlement/person details
- deterministic replay
- mobile browser coverage

### Phase 4 — bounded cognition

- structured memory
- reflection scheduler
- typed action proposals
- cost/rate budgets
- model/provider abstraction
- full deterministic fallback when providers are unavailable

### Phase 5 — authoritative hosted runtime

- durable event store
- simulation leader election / lease
- snapshots
- viewer cache
- restart/recovery tests
- concurrency/idempotency tests

### Phase 6 — community follow features

- subscriptions
- Discord integration
- life-event notifications
- privacy / abuse / moderation rules

## Test matrix

Unit:
- RNG determinism
- lifecycle
- genealogy
- settlement split
- knowledge transfer/loss
- experiments
- event significance
- snapshot versioning

Property / simulation:
- population never references missing parents/households
- no dead carrier can teach
- no negative stores/population
- deterministic replay hash
- bounded event growth

Integration:
- snapshot restore
- event log replay
- Living World API contracts
- provider failure fallback
- admin authorization

Browser:
- default Earth UI unchanged
- Living World layer opens explicitly
- deterministic tick selection
- person/settlement selection
- mobile
- reduced motion
- malformed event data is rendered as text, never executable HTML

Security:
- admin routes fail closed
- no prompt/model output directly mutates state
- bounded payload sizes
- strict schema validation
- XSS-safe chronicle rendering
- rate limits on follow/search APIs
- secrets never reach browser bundles

Load:
- viewer reads scale independently of simulation writes
- simulation tick latency budget is measured
- event stream backpressure is bounded

## Smallest truthful next implementation action

Build **Phase 1 only** as an isolated deterministic `living-world-core.js` plus unit tests. Do not add hosted persistence, LLMs, Discord, or production claims until the kernel passes replay/snapshot/knowledge-loss invariants.

That gives Earth a real, testable living-civilization substrate before any expensive or nondeterministic behavior is added.
