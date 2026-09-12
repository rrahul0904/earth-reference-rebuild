# Third-party data and imagery notices

## Life & Supercontinents / szupie/supercontinents

Bundled paleogeographic raster frames and the craton reconstruction data were taken from the open source Life & Supercontinents project. That project credits PALEOMAP / C.R. Scotese for the raster maps and published Rodinia/Nuna reconstruction studies for older vector states. Consult the upstream repository for its full source list and license information.

Upstream repository: https://github.com/szupie/supercontinents

## Present-day Earth imagery

The final present-day renderer uses the Blue Marble and night-light Earth textures distributed in the open `vasturiano/three-globe` example assets. The Blue Marble imagery is based on NASA Visible Earth source material; the night texture provides the illuminated-night presentation used by the earthquake experience. The original bundled Three.js Earth texture remains in the repository as a fallback for the core and deep-time renderer.

Three-globe texture repository: https://github.com/vasturiano/three-globe
NASA Blue Marble / Visible Earth: https://visibleearth.nasa.gov/images/57730/the-blue-marble-land-surface-ocean-color-and-sea-ice
Original fallback texture repository: https://github.com/mrdoob/three.js

## NASA Scientific Visualization Studio / LRO Moon imagery

The Moon experience uses NASA Scientific Visualization Studio lunar imagery derived from Lunar Reconnaissance Orbiter terrain and camera data. The final sharp overlay uses the 2026 Moon Phase and Libration plain full-disk preview to avoid visible photomosaic tile seams; the earlier LRO photomosaic and the procedural renderer remain available as fallback layers.

2026 full-disk source page: https://svs.gsfc.nasa.gov/5587/
LRO photomosaic source page: https://svs.gsfc.nasa.gov/5001/
Credit: NASA's Scientific Visualization Studio / NASA Goddard; 2026 visualization by Ernie Wright (USRA) and the SVS team.

## Reference experience

earth.ethanplus.ai is used only as a product and interaction reference. This repository is an independent implementation and does not copy the reference site's source code.
