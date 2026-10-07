import {
  createLayerState,
  createProviderState,
  createSnapshot,
  digestSnapshot
} from './earth-signal-core.js';
import {
  EARTHQUAKE_LAYER,
  PLANETARY_KP_LAYER,
  latestSignal,
  normalizeNoaaPlanetaryKp,
  normalizeUsgsGeoJson
} from './earth-now-adapters.js';

const FIXTURE_AS_OF = '2026-10-07T18:05:00.000Z';
const WINDOW_MS = 24 * 60 * 60 * 1000;

const USGS_FIXTURE = Object.freeze({
  type: 'FeatureCollection',
  metadata: { generated: Date.parse('2026-10-07T18:04:00.000Z'), count: 3, title: 'Earth Now deterministic fixture' },
  features: Object.freeze([
    {
      type: 'Feature', id: 'earth-now-fixture-japan',
      properties: {
        mag: 5.2, place: 'Fixture · northwest Pacific',
        time: Date.parse('2026-10-07T17:45:00.000Z'), updated: Date.parse('2026-10-07T17:50:00.000Z'),
        url: 'https://earthquake.usgs.gov/', sig: 420, alert: 'green', status: 'fixture', tsunami: 0, type: 'earthquake'
      },
      geometry: { type: 'Point', coordinates: [142.4, 38.3, 24.5] }
    },
    {
      type: 'Feature', id: 'earth-now-fixture-alaska',
      properties: {
        mag: 4.7, place: 'Fixture · Alaska',
        time: Date.parse('2026-10-07T13:25:00.000Z'), updated: Date.parse('2026-10-07T13:29:00.000Z'),
        url: 'https://earthquake.usgs.gov/', sig: 330, alert: '', status: 'fixture', tsunami: 0, type: 'earthquake'
      },
      geometry: { type: 'Point', coordinates: [-147.6, 61.0, 35] }
    },
    {
      type: 'Feature', id: 'earth-now-fixture-chile',
      properties: {
        mag: 5.8, place: 'Fixture · southern Chile',
        time: Date.parse('2026-10-06T23:40:00.000Z'), updated: Date.parse('2026-10-06T23:44:00.000Z'),
        url: 'https://earthquake.usgs.gov/', sig: 510, alert: 'green', status: 'fixture', tsunami: 0, type: 'earthquake'
      },
      geometry: { type: 'Point', coordinates: [-73.0, -38.2, 18] }
    }
  ])
});

const NOAA_KP_FIXTURE = Object.freeze([
  Object.freeze({ time_tag: '2026-10-07T09:00:00', Kp: 0.67, a_running: 3, station_count: 8 }),
  Object.freeze({ time_tag: '2026-10-07T12:00:00', Kp: 1.00, a_running: 4, station_count: 8 }),
  Object.freeze({ time_tag: '2026-10-07T15:00:00', Kp: 2.67, a_running: 12, station_count: 8 })
]);

let quakeSignals = [];
let kpSignals = [];
let quakeState = null;
let kpState = null;
let snapshot = null;
let snapshotDigest = '';
let panel = null;

function waitForConvergence(deadline = Date.now() + 10_000) {
  return new Promise((resolve, reject) => {
    function check() {
      if (window.EarthConvergence) return resolve(window.EarthConvergence);
      if (Date.now() >= deadline) return reject(new Error('EarthConvergence did not initialize'));
      setTimeout(check, 30);
    }
    check();
  });
}

function buildStates(usgsStatus = 'healthy') {
  quakeSignals = normalizeUsgsGeoJson(USGS_FIXTURE, FIXTURE_AS_OF);
  kpSignals = normalizeNoaaPlanetaryKp(NOAA_KP_FIXTURE, FIXTURE_AS_OF);

  quakeState = createLayerState(
    EARTHQUAKE_LAYER,
    quakeSignals,
    createProviderState({
      providerId: EARTHQUAKE_LAYER.provider.id,
      status: usgsStatus,
      checkedAt: FIXTURE_AS_OF,
      lastSuccessAt: '2026-10-07T18:04:00.000Z',
      detail: usgsStatus === 'down' ? 'Deterministic provider-outage simulation.' : 'Deterministic fixture state.'
    }),
    FIXTURE_AS_OF
  );

  kpState = createLayerState(
    PLANETARY_KP_LAYER,
    kpSignals,
    createProviderState({
      providerId: PLANETARY_KP_LAYER.provider.id,
      status: 'healthy',
      checkedAt: FIXTURE_AS_OF,
      lastSuccessAt: '2026-10-07T18:04:00.000Z',
      detail: 'Deterministic fixture state.'
    }),
    FIXTURE_AS_OF
  );

  snapshot = createSnapshot([quakeState, kpState], FIXTURE_AS_OF);
  return snapshot;
}

function pulseForTime(iso) {
  const end = Date.parse(FIXTURE_AS_OF);
  const start = end - WINDOW_MS;
  return Math.max(0, Math.min(1, (Date.parse(iso) - start) / WINDOW_MS));
}

function weightForMagnitude(value) {
  const magnitude = Number(value);
  if (!Number.isFinite(magnitude)) return 1;
  return Math.max(0.5, Math.min(4, 0.45 + magnitude / 2.5));
}

