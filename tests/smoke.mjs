import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const css = fs.readFileSync(new URL('styles.css', root), 'utf8');
const js = [1,2,3,4,5].map(i=>fs.readFileSync(new URL('app-' + i + '.js', root),'utf8')).join('\n');
for (const id of ['globe','timeline','playButton','sourcesDialog','exploreMenu','mobileTimeline']) assert.ok(html.includes('id="' + id + '"'), 'missing ' + id);
for (let i=1;i<=5;i++) assert.ok(html.includes('/app-' + i + '.js'), 'missing app-' + i + '.js script');
assert.ok(css.includes('@media(max-width:900px)'), 'mobile layout missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion missing');
assert.ok(js.includes('PALEO_SLICES'), 'paleogeography integration missing');
assert.ok(js.includes('CRATON_ROTATIONS_URL'), 'deep-time vector reconstruction missing');
assert.ok(js.includes('MIGRATION_ROUTES'), 'human migration layer missing');
assert.ok(js.includes('initWebGL'), 'WebGL renderer missing');

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
