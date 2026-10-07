import {
  createLayerSpec,
  normalizeSignal
} from './earth-signal-core.js';

export const EARTHQUAKE_LAYER = createLayerSpec({
  id: 'earth-now-earthquakes',
  label: 'Recent earthquakes',
  description: 'Observed earthquake events normalized from the declared USGS GeoJSON feed.',
  evidenceClass: 'observation',
  maxAgeMs: 60 * 60 * 1000,
  expireAfterMs: 24 * 60 * 60 * 1000,
  provider: {
    id: 'usgs-earthquakes',
    name: 'USGS Earthquake Hazards Program',
    sourceRef: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php'
  },
  coverage: 'Global catalog; completeness varies by magnitude, network and region.',
  networkPolicy: {
    mode: 'public-read',
    hosts: ['earthquake.usgs.gov']
  }
});

export const PLANETARY_KP_LAYER = createLayerSpec({
  id: 'earth-now-planetary-kp',
  label: 'Planetary Kp',
  description: 'Observed planetary geomagnetic K index from NOAA Space Weather Prediction Center.',
  evidenceClass: 'observation',
  maxAgeMs: 4 * 60 * 60 * 1000,
  expireAfterMs: 12 * 60 * 60 * 1000,
  provider: {
    id: 'noaa-swpc-kp',
    name: 'NOAA Space Weather Prediction Center',
    sourceRef: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
  },
  coverage: 'Planetary geomagnetic index; this is not a local aurora observation.',
  networkPolicy: {
    mode: 'public-read',
    hosts: ['services.swpc.noaa.gov']
  }
});

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function timestampFromEpoch(value, name) {
  const time = Number(value);
  if (!Number.isFinite(time) || time <= 0) throw new TypeError(`${name} must be a positive epoch-millisecond timestamp`);
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${name} is invalid`);
  return date.toISOString();
}

function utcTimeTag(value, name) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${name} is required`);
  const explicitZone = /(?:z|[+-]\d\d:\d\d)$/i.test(text);
  const normalized = explicitZone ? text : `${text}Z`;
  const time = Date.parse(normalized);
  if (!Number.isFinite(time)) throw new TypeError(`${name} is invalid`);
  return new Date(time).toISOString();
}

function finite(value, name, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new TypeError(`${name} must be between ${min} and ${max}`);
  return number;
}

function bounded(value, fallback, max) {
  const text = String(value ?? fallback ?? '').trim();
  return text.slice(0, max);
}

function safeUrl(value, fallback) {
  const text = bounded(value, fallback, 500);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return fallback;
  }
  return parsed.protocol === 'https:' ? parsed.toString() : fallback;
}

export function normalizeUsgsGeoJson(feed, receivedAt) {
  object(feed, 'USGS feed');
  if (feed.type !== 'FeatureCollection' || !Array.isArray(feed.features)) {
    throw new TypeError('USGS feed must be a GeoJSON FeatureCollection');
  }
  if (feed.features.length > 10_000) throw new TypeError('USGS feed exceeds the 10,000 event safety bound');

  const received = new Date(receivedAt);
  if (!Number.isFinite(received.getTime())) throw new TypeError('receivedAt is invalid');
  const receivedIso = received.toISOString();

  return feed.features.map((feature, index) => {
    object(feature, `USGS feature ${index}`);
    const properties = object(feature.properties, `USGS feature ${index}.properties`);
    const geometry = object(feature.geometry, `USGS feature ${index}.geometry`);
    if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      throw new TypeError(`USGS feature ${index} must contain Point coordinates`);
    }

    const lon = finite(geometry.coordinates[0], `USGS feature ${index} longitude`, -180, 180);
    const lat = finite(geometry.coordinates[1], `USGS feature ${index} latitude`, -90, 90);
    const depthKm = geometry.coordinates[2] === undefined
      ? null
      : finite(geometry.coordinates[2], `USGS feature ${index} depth`, -12, 800);
    const magnitude = properties.mag === null || properties.mag === undefined
      ? null
      : finite(properties.mag, `USGS feature ${index} magnitude`, -2, 10.5);
    const observedAt = timestampFromEpoch(properties.time, `USGS feature ${index}.properties.time`);
    const id = bounded(feature.id, `usgs-${index}`, 96).replace(/[^a-z0-9._:-]/gi, '-');
    const place = bounded(properties.place, 'Location pending', 160);
    const magnitudeLabel = magnitude === null ? 'Magnitude pending' : `M ${magnitude.toFixed(1)}`;

    return normalizeSignal({
      id,
      layerId: EARTHQUAKE_LAYER.id,
      title: `${magnitudeLabel} · ${place}`,
      summary: bounded(properties.type === 'earthquake' ? 'Observed earthquake event.' : properties.type, 'Observed seismic event.', 300),
      observedAt,
      receivedAt: receivedIso,
      position: {
        lat,
        lon,
        ...(depthKm === null ? {} : { altitudeKm: -depthKm })
      },
      sourceRef: safeUrl(properties.url, EARTHQUAKE_LAYER.provider.sourceRef),
      properties: {
        magnitude,
        depthKm,
        significance: Number.isFinite(Number(properties.sig)) ? Number(properties.sig) : null,
        alert: bounded(properties.alert, '', 24),
        tsunami: properties.tsunami === 1,
        status: bounded(properties.status, '', 40),
        updatedAt: properties.updated ? timestampFromEpoch(properties.updated, `USGS feature ${index}.properties.updated`) : null
      }
    }, EARTHQUAKE_LAYER);
  });
}

export function normalizeNoaaPlanetaryKp(rows, receivedAt) {
  if (!Array.isArray(rows)) throw new TypeError('NOAA Kp product must be an array');
  if (rows.length > 2_000) throw new TypeError('NOAA Kp product exceeds the 2,000 row safety bound');

  const received = new Date(receivedAt);
  if (!Number.isFinite(received.getTime())) throw new TypeError('receivedAt is invalid');
  const receivedIso = received.toISOString();

  return rows.map((row, index) => {
    object(row, `NOAA Kp row ${index}`);
    const observedAt = utcTimeTag(row.time_tag, `NOAA Kp row ${index}.time_tag`);
    const kp = finite(row.Kp, `NOAA Kp row ${index}.Kp`, 0, 9);
    const stationCount = finite(row.station_count, `NOAA Kp row ${index}.station_count`, 0, 100);
    const runningA = finite(row.a_running, `NOAA Kp row ${index}.a_running`, 0, 500);
    const compactTime = observedAt.replace(/[-:.TZ]/g, '').slice(0, 14);

    return normalizeSignal({
      id: `kp-${compactTime}`,
      layerId: PLANETARY_KP_LAYER.id,
      title: `Planetary Kp ${kp.toFixed(2)}`,
      summary: kp >= 5
        ? 'Planetary geomagnetic storm-level Kp observation.'
        : 'Planetary geomagnetic Kp observation.',
      observedAt,
      receivedAt: receivedIso,
      sourceRef: PLANETARY_KP_LAYER.provider.sourceRef,
      properties: {
        kp,
        runningA,
        stationCount,
        stormThresholdReached: kp >= 5
      }
    }, PLANETARY_KP_LAYER);
  });
}

export function latestSignal(signals) {
  if (!Array.isArray(signals) || !signals.length) return null;
  return signals.reduce((latest, signal) => {
    if (!latest) return signal;
    return Date.parse(signal.observedAt) > Date.parse(latest.observedAt) ? signal : latest;
  }, null);
}
