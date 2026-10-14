import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import {
  EarthSignalContract,
  canonicalSnapshotJson,
  classifyFreshness,
  createConditionScore,
  createLayerSpec,
  createLayerState,
  createProviderState,
  createSnapshot,
  digestSnapshot,
  normalizeSignal
} from '../earth-signal-core.js';

const NOW = '2026-10-07T18:00:00.000Z';

function earthquakeLayer(overrides = {}) {
  return createLayerSpec({
    id: 'earthquakes',
    label: 'Recent earthquakes',
    description: 'Observed seismic events from a declared public provider.',
    evidenceClass: 'observation',
    maxAgeMs: 60 * 60 * 1000,
    expireAfterMs: 24 * 60 * 60 * 1000,
    provider: {
      id: 'usgs-earthquakes',
      name: 'USGS Earthquake Hazards Program',
      sourceRef: 'https://earthquake.usgs.gov/'
    },
    networkPolicy: {
      mode: 'public-read',
      hosts: ['earthquake.usgs.gov']
    },
    ...overrides
  });
}

function earthquakeSignal(overrides = {}) {
  return {
    id: 'eq-001',
    layerId: 'earthquakes',
    title: 'M 5.2 example event',
    observedAt: '2026-10-07T17:45:00.000Z',
    receivedAt: '2026-10-07T17:46:00.000Z',
    position: { lat: 35.2, lon: 140.4 },
    properties: { magnitude: 5.2, depthKm: 24 },
    ...overrides
  };
}

test('contract advertises explicit evidence classes and no implicit live type', () => {
  assert.deepEqual(EarthSignalContract.evidenceClasses, ['observation', 'forecast', 'model', 'historical', 'derived']);
  assert.equal(EarthSignalContract.evidenceClasses.includes('live'), false);
});

test('layer specs require a declared evidence class and network boundary', () => {
  const layer = earthquakeLayer();
  assert.equal(layer.schemaVersion, 'earth-signal/v1');
  assert.equal(layer.provider.id, 'usgs-earthquakes');
  assert.deepEqual(layer.networkPolicy.hosts, ['earthquake.usgs.gov']);

  assert.throws(
    () => earthquakeLayer({ evidenceClass: 'realtime' }),
    /evidenceClass must be one of/
  );
  assert.throws(
    () => earthquakeLayer({ networkPolicy: { mode: 'none', hosts: ['example.com'] } }),
    /hosts must be empty/
  );
});

test('signal normalization fails closed on malformed coordinates and timestamps', () => {
  const layer = earthquakeLayer();
  assert.throws(() => normalizeSignal(earthquakeSignal({ position: { lat: 95, lon: 10 } }), layer), /position.lat/);
  assert.throws(() => normalizeSignal(earthquakeSignal({ position: { lat: 10, lon: 181 } }), layer), /position.lon/);
  assert.throws(() => normalizeSignal(earthquakeSignal({ observedAt: 'not-a-date' }), layer), /observedAt/);
});

test('future observations are never classified as fresh', () => {
  const layer = earthquakeLayer();
  const future = earthquakeSignal({ observedAt: '2026-10-07T19:00:00.000Z' });
  assert.equal(classifyFreshness(future, layer, NOW), 'future');
});

test('freshness distinguishes fresh, aging, stale and expired evidence', () => {
  const layer = earthquakeLayer();
  assert.equal(classifyFreshness(earthquakeSignal({ observedAt: '2026-10-07T17:45:00.000Z' }), layer, NOW), 'fresh');
  assert.equal(classifyFreshness(earthquakeSignal({ observedAt: '2026-10-07T17:15:00.000Z' }), layer, NOW), 'aging');
  assert.equal(classifyFreshness(earthquakeSignal({ observedAt: '2026-10-07T15:00:00.000Z' }), layer, NOW), 'stale');
  assert.equal(classifyFreshness(earthquakeSignal({ observedAt: '2026-10-06T16:00:00.000Z' }), layer, NOW), 'expired');
});

test('provider outage preserves cached evidence but refuses to call it current', () => {
  const layer = earthquakeLayer();
  const down = createProviderState({
    providerId: 'usgs-earthquakes',
    status: 'down',
    checkedAt: NOW,
    lastSuccessAt: '2026-10-07T17:47:00.000Z',
    detail: 'fixture outage'
  });
  const state = createLayerState(layer, [earthquakeSignal()], down, NOW);
  assert.equal(state.signals.length, 1);
  assert.equal(state.signals[0].freshness, 'fresh');
  assert.equal(state.displayState, 'cached-provider-down');
});

