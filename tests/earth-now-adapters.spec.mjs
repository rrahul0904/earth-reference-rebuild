import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EARTHQUAKE_LAYER,
  PLANETARY_KP_LAYER,
  latestSignal,
  normalizeNoaaPlanetaryKp,
  normalizeUsgsGeoJson
} from '../earth-now-adapters.js';

const RECEIVED = '2026-10-07T18:05:00.000Z';

test('USGS GeoJSON fixture normalizes to the Earth signal contract', () => {
  const feed = {
    type: 'FeatureCollection',
    metadata: { generated: Date.parse('2026-10-07T18:04:00.000Z'), count: 1 },
    features: [{
      type: 'Feature',
      id: 'us7000test',
      properties: {
        mag: 5.2,
        place: 'Example region',
        time: Date.parse('2026-10-07T17:45:00.000Z'),
        updated: Date.parse('2026-10-07T17:50:00.000Z'),
        url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000test',
        sig: 420,
        alert: 'green',
        status: 'reviewed',
        tsunami: 0,
        type: 'earthquake'
      },
      geometry: { type: 'Point', coordinates: [140.4, 35.2, 24.5] }
    }]
  };

  const [signal] = normalizeUsgsGeoJson(feed, RECEIVED);
  assert.equal(signal.layerId, EARTHQUAKE_LAYER.id);
  assert.equal(signal.evidenceClass, 'observation');
  assert.equal(signal.position.lat, 35.2);
  assert.equal(signal.position.lon, 140.4);
  assert.equal(signal.properties.depthKm, 24.5);
  assert.equal(signal.properties.magnitude, 5.2);
  assert.equal(signal.properties.tsunami, false);
  assert.equal(signal.observedAt, '2026-10-07T17:45:00.000Z');
});

test('USGS adapter rejects malformed geometry and unsafe oversize feeds', () => {
  assert.throws(
    () => normalizeUsgsGeoJson({ type: 'FeatureCollection', features: [{ properties: {}, geometry: { type: 'Polygon', coordinates: [] } }] }, RECEIVED),
    /Point coordinates/
  );

  const oversized = { type: 'FeatureCollection', features: new Array(10_001).fill({}) };
  assert.throws(() => normalizeUsgsGeoJson(oversized, RECEIVED), /10,000 event safety bound/);
});

test('NOAA planetary Kp fixture is explicitly an observation, not a local aurora reading', () => {
  const rows = [
    { time_tag: '2026-10-07T12:00:00', Kp: 1.0, a_running: 4, station_count: 8 },
    { time_tag: '2026-10-07T15:00:00', Kp: 2.67, a_running: 12, station_count: 8 }
  ];
  const signals = normalizeNoaaPlanetaryKp(rows, RECEIVED);
  const latest = latestSignal(signals);

  assert.equal(latest.layerId, PLANETARY_KP_LAYER.id);
  assert.equal(latest.evidenceClass, 'observation');
  assert.equal(latest.position, null);
  assert.equal(latest.properties.kp, 2.67);
  assert.equal(latest.properties.stormThresholdReached, false);
  assert.match(PLANETARY_KP_LAYER.coverage, /not a local aurora observation/i);
});

test('NOAA Kp adapter marks the documented Kp 5 storm threshold', () => {
  const [signal] = normalizeNoaaPlanetaryKp([
    { time_tag: '2026-10-07T18:00:00', Kp: 5, a_running: 48, station_count: 8 }
  ], RECEIVED);
  assert.equal(signal.properties.stormThresholdReached, true);
});

test('provider adapters fail closed on impossible source values', () => {
  assert.throws(
    () => normalizeNoaaPlanetaryKp([{ time_tag: 'bad', Kp: 2, a_running: 7, station_count: 8 }], RECEIVED),
    /time_tag is invalid/
  );
  assert.throws(
    () => normalizeNoaaPlanetaryKp([{ time_tag: '2026-10-07T15:00:00', Kp: 10, a_running: 7, station_count: 8 }], RECEIVED),
    /Kp must be between 0 and 9/
  );
});
