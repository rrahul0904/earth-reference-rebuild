# Third-party data and imagery notices

## Life & Supercontinents / szupie/supercontinents

Bundled paleogeographic raster frames and the craton reconstruction data were taken from the open source Life & Supercontinents project. That project credits PALEOMAP / C.R. Scotese for the raster maps and published Rodinia/Nuna reconstruction studies for older vector states. Consult the upstream repository for its full source list and license information.

Upstream repository: https://github.com/szupie/supercontinents

## Present-day Earth imagery

The reference-grade present-day renderer uses NASA Blue Marble Next Generation imagery for the daylight surface and NASA Black Marble imagery for the night-light layer. Those public-domain NASA datasets are loaded from mirrored copies in the `pjcigan/skyplothelper` example-data repository so the browser can request them with normal cross-origin texture loading. The original bundled Three.js Earth texture remains in the repository as a fallback used by the core/deep-time renderer.

NASA Blue Marble source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
NASA Black Marble / night-lights source: https://earthobservatory.nasa.gov/features/NightLights
Mirrored texture repository: https://github.com/pjcigan/skyplothelper
Original fallback texture repository: https://github.com/mrdoob/three.js

## Cloud layer

The reference-grade present-day renderer uses the `fair_clouds_4k.png` cloud texture from the open `turban/webgl-earth` project.

Upstream repository: https://github.com/turban/webgl-earth

## NASA Scientific Visualization Studio / LRO Moon imagery

The Moon experience uses NASA Scientific Visualization Studio lunar imagery derived from Lunar Reconnaissance Orbiter terrain and camera data. The final sharp overlay uses the 2026 Moon Phase and Libration plain full-disk preview to avoid visible photomosaic tile seams; the earlier LRO photomosaic and the procedural renderer remain available as fallback layers.

2026 full-disk source page: https://svs.gsfc.nasa.gov/5587/
LRO photomosaic source page: https://svs.gsfc.nasa.gov/5001/
Credit: NASA's Scientific Visualization Studio / NASA Goddard; 2026 visualization by Ernie Wright (USRA) and the SVS team.

## Reference experience

earth.ethanplus.ai is used only as a product/interaction reference. This repository is an independent implementation and does not copy the reference site's source code.