test('healthy provider with stale observations is labelled stale', () => {
  const layer = earthquakeLayer();
  const healthy = createProviderState({ providerId: 'usgs-earthquakes', status: 'healthy', checkedAt: NOW });
  const state = createLayerState(
    layer,
    [earthquakeSignal({ observedAt: '2026-10-07T15:00:00.000Z' })],
    healthy,
    NOW
  );
  assert.equal(state.displayState, 'stale');
});

test('condition scores require a named versioned recipe and source inputs', () => {
  const valid = createConditionScore({
    id: 'mushroom-score-dalarna-20261007',
    recipeId: 'mushroom-weather',
    recipeVersion: '1.0.0',
    label: 'Mushroom weather',
    value: 74,
    confidence: 0.62,
    explanation: 'Recent rain and mild temperature inputs meet the recipe thresholds.',
    computedAt: NOW,
    inputRefs: ['weather:rain-24h:dalarna', 'weather:temp-7d:dalarna'],
    region: { lat: 60.6, lon: 15.6, precisionKm: 50 }
  });
  assert.equal(valid.evidenceClass, 'derived');
  assert.equal(valid.value, 74);
  assert.deepEqual(valid.inputRefs, ['weather:rain-24h:dalarna', 'weather:temp-7d:dalarna']);

  assert.throws(
    () => createConditionScore({
      id: 'bad-score', recipeId: 'recipe', recipeVersion: '1', label: 'Bad', value: 10,
      confidence: 0.5, explanation: 'No evidence.', computedAt: NOW, inputRefs: []
    }),
    /requires at least one source input/
  );
  assert.throws(
    () => createConditionScore({
      id: 'bad-confidence', recipeId: 'recipe', recipeVersion: '1', label: 'Bad', value: 10,
      confidence: 1.2, explanation: 'Invalid confidence.', computedAt: NOW, inputRefs: ['x']
    }),
    /confidence must be between 0 and 1/
  );
});

test('snapshot canonicalization and SHA-256 digest are deterministic', async () => {
  const quakeLayer = earthquakeLayer();
  const auroraLayer = createLayerSpec({
    id: 'aurora',
    label: 'Aurora forecast',
    evidenceClass: 'model',
    maxAgeMs: 30 * 60 * 1000,
    expireAfterMs: 2 * 60 * 60 * 1000,
    provider: { id: 'noaa-swpc', name: 'NOAA SWPC', sourceRef: 'https://www.swpc.noaa.gov/' },
    networkPolicy: { mode: 'public-read', hosts: ['www.swpc.noaa.gov'] }
  });

  const healthyQuake = createProviderState({ providerId: 'usgs-earthquakes', status: 'healthy', checkedAt: NOW });
  const healthyAurora = createProviderState({ providerId: 'noaa-swpc', status: 'healthy', checkedAt: NOW });

  const quakeState = createLayerState(quakeLayer, [earthquakeSignal({ properties: { depthKm: 24, magnitude: 5.2 } })], healthyQuake, NOW);
  const auroraState = createLayerState(auroraLayer, [{
    id: 'ovation-001',
    title: 'Aurora model fixture',
    observedAt: '2026-10-07T17:55:00.000Z',
    sourceRef: 'https://www.swpc.noaa.gov/',
    properties: { kp: 4, probability: 0.35 }
  }], healthyAurora, NOW);

  const first = createSnapshot([quakeState, auroraState], NOW);
  const second = createSnapshot([auroraState, quakeState], NOW);
  assert.equal(canonicalSnapshotJson(first), canonicalSnapshotJson(second));
  assert.equal(await digestSnapshot(first, webcrypto), await digestSnapshot(second, webcrypto));
  assert.match(await digestSnapshot(first, webcrypto), /^[a-f0-9]{64}$/);
});

test('the Phase A contract never infers or requires user location', () => {
  const layer = earthquakeLayer();
  const normalized = normalizeSignal(earthquakeSignal(), layer);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'userLocation'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(layer, 'userLocation'), false);
});