function injectFixtureEvents(convergence) {
  convergence.clearEvents();
  for (const signal of quakeSignals) {
    if (!signal.position) continue;
    convergence.ingestEvent({
      id: signal.id,
      name: signal.title,
      region: 'Earth Now · deterministic fixture',
      lat: signal.position.lat,
      lon: signal.position.lon,
      time: pulseForTime(signal.observedAt),
      weight: weightForMagnitude(signal.properties.magnitude)
    });
  }
  convergence.setLayer('events', true);
  document.getElementById('app').dataset.earthNowEvents = String(quakeSignals.length);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function providerRow(label, state, detail) {
  const row = el('div', 'earth-now-provider');
  const head = el('div', 'earth-now-provider-head');
  head.append(el('strong', '', label));
  const badge = el('span', `earth-now-state state-${state.displayState}`, state.displayState.replaceAll('-', ' '));
  head.append(badge);
  row.append(head, el('p', '', detail));
  return row;
}

function renderPanel() {
  if (!panel || !quakeState || !kpState) return;
  const providers = panel.querySelector('[data-earth-now-providers]');
  const events = panel.querySelector('[data-earth-now-events]');
  const digest = panel.querySelector('[data-earth-now-digest]');
  providers.replaceChildren();
  events.replaceChildren();

  providers.append(
    providerRow('USGS earthquakes', quakeState, `${quakeSignals.length} fixture events · observation · provider ${quakeState.provider.status}`),
    providerRow('NOAA planetary Kp', kpState, `Kp ${latestSignal(kpSignals)?.properties?.kp ?? '—'} · observation · global index, not local aurora`)
  );

  for (const signal of quakeSignals) {
    const button = el('button', 'earth-now-event', '');
    button.type = 'button';
    button.dataset.earthNowEvent = signal.id;
    button.append(
      el('strong', '', signal.title),
      el('small', '', `${signal.freshness ?? 'normalized'} · ${new Date(signal.observedAt).toISOString().slice(11, 16)} UTC`)
    );
    button.addEventListener('click', () => {
      const selected = window.EarthConvergence.selectEvent(signal.id);
      if (!selected && signal.position) window.EarthConvergence.focusGeo(signal.position.lat, signal.position.lon, 1.45);
    });
    events.append(button);
  }

  digest.textContent = snapshotDigest ? `snapshot ${snapshotDigest.slice(0, 12)}…` : 'snapshot digest pending';
  document.getElementById('app').dataset.earthNowProvider = quakeState.provider.status;
  document.getElementById('app').dataset.earthNowDisplay = quakeState.displayState;
}

function installPanel(convergence) {
  const section = document.querySelector('.convergence-section[data-section="layers"]');
  if (!section || document.getElementById('earthNowPanel')) return;

  panel = el('section', 'earth-now-panel');
  panel.id = 'earthNowPanel';
  panel.innerHTML = `
    <div class="earth-now-kicker"><span>EARTH NOW</span><span class="earth-now-demo">FIXTURE · NO NETWORK</span></div>
    <h4>What is happening on Earth?</h4>
    <p class="earth-now-copy">Truth-first browser slice. The data below is deterministic test evidence, not a live-feed claim.</p>
    <div class="earth-now-providers" data-earth-now-providers></div>
    <div class="earth-now-actions">
      <button type="button" id="earthNowLoadFixtures">Show fixture signals</button>
      <button type="button" id="earthNowSimulateOutage">Simulate USGS outage</button>
      <button type="button" id="earthNowRestore">Restore provider</button>
    </div>
    <div class="earth-now-events" data-earth-now-events></div>
    <p class="earth-now-receipt" data-earth-now-digest>snapshot digest pending</p>
  `;

  const hint = section.querySelector('.hint');
  if (hint) hint.insertAdjacentElement('afterend', panel);
  else section.prepend(panel);

  panel.querySelector('#earthNowLoadFixtures').addEventListener('click', () => {
    buildStates('healthy');
    injectFixtureEvents(convergence);
    digestSnapshot(snapshot).then((value) => { snapshotDigest = value; renderPanel(); });
    renderPanel();
  });

  panel.querySelector('#earthNowSimulateOutage').addEventListener('click', () => {
    buildStates('down');
    renderPanel();
  });

  panel.querySelector('#earthNowRestore').addEventListener('click', () => {
    buildStates('healthy');
    renderPanel();
  });
}

async function init() {
  const convergence = await waitForConvergence();
  buildStates('healthy');
  installPanel(convergence);
  injectFixtureEvents(convergence);
  snapshotDigest = await digestSnapshot(snapshot);
  renderPanel();

  const app = document.getElementById('app');
  app.dataset.earthNowReady = 'true';
  app.dataset.earthNowMode = 'fixture';

  window.EarthNow = Object.freeze({
    version: 'earth-now/phase-b-fixture-1',
    mode: 'fixture',
    asOf: FIXTURE_AS_OF,
    getSnapshot: () => snapshot,
    getDigest: () => snapshotDigest,
    getQuakeSignals: () => quakeSignals.map((signal) => ({ ...signal })),
    getKpSignals: () => kpSignals.map((signal) => ({ ...signal })),
    loadFixtures: () => { buildStates('healthy'); injectFixtureEvents(convergence); renderPanel(); return snapshot; },
    simulateUsgsOutage: () => { buildStates('down'); renderPanel(); return quakeState; },
    restoreUsgs: () => { buildStates('healthy'); renderPanel(); return quakeState; }
  });
}

init().catch((error) => {
  const app = document.getElementById('app');
  if (app) {
    app.dataset.earthNowReady = 'false';
    app.dataset.earthNowError = String(error?.message || error).slice(0, 160);
  }
});
