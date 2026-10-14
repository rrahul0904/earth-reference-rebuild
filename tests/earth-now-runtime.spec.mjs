import test from 'node:test';
import assert from 'node:assert/strict';

import { EARTHQUAKE_LAYER, normalizeUsgsGeoJson } from '../earth-now-adapters.js';
import { createLayerState, createProviderState } from '../earth-signal-core.js';
import { createProviderHandler, resetProviderRuntimeForTests } from '../server/earth-now/runtime.js';
import { createEvidenceReceipt } from '../server/earth-now/receipt.js';

const NOW = Date.parse('2026-10-13T12:00:00.000Z');
const TEST_USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const feed = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', id: 'us-test-1',
    properties: { mag: 4.2, place: 'Test region', time: NOW - 60_000, type: 'earthquake', url: 'https://earthquake.usgs.gov/' },
    geometry: { type: 'Point', coordinates: [10, 20, 5] }
  }]
};

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

function setup(fetchImpl, id = 'test-usgs-runtime', now = () => NOW) {
  resetProviderRuntimeForTests();
  const config = {
    id,
    url: TEST_USGS_URL,
    sourceUrl: TEST_USGS_URL,
    ttlMs: 60_000,
    maxBytes: 100_000,
    createReceipt: (layerState, receivedAt) => createEvidenceReceipt({ providerId: id, sourceUrl: TEST_USGS_URL, layerState, receivedAt }),
    normalize: normalizeUsgsGeoJson,
    createState: (signals, now, status = 'healthy', lastSuccessAt = now) => createLayerState(
      EARTHQUAKE_LAYER,
      signals,
      createProviderState({ providerId: EARTHQUAKE_LAYER.provider.id, status, checkedAt: now, lastSuccessAt, detail: status === 'down' ? 'Provider unavailable.' : 'Validated.' }),
      now
    )
  };
  return createProviderHandler(config, { fetchImpl, now });
}

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}

test('server adapter calls only its configured URL and returns a validated layer state', async () => {
  const calls = [];
  const handler = setup(async (url, options) => { calls.push({ url, options }); return jsonResponse(feed); });
  const res = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, res);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TEST_USGS_URL);
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.layerState.schemaVersion, 'earth-signal/v1');
  assert.equal(res.body.layerState.signals.length, 1);
  assert.equal(res.body.layerState.provider.status, 'healthy');
  assert.equal(res.body.receipt.schemaVersion, 'evidence-receipt/v1');
  assert.equal(res.body.receipt.evidenceClass, 'observation');
  assert.match(res.body.receipt.hash, /^[a-f0-9]{64}$/);
  assert.equal(res.body.receipt.sourceUrl, 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
  assert.match(res.headers['cache-control'], /max-age=30/);
});

test('server adapter serves stale validated data and reports provider down after bounded retry failure', async () => {
  let calls = 0;
  let online = true;
  let now = NOW;
  const handler = setup(async () => { calls += 1; if (!online) throw new Error('network error'); return jsonResponse(feed); }, 'test-usgs-stale', () => now);
  const first = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, first);
  assert.equal(first.body.layerState.signals.length, 1);

  online = false;
  now += 60_001;
  const failed = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, failed);
  assert.equal(calls, 4, 'one initial request plus two bounded exponential retries');
  assert.equal(failed.body.sourceStatus, 'down');
  assert.equal(failed.body.layerState.provider.status, 'down');
  assert.equal(failed.body.layerState.displayState, 'cached-provider-down');
  assert.equal(failed.body.layerState.signals.length, 1);
  assert.equal(failed.body.receipt.freshness, failed.body.layerState.signals[0].freshness);
  assert.doesNotMatch(JSON.stringify(failed.body), /network error/);

  const cooled = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, cooled);
  assert.equal(calls, 4, 'cooldown avoids hammering a failed provider');
});

test('endpoint rejects caller-selected query parameters and bounds response bodies', async () => {
  let calls = 0;
  const handler = setup(async () => { calls += 1; return new Response('x'.repeat(100_001), { headers: { 'content-type': 'application/json' } }); }, 'test-usgs-bounds');
  const query = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes?url=https://attacker.invalid' }, query);
  assert.equal(query.statusCode, 400);
  assert.equal(calls, 0);

  const oversized = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, oversized);
  assert.equal(oversized.body.layerState.provider.status, 'down');
  assert.deepEqual(oversized.body.layerState.signals, []);
  assert.doesNotMatch(JSON.stringify(oversized.body), /attacker|earthquake\.usgs\.gov\/fixed/);
});

test('unsupported methods are rejected without invoking upstream providers', async () => {
  let calls = 0;
  const handler = setup(async () => { calls += 1; return jsonResponse(feed); }, 'test-usgs-method');
  const res = responseRecorder();
  await handler({ method: 'POST', url: '/api/earth-now/earthquakes' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(calls, 0);
  assert.equal(res.headers.allow, 'GET, HEAD');
});

test('rate limits honor Retry-After and HEAD does not contact a provider', async () => {
  let now = NOW;
  let calls = 0;
  const handler = setup(async () => {
    calls += 1;
    return new Response('{}', { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '30' } });
  }, 'test-usgs-rate-limit', () => now);
  const head = responseRecorder();
  await handler({ method: 'HEAD', url: '/api/earth-now/earthquakes' }, head);
  assert.equal(head.statusCode, 200);
  assert.equal(calls, 0);

  const limited = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, limited);
  assert.equal(limited.body.sourceStatus, 'down');
  assert.equal(calls, 1);
  const cooled = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, cooled);
  assert.equal(calls, 1, 'Retry-After cooldown suppresses another provider request');

  now += 30_001;
  const recovered = responseRecorder();
  await handler({ method: 'GET', url: '/api/earth-now/earthquakes' }, recovered);
  assert.equal(calls, 2, 'provider is retried when the source cooldown expires');
});
