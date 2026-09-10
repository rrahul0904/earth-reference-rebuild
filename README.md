# earth-reference-rebuild

A production-oriented, independently implemented interactive Earth-history experience inspired by the interaction patterns of earth.ethanplus.ai.

## What is implemented

- Full-screen WebGL Earth with no framework/runtime dependency
- Present-day photographic Earth imagery bundled in the repository
- 15 paleogeographic raster slices from 750 Ma to present with continuous crossfade
- Vector craton reconstructions for 760–1,860 Ma using published reconstruction data
- Procedural formative-Earth treatment for time older than available vector reconstructions
- 10-stop editorial geological timeline with continuous scrubbing
- Natural / After dark / Blue hour display modes
- Drag orbit, inertial rotation, persistent wheel/button zoom, subtle auto-rotation
- Autoplay with 0.5× / 1× / 2× / 4× speed
- Time-grown human dispersal routes on the globe
- Desktop information hierarchy and bottom control dock
- Mobile Earth-first composition, bottom story sheet, Explore menu and touch controls
- Sources / record dialogs, keyboard controls, reduced-motion behavior and WebGL fallback
- Static smoke acceptance checks and GitHub Actions quality workflow
- Vercel-ready static deployment

## Local run

Run: python3 -m http.server 4173

Then open: http://localhost:4173

## Verification

Run: npm test

## Data provenance

Raster and deep-time craton reconstruction assets are adapted from szupie/supercontinents, whose project credits PALEOMAP / C.R. Scotese for raster maps and published Rodinia / Nuna reconstruction studies for older vector states. Present-day Earth imagery is sourced from the Three.js example texture set.

See THIRD_PARTY_NOTICES.md for provenance notes.

This project is an independent implementation and is not affiliated with the reference site.
