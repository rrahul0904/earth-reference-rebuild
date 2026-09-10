import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const css = fs.readFileSync(new URL('styles.css', root), 'utf8');
const experienceCss = fs.readFileSync(new URL('experiences.css', root), 'utf8');
const visualCss = fs.readFileSync(new URL('visual-overhaul.css', root), 'utf8');
const js = [1,2,3,4,5].map(i=>fs.readFileSync(new URL('app-' + i + '.js', root),'utf8')).join('\n');
const experiences = fs.readFileSync(new URL('experiences.js', root),'utf8');
const bridge = fs.readFileSync(new URL('experience-bridge.js', root),'utf8');
const cinematic = fs.readFileSync(new URL('cinematic-overhaul.js', root),'utf8');
const visualFixes = fs.readFileSync(new URL('visual-fixes.js', root),'utf8');
const moon = fs.readFileSync(new URL('moon-fidelity.js', root),'utf8');
const polish = fs.readFileSync(new URL('reference-polish.js', root),'utf8');
const finalizer = fs.readFileSync(new URL('reference-finalizer.js', root),'utf8');

for (const id of ['globe','timeline','playButton','sourcesDialog','exploreMenu','mobileTimeline']) assert.ok(html.includes('id="' + id + '"'), 'missing ' + id);
for (let i=1;i<=5;i++) assert.ok(html.includes('/app-' + i + '.js'), 'missing app-' + i + '.js script');
assert.ok(html.includes('/experiences.js'), 'experience suite script missing');
assert.ok(html.includes('/experiences.css'), 'experience suite stylesheet missing');
assert.ok(html.includes('/visual-overhaul.css'), 'visual overhaul stylesheet missing');
assert.ok(html.includes('/cinematic-overhaul.js'), 'photographic Earth renderer missing');
assert.ok(css.includes('@media(max-width:900px)'), 'mobile layout missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion missing');
assert.ok(visualCss.includes('.experience-panel'), 'reference visual chrome missing');
assert.ok(js.includes('PALEO_SLICES'), 'paleogeography integration missing');
assert.ok(js.includes('CRATON_ROTATIONS_URL'), 'deep-time vector reconstruction missing');
assert.ok(js.includes('MIGRATION_ROUTES'), 'human migration layer missing');
assert.ok(js.includes('initWebGL'), 'WebGL renderer missing');
for (const mode of ['orbit','moon','solar','earthquakes','oceans','civilization']) assert.ok(experiences.includes(mode), 'missing experience mode ' + mode);
for (const phrase of ['A world in orbit.','Another world. Within reach.','Everything in motion.','Earthquakes. A planet in motion.','An ocean. Always moving.']) assert.ok(experiences.includes(phrase), 'missing reference-derived experience copy: ' + phrase);
assert.ok(experienceCss.includes('.experience-footer'), 'experience controls styling missing');

assert.ok(cinematic.includes('final-earth-canvas'), 'final photographic Earth canvas missing');
assert.ok(cinematic.includes('earth-blue-marble.jpg'), 'Blue Marble source missing');
assert.ok(cinematic.includes('earth-night.jpg'), 'photographic night source missing');
assert.ok(visualFixes.includes('reference-scene-canvas'), 'reference companion renderer missing');
assert.ok(moon.includes('moon-fidelity-canvas'), 'sharp Moon fidelity layer missing');
assert.ok(polish.includes('reference-polish-canvas'), 'organic ocean / mini-Earth polish layer missing');
assert.ok(polish.includes('drawCurrentFamily'), 'organic ocean current family renderer missing');
assert.ok(finalizer.includes('reference-finalizer-canvas'), 'final reference composition layer missing');
assert.ok(finalizer.includes('drawOceanShade'), 'reference ocean lighting pass missing');
for (const file of ['visual-fixes.js','moon-fidelity.js','reference-polish.js','reference-finalizer.js']) {
  assert.ok(bridge.includes('/' + file), 'experience bridge must load ' + file);
}

const timelineFns = js.slice(js.indexOf('function clamp'), js.indexOf('function formatAge'));
const timeline = new Function(timelineFns + '; return {ageToSlider, sliderToAge};')();
assert.equal(timeline.ageToSlider(4540), 0, 'oldest timeline endpoint must be far left');
assert.equal(timeline.ageToSlider(0), 10000, 'present timeline endpoint must be far right');
for (const age of [2500,1000,750,500,251,66,1,.125,.001]) {
  const roundTrip = timeline.sliderToAge(timeline.ageToSlider(age));
  const relativeError = Math.abs(roundTrip-age)/Math.max(age,.001);
  assert.ok(relativeError < .02, 'timeline round trip drift at ' + age + ' Ma');
}
console.log('Static acceptance smoke checks passed.');
