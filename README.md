# earth-reference-rebuild

A production-oriented, independently implemented interactive Earth-history experience inspired by the interaction patterns and editorial presentation of earth.ethanplus.ai.

## Experiences

- **Planet** — photographic present-day Earth, deep-time geological reconstruction, continuous time scrubbing and display modes.
- **Civilization** — time-grown human dispersal routes over the globe.
- **Orbit** — tiny-Earth orbital-system overview plus focused crewed/active/constellation states.
- **Moon** — high-resolution NASA lunar presentation with Apollo 11, Apollo 17 and Chang’e 4 states; deterministic procedural Moon fallback if the external NASA image cannot load.
- **Solar System** — restrained eight-planet orbital composition with planet focus controls.
- **Earthquakes** — photographic night-Earth treatment, global seismic distribution, Pacific/deep-focus filters and selected-event evidence.
- **Oceans** — dark ocean composition with animated organic current filaments, global, Gulf Stream, Pacific and Southern Ocean states.

## Core implementation

- Framework-free WebGL2 + Canvas rendering.
- Present-day photographic Blue Marble/day-night layer with the bundled/core renderer retained as a graceful fallback.
- 15 paleogeographic raster slices from 750 Ma to present with continuous crossfade.
- Vector craton reconstructions for 760–1,860 Ma using published reconstruction data.
- Procedural formative-Earth treatment for ages older than available reconstruction data.
- 10-stop editorial geological timeline with continuous scrubbing.
- Natural / After dark / Blue hour display modes.
- Drag orbit, inertial rotation, persistent wheel/button zoom and subtle auto-rotation.
- Autoplay with 0.5× / 1× / 2× / 4× speed.
- Desktop editorial layout and mobile Earth-first composition.
- Explore navigation, experience-specific controls, keyboard support, reduced-motion behavior and WebGL fallback.
- Security headers and long-lived immutable caching for bundled assets through `vercel.json`.

## Resilience

The application keeps a non-photographic core renderer available when optional photographic layers cannot initialize. Moon additionally contains a deterministic procedural fallback, verified by a browser test that deliberately blocks the NASA image request and confirms the experience still renders.

## Local run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Verification

```bash
npm install
npm test
npm run test:e2e
```

The Playwright suite validates desktop and mobile Planet, Orbit, Moon, Solar System, Earthquake and Ocean states, captures screenshot evidence, verifies deep-time behavior, and tests Moon resilience under external-image failure. GitHub Actions runs the same acceptance suite for pull requests and `main`.

## Deployment

The site is a static Vercel deployment. Production releases are gated on the GitHub Actions quality workflow and are deployed from the merged `main` revision. The canonical production URL is `https://earth-reference-rebuild.vercel.app`.

## Data and image provenance

Paleogeographic and deep-time craton reconstruction assets are adapted from `szupie/supercontinents`, whose project credits PALEOMAP / C.R. Scotese for raster maps and published Rodinia / Nuna reconstruction studies for older vector states. Present-day photographic Earth imagery is sourced from the Three.js / three-globe example texture set. The high-fidelity Moon layer uses NASA Scientific Visualization Studio / Lunar Reconnaissance Orbiter imagery.

See `THIRD_PARTY_NOTICES.md` for detailed provenance notes.

This project is an independent implementation and is not affiliated with the reference site.
