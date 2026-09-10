# Implementation notes

## Rendering architecture

The globe uses a full-screen WebGL2 fragment shader instead of a scene-graph framework. Each screen pixel is analytically projected onto a sphere; the corresponding spherical normal is transformed into longitude/latitude and used to sample equirectangular textures. This avoids the renderer initialization and missing-module failures that affected earlier iterations.

The shader owns day/night lighting, limb atmosphere, star background, Snowball-Earth grading, formative-Hadean color treatment and display modes. Manual yaw/pitch and zoom are preserved independently from timeline movement.

## Geological reconstruction

- 0–750 Ma: paleogeographic raster pair lookup and shader crossfade.
- 750–1,860 Ma: craton shapes are transformed using reconstruction Euler rotations and rasterized into cached equirectangular canvases; adjacent snapshots crossfade.
- >1,860 Ma: the UI remains fully interactive but explicitly uses a formative procedural surface because the bundled reconstruction dataset does not support older vector geometry.

## Human dispersal

Broad schematic dispersal legs become visible progressively as the timeline approaches the present. Each route is sampled geographically, projected with the same globe orientation as the WebGL surface, horizon-clipped, and drawn on a transparent overlay canvas.

## Product shell

The visible shell uses an editorial desktop layout with top navigation, hero copy, Now panel, zoom controls, geological timeline, playback, speed and display-mode controls. Mobile switches to a globe-first view above a dedicated story/control bottom sheet and an Explore menu.

## Failure strategy

Texture failure degrades to deterministic generated textures without crashing the renderer. Deep-time data failure degrades to the procedural geological renderer. WebGL initialization failure reveals a non-WebGL fallback while preserving story controls.
