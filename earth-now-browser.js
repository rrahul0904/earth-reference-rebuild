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

function timelineAsOf() {
  return Date.parse(mode === 'fixture' ? FIXTURE_AS_OF : new Date().toISOString());
}

function formatUtc(milliseconds) {
  return new Date(milliseconds).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

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
let mode = 'fixture';

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
  const end = mode === 'fixture' ? Date.parse(FIXTURE_AS_OF) : Date.now();
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
  const source = el('a', 'earth-now-source', 'Source and coverage');
  source.href = state.layer.provider.sourceRef;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  const foot = el('div', 'earth-now-source-line');
  const checkedAt = state.provider.checkedAt ?? state.asOf;
  foot.append(source, el('span', '', `checked ${checkedAt ? formatUtc(Date.parse(checkedAt)) : 'unknown'}`));
  row.append(head, el('p', '', detail), foot);
  return row;
}

function renderPanel() {
  if (!panel || !quakeState || !kpState) return;
  const providers = panel.querySelector('[data-earth-now-providers]');
  const events = panel.querySelector('[data-earth-now-events]');
  const digest = panel.querySelector('[data-earth-now-digest]');
  const quakeLatest = latestSignal(quakeState.signals);
  const kpLatest = latestSignal(kpState.signals);
  const slider = panel.querySelector('#earthNowTimeline');
  const timelineValue = Number(slider.value) / 1000;
  const timelineTime = new Date(timelineAsOf() - (1 - timelineValue) * WINDOW_MS);
  panel.querySelector('[data-earth-now-timeline-time]').textContent = formatUtc(timelineTime.getTime());
  providers.replaceChildren();
  events.replaceChildren();
  panel.querySelector('.earth-now-demo').textContent = mode === 'fixture' ? 'FIXTURE · NO NETWORK'
    : (quakeState.provider.status === 'healthy' && kpState.provider.status === 'healthy' ? 'LIVE SOURCES · READ ONLY' : 'LIVE SOURCES · DEGRADED');
  panel.querySelector('.earth-now-copy').textContent = mode === 'fixture'
    ? 'Deterministic source-shaped data for testing. It is not a live-feed claim.'
    : 'Provider feeds are fetched through Earth server endpoints. Each source keeps its own evidence timestamp and health state.';

  providers.append(
    providerRow('USGS earthquakes', quakeState, `${quakeSignals.length} events · observation · latest ${quakeLatest ? `${quakeLatest.freshness} ${formatUtc(Date.parse(quakeLatest.observedAt))}` : 'no recent observation'} · ${mode === 'fixture' ? 'fixture data' : `${quakeState.provider.detail} · ${quakeState.displayState}`} · global catalog completeness varies by region`),
    providerRow('NOAA planetary Kp', kpState, `Kp ${kpLatest?.properties?.kp ?? '—'} · observation · latest ${kpLatest ? `${kpLatest.freshness} ${formatUtc(Date.parse(kpLatest.observedAt))}` : 'no recent observation'} · ${mode === 'fixture' ? 'fixture data' : `${kpState.provider.detail} · ${kpState.displayState}`} · global index, not local aurora`)
  );

  for (const signal of quakeSignals) {
    const button = el('button', 'earth-now-event', '');
    button.type = 'button';
    button.dataset.earthNowEvent = signal.id;
    button.append(
      el('strong', '', signal.title),
      el('small', '', `${signal.freshness ?? 'normalized'} · ${new Date(signal.observedAt).toISOString().slice(11, 16)} UTC · ${mode === 'fixture' ? 'fixture' : 'USGS observation'}`)
    );
    button.addEventListener('click', () => {
      const selected = window.EarthConvergence.selectEvent(signal.id);
      if (!selected && signal.position) window.EarthConvergence.focusGeo(signal.position.lat, signal.position.lon, 1.45);
    });
    events.append(button);
  }

  digest.textContent = snapshotDigest ? `snapshot ${snapshotDigest.slice(0, 12)}…` : 'snapshot digest pending';
  const app = document.getElementById('app');
  app.dataset.earthNowProvider = quakeState.provider.status;
  app.dataset.earthNowDisplay = quakeState.displayState;
  app.dataset.earthNowMode = mode;
  panel.querySelector('#earthNowSimulateOutage').hidden = mode !== 'fixture';
  panel.querySelector('#earthNowRestore').hidden = mode !== 'fixture';
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
    <label class="earth-now-timeline-label" for="earthNowTimeline">24-hour signal timeline <output data-earth-now-timeline-time></output></label>
    <input id="earthNowTimeline" class="earth-now-timeline" type="range" min="0" max="1000" step="1" value="1000" aria-label="Choose a time in the last 24 hours">
    <div class="earth-now-providers" data-earth-now-providers></div>
    <div class="earth-now-actions">
      <button type="button" id="earthNowLoadFixtures">Show fixture signals</button>
      <button type="button" id="earthNowLoadLive">Load live provider data</button>
      <button type="button" id="earthNowSimulateOutage">Simulate USGS outage</button>
      <button type="button" id="earthNowRestore">Restore provider</button>
    </div>
    <div class="earth-now-events" data-earth-now-events></div>
    <p class="earth-now-receipt" data-earth-now-digest>snapshot digest pending</p>
  `;

  const hint = section.querySelector('.hint');
  if (hint) hint.insertAdjacentElement('afterend', panel);
  else section.prepend(panel);

  panel.querySelector('#earthNowTimeline').addEventListener('input', (event) => {
    convergence.setDataTime(Number(event.currentTarget.value) / 1000);
    const value = Number(event.currentTarget.value) / 1000;
    const time = new Date(timelineAsOf() - (1 - value) * WINDOW_MS);
    panel.querySelector('[data-earth-now-timeline-time]').textContent = formatUtc(time.getTime());
  });
  window.addEventListener('earth:timeline', (event) => {
    const value = Math.max(0, Math.min(1, Number(event.detail?.value) || 0));
    panel.querySelector('#earthNowTimeline').value = String(Math.round(value * 1000));
    const time = new Date(timelineAsOf() - (1 - value) * WINDOW_MS);
    panel.querySelector('[data-earth-now-timeline-time]').textContent = formatUtc(time.getTime());
  });

  panel.querySelector('#earthNowLoadFixtures').addEventListener('click', () => {
    mode = 'fixture';
    convergence.setDataTime(1);
    buildStates('healthy');
    injectFixtureEvents(convergence);
    convergence.setLayer('events', true);
    digestSnapshot(snapshot).then((value) => { snapshotDigest = value; renderPanel(); });
    renderPanel();
  });

  panel.querySelector('#earthNowSimulateOutage').addEventListener('click', () => {
    setUsgsStatus('down');
  });

  panel.querySelector('#earthNowRestore').addEventListener('click', () => {
    setUsgsStatus('healthy');
  });

  panel.querySelector('#earthNowLoadLive').addEventListener('click', () => loadLive(convergence));
}

async function setUsgsStatus(status) {
  const now = mode === 'fixture' ? FIXTURE_AS_OF : new Date().toISOString();
  quakeState = createLayerState(EARTHQUAKE_LAYER, quakeSignals, createProviderState({
    providerId: EARTHQUAKE_LAYER.provider.id,
    status,
    checkedAt: now,
    lastSuccessAt: quakeState.provider.lastSuccessAt,
    detail: status === 'down' ? 'Deterministic provider-outage simulation; cached evidence is preserved.' : 'Provider restored; current data remains as received.'
  }), now);
  snapshot = createSnapshot([quakeState, kpState], now);
  snapshotDigest = await digestSnapshot(snapshot);
  renderPanel();
  return quakeState;
}

function injectSignals(convergence) {
  convergence.clearEvents();
  for (const signal of quakeSignals) {
    if (!signal.position) continue;
    convergence.ingestEvent({
      id: signal.id,
      name: signal.title,
      region: 'Earth Now · USGS observation',
      lat: signal.position.lat,
      lon: signal.position.lon,
      time: pulseForTime(signal.observedAt),
      weight: weightForMagnitude(signal.properties.magnitude)
    });
  }
  document.getElementById('app').dataset.earthNowEvents = String(quakeSignals.length);
}

async function loadLive(convergence) {
  const button = panel.querySelector('#earthNowLoadLive');
  button.disabled = true;
  button.textContent = 'Contacting declared providers…';
  try {
    const [usgsResponse, noaaResponse] = await Promise.all([
      fetch('/api/earth-now/earthquakes', { headers: { Accept: 'application/json' } }),
      fetch('/api/earth-now/planetary-kp', { headers: { Accept: 'application/json' } })
    ]);
    if (!usgsResponse.ok || !noaaResponse.ok) throw new Error('provider endpoint unavailable');
    const [usgs, noaa] = await Promise.all([usgsResponse.json(), noaaResponse.json()]);
    if (usgs.schemaVersion !== 'earth-now-provider/v1' || noaa.schemaVersion !== 'earth-now-provider/v1') throw new Error('invalid provider response');
    mode = 'live';
    convergence.setDataTime(1);
    quakeState = usgs.layerState;
    kpState = noaa.layerState;
    quakeSignals = quakeState.signals;
    kpSignals = kpState.signals;
    snapshot = createSnapshot([quakeState, kpState], new Date().toISOString());
    injectSignals(convergence);
    snapshotDigest = await digestSnapshot(snapshot);
    renderPanel();
    document.getElementById('app').dataset.earthNowMode = 'live';
  } catch {
    if (mode === 'live') {
      const now = new Date().toISOString();
      quakeState = createLayerState(EARTHQUAKE_LAYER, quakeSignals, createProviderState({
        providerId: EARTHQUAKE_LAYER.provider.id, status: 'down', checkedAt: now,
        lastSuccessAt: quakeState.provider.lastSuccessAt, detail: 'Earth endpoint unavailable; keeping cached source evidence.'
      }), now);
      kpState = createLayerState(PLANETARY_KP_LAYER, kpSignals, createProviderState({
        providerId: PLANETARY_KP_LAYER.provider.id, status: 'down', checkedAt: now,
        lastSuccessAt: kpState.provider.lastSuccessAt, detail: 'Earth endpoint unavailable; keeping cached source evidence.'
      }), now);
      snapshot = createSnapshot([quakeState, kpState], now);
      snapshotDigest = await digestSnapshot(snapshot);
    }
    renderPanel();
    panel.querySelector('.earth-now-copy').textContent = 'Earth Now endpoints could not be reached. Previously validated signals remain cached with provider health marked down; deterministic fixtures remain available.';
  } finally {
    button.disabled = false;
    button.textContent = 'Load live provider data';
  }
}

async function init() {
  const convergence = await waitForConvergence();
  buildStates('healthy');
  installPanel(convergence);
  snapshotDigest = await digestSnapshot(snapshot);
  renderPanel();

  const app = document.getElementById('app');
  app.dataset.earthNowReady = 'true';
  app.dataset.earthNowMode = 'fixture';

  window.EarthNow = Object.freeze({
    version: 'earth-now/phase-b-fixture-1',
    get mode() { return mode; },
    get asOf() { return mode === 'fixture' ? FIXTURE_AS_OF : snapshot?.asOf ?? new Date().toISOString(); },
    getSnapshot: () => snapshot,
    getDigest: () => snapshotDigest,
    getQuakeSignals: () => quakeSignals.map((signal) => ({ ...signal })),
    getKpSignals: () => kpSignals.map((signal) => ({ ...signal })),
    loadFixtures: () => { mode = 'fixture'; convergence.setDataTime(1); buildStates('healthy'); injectFixtureEvents(convergence); renderPanel(); return snapshot; },
    loadLive: () => loadLive(convergence),
    simulateUsgsOutage: () => setUsgsStatus('down'),
    restoreUsgs: () => setUsgsStatus('healthy')
  });
}

init().catch((error) => {
  const app = document.getElementById('app');
  if (app) {
    app.dataset.earthNowReady = 'false';
    app.dataset.earthNowError = String(error?.message || error).slice(0, 160);
  }
});
