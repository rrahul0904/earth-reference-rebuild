# Reference video reverse engineering

Source: user-supplied 88-second desktop recording reviewed frame-by-frame on 2026-09-10.

## Product structure observed

The recording presents a shared editorial shell with the `earth.` wordmark and a horizontal experience navigation. The primary experiences visible in the recording are:

1. **The Planet** — photographic Earth and editorial framing.
2. **Orbit** — Earth surrounded by orbital shells and spacecraft points, with object details, filtering and a time/density control.
3. **Moon** — Earth/Moon scale context, a large inspectable Moon, mission/landing chips and historical milestones such as Apollo 17.
4. **Solar System** — Sun, eight planets, orbit traces, play/time controls and planet selection.
5. **Earthquakes** — night-Earth view with thousands of event markers, magnitude/depth encoding and event filtering.
6. **Oceans** — Earth with animated current streamlines and basin/current focus controls.
7. **Civilization / human context** — retained in this implementation as the existing migration layer.

## Reusable interaction language

Across modes the reference uses:

- editorial headline and short explanatory copy on the left;
- large central 3D/diagrammatic visual;
- compact quantitative/status block on the upper-right;
- pill-based filters or mode selection near the bottom;
- a persistent thin timeline/progress treatment;
- play/pause controls;
- very dark interface chrome with restrained pale green/blue highlights;
- minimal, small uppercase metadata labels.

## Clean-room implementation decisions

The implementation in this repository recreates the observed interaction patterns without copying source code from the reference site.

- Orbit uses deterministic orbital shells and representative spacecraft points. The visible `19,847` count is presented as a visualization snapshot, not live orbital telemetry.
- Moon uses a procedurally rendered lunar surface with crater fields and mission milestones.
- Solar System uses a lightweight animated orbital model for the eight planets.
- Earthquakes uses a deterministic event field distributed along representative plate-boundary paths. It is not advertised as a live seismic feed.
- Oceans uses animated broad current paths and explicitly identifies them as a modeled visualization, not real-time ocean measurements.
- The existing geological Earth renderer remains the underlying globe for Planet, Orbit, Earthquakes and Oceans.

## Acceptance criteria added

Browser acceptance now verifies that desktop users can move through Orbit, Moon, Solar System, Earthquakes, Oceans and back to The Planet; select representative controls within each mode; and that the mobile Explore menu can switch between the new modes without page errors.
