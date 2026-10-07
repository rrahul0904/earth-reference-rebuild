const SCHEMA_VERSION = 'earth-signal/v1';
const CONDITION_SCHEMA_VERSION = 'condition-recipe/v1';

const EVIDENCE_CLASSES = new Set(['observation', 'forecast', 'model', 'historical', 'derived']);
const PROVIDER_STATES = new Set(['unknown', 'healthy', 'degraded', 'down']);
const NETWORK_MODES = new Set(['none', 'public-read', 'credentialed-proxy']);

function fail(message) {
  throw new TypeError(message);
}

function plainObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  return value;
}

function cleanId(value, name = 'id') {
  const text = String(value ?? '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]{0,95}$/i.test(text)) fail(`${name} is invalid`);
  return text;
}

function cleanText(value, name, max = 240, required = false) {
  const text = String(value ?? '').trim();
  if (required && !text) fail(`${name} is required`);
  if (text.length > max) fail(`${name} exceeds ${max} characters`);
  return text;
}

function finiteNumber(value, name, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${name} must be finite`);
  if (number < min || number > max) fail(`${name} must be between ${min} and ${max}`);
  return number;
}

function positiveInteger(value, name, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > max) fail(`${name} must be a positive integer`);
  return number;
}

function isoTime(value, name, required = true) {
  if ((value === undefined || value === null || value === '') && !required) return null;
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) fail(`${name} must be a valid ISO timestamp`);
  return new Date(time).toISOString();
}

function normalizeEvidenceClass(value, name = 'evidenceClass') {
  const evidenceClass = String(value ?? '').trim().toLowerCase();
  if (!EVIDENCE_CLASSES.has(evidenceClass)) fail(`${name} must be one of ${Array.from(EVIDENCE_CLASSES).join(', ')}`);
  return evidenceClass;
}

function normalizePosition(position) {
  if (position === undefined || position === null) return null;
  plainObject(position, 'position');
  const normalized = {
    lat: finiteNumber(position.lat, 'position.lat', -90, 90),
    lon: finiteNumber(position.lon, 'position.lon', -180, 180)
  };
  if (position.precisionKm !== undefined) {
    normalized.precisionKm = finiteNumber(position.precisionKm, 'position.precisionKm', 0, 20050);
  }
  if (position.altitudeKm !== undefined) {
    normalized.altitudeKm = finiteNumber(position.altitudeKm, 'position.altitudeKm', -12, 1_000_000);
  }
  return normalized;
}

function safeMetadata(value, depth = 0) {
  if (depth > 4) fail('properties nesting exceeds four levels');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('properties contain a non-finite number');
    return value;
  }
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) {
    if (value.length > 32) fail('properties arrays are limited to 32 items');
    return value.map((item) => safeMetadata(item, depth + 1));
  }
  if (typeof value === 'object' && value) {
    const keys = Object.keys(value).sort();
    if (keys.length > 48) fail('properties objects are limited to 48 keys');
    const output = {};
    for (const key of keys) {
      const cleanKey = cleanText(key, 'property key', 80, true);
      output[cleanKey] = safeMetadata(value[key], depth + 1);
    }
    return output;
  }
  fail('properties contain an unsupported value');
}

function normalizeNetworkPolicy(policy = { mode: 'none', hosts: [] }) {
  plainObject(policy, 'networkPolicy');
  const mode = String(policy.mode ?? 'none').trim();
  if (!NETWORK_MODES.has(mode)) fail(`networkPolicy.mode must be one of ${Array.from(NETWORK_MODES).join(', ')}`);
  const hosts = Array.isArray(policy.hosts) ? policy.hosts : [];
  if (hosts.length > 16) fail('networkPolicy.hosts is limited to 16 hosts');
  const normalizedHosts = [...new Set(hosts.map((host) => cleanText(host, 'network host', 160, true).toLowerCase()))].sort();
  if (mode === 'none' && normalizedHosts.length) fail('networkPolicy.hosts must be empty when mode is none');
  return { mode, hosts: normalizedHosts };
}

export function createLayerSpec(input) {
  plainObject(input, 'layer');
  const provider = plainObject(input.provider, 'provider');
  const evidenceClass = normalizeEvidenceClass(input.evidenceClass);
  const maxAgeMs = positiveInteger(input.maxAgeMs, 'maxAgeMs', 31_536_000_000);
  const expireAfterMs = positiveInteger(input.expireAfterMs, 'expireAfterMs', 31_536_000_000);
  if (expireAfterMs < maxAgeMs) fail('expireAfterMs must be greater than or equal to maxAgeMs');

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    id: cleanId(input.id, 'layer.id'),
    label: cleanText(input.label, 'layer.label', 120, true),
    description: cleanText(input.description, 'layer.description', 500, false),
    evidenceClass,
    maxAgeMs,
    expireAfterMs,
    futureToleranceMs: input.futureToleranceMs === undefined
      ? 300_000
      : positiveInteger(input.futureToleranceMs, 'futureToleranceMs', 86_400_000),
    provider: Object.freeze({
      id: cleanId(provider.id, 'provider.id'),
      name: cleanText(provider.name, 'provider.name', 120, true),
      sourceRef: cleanText(provider.sourceRef, 'provider.sourceRef', 500, true)
    }),
    coverage: cleanText(input.coverage, 'coverage', 240, false),
    networkPolicy: Object.freeze(normalizeNetworkPolicy(input.networkPolicy))
  });
}

export function normalizeSignal(input, layerSpec) {
  plainObject(input, 'signal');
  const layer = createLayerSpec(layerSpec);
  if (input.layerId !== undefined && cleanId(input.layerId, 'signal.layerId') !== layer.id) {
    fail('signal.layerId does not match layer.id');
  }

  const observedAt = isoTime(input.observedAt, 'signal.observedAt');
  const receivedAt = isoTime(input.receivedAt ?? observedAt, 'signal.receivedAt');
  const validFrom = isoTime(input.validFrom, 'signal.validFrom', false);
  const validTo = isoTime(input.validTo, 'signal.validTo', false);
  if (validFrom && validTo && Date.parse(validTo) < Date.parse(validFrom)) fail('signal.validTo precedes validFrom');

  const evidenceClass = input.evidenceClass === undefined
    ? layer.evidenceClass
    : normalizeEvidenceClass(input.evidenceClass, 'signal.evidenceClass');

  if (evidenceClass === 'derived' && layer.evidenceClass !== 'derived') {
    fail('derived signals must belong to a derived layer');
  }

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    id: cleanId(input.id, 'signal.id'),
    layerId: layer.id,
    evidenceClass,
    observedAt,
    receivedAt,
    validFrom,
    validTo,
    position: normalizePosition(input.position),
    title: cleanText(input.title, 'signal.title', 160, true),
    summary: cleanText(input.summary, 'signal.summary', 600, false),
    sourceRef: cleanText(input.sourceRef ?? layer.provider.sourceRef, 'signal.sourceRef', 500, true),
    properties: Object.freeze(safeMetadata(input.properties ?? {}))
  });
}

export function classifyFreshness(signal, layerSpec, now = new Date().toISOString()) {
  let normalized;
  let layer;
  try {
    layer = createLayerSpec(layerSpec);
    normalized = normalizeSignal(signal, layer);
  } catch {
    return 'invalid';
  }

  const nowMs = Date.parse(String(now));
  if (!Number.isFinite(nowMs)) return 'invalid';
  const observedMs = Date.parse(normalized.observedAt);
  const ageMs = nowMs - observedMs;
  if (ageMs < -layer.futureToleranceMs) return 'future';
  if (ageMs <= layer.maxAgeMs / 2) return 'fresh';
  if (ageMs <= layer.maxAgeMs) return 'aging';
  if (ageMs <= layer.expireAfterMs) return 'stale';
  return 'expired';
}

export function createProviderState(input) {
  plainObject(input, 'providerState');
  const status = String(input.status ?? 'unknown').trim().toLowerCase();
  if (!PROVIDER_STATES.has(status)) fail(`providerState.status must be one of ${Array.from(PROVIDER_STATES).join(', ')}`);
  return Object.freeze({
    providerId: cleanId(input.providerId, 'providerState.providerId'),
    status,
    checkedAt: isoTime(input.checkedAt, 'providerState.checkedAt'),
    detail: cleanText(input.detail, 'providerState.detail', 300, false),
    lastSuccessAt: isoTime(input.lastSuccessAt, 'providerState.lastSuccessAt', false)
  });
}

export function createLayerState(layerSpec, signals, providerState, now = new Date().toISOString()) {
  const layer = createLayerSpec(layerSpec);
  const provider = createProviderState(providerState);
  if (provider.providerId !== layer.provider.id) fail('providerState.providerId does not match layer.provider.id');
  if (!Array.isArray(signals)) fail('signals must be an array');
  if (signals.length > 10_000) fail('signals are limited to 10,000 items per layer state');

  const normalizedSignals = signals
    .map((signal) => {
      const normalized = normalizeSignal(signal, layer);
      return Object.freeze({ ...normalized, freshness: classifyFreshness(normalized, layer, now) });
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const hasCurrentSignal = normalizedSignals.some((signal) => signal.freshness === 'fresh' || signal.freshness === 'aging');
  const providerAvailable = provider.status === 'healthy' || provider.status === 'degraded';

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    layer,
    provider,
    asOf: isoTime(now, 'asOf'),
    displayState: !providerAvailable
      ? (normalizedSignals.length ? 'cached-provider-down' : 'unavailable')
      : (hasCurrentSignal ? 'current' : (normalizedSignals.length ? 'stale' : 'empty')),
    signals: Object.freeze(normalizedSignals)
  });
}

export function createConditionScore(input) {
  plainObject(input, 'conditionScore');
  const inputRefs = Array.isArray(input.inputRefs) ? input.inputRefs : [];
  if (!inputRefs.length) fail('conditionScore.inputRefs requires at least one source input');
  if (inputRefs.length > 64) fail('conditionScore.inputRefs is limited to 64 source inputs');
  const normalizedRefs = [...new Set(inputRefs.map((ref) => cleanText(ref, 'conditionScore input ref', 200, true)))].sort();

  return Object.freeze({
    schemaVersion: CONDITION_SCHEMA_VERSION,
    id: cleanId(input.id, 'conditionScore.id'),
    recipeId: cleanId(input.recipeId, 'conditionScore.recipeId'),
    recipeVersion: cleanText(input.recipeVersion, 'conditionScore.recipeVersion', 80, true),
    label: cleanText(input.label, 'conditionScore.label', 120, true),
    value: finiteNumber(input.value, 'conditionScore.value', 0, 100),
    confidence: finiteNumber(input.confidence, 'conditionScore.confidence', 0, 1),
    explanation: cleanText(input.explanation, 'conditionScore.explanation', 600, true),
    computedAt: isoTime(input.computedAt, 'conditionScore.computedAt'),
    evidenceClass: 'derived',
    inputRefs: Object.freeze(normalizedRefs),
    region: input.region === undefined ? null : Object.freeze(normalizePosition(input.region)),
    properties: Object.freeze(safeMetadata(input.properties ?? {}))
  });
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalValue(value[key]);
    return output;
  }
  return value;
}

export function createSnapshot(layerStates, asOf = new Date().toISOString()) {
  if (!Array.isArray(layerStates)) fail('layerStates must be an array');
  const states = layerStates
    .map((state) => plainObject(state, 'layerState'))
    .map((state) => canonicalValue(state))
    .sort((a, b) => String(a.layer?.id ?? '').localeCompare(String(b.layer?.id ?? '')));

  return Object.freeze({
    schemaVersion: 'earth-now-snapshot/v1',
    asOf: isoTime(asOf, 'snapshot.asOf'),
    layers: Object.freeze(states)
  });
}

export function canonicalSnapshotJson(snapshot) {
  plainObject(snapshot, 'snapshot');
  return JSON.stringify(canonicalValue(snapshot));
}

export async function digestSnapshot(snapshot, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle?.digest) fail('Web Crypto digest support is required');
  const bytes = new TextEncoder().encode(canonicalSnapshotJson(snapshot));
  const hash = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const EarthSignalContract = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  conditionSchemaVersion: CONDITION_SCHEMA_VERSION,
  evidenceClasses: Object.freeze(Array.from(EVIDENCE_CLASSES)),
  providerStates: Object.freeze(Array.from(PROVIDER_STATES)),
  networkModes: Object.freeze(Array.from(NETWORK_MODES))
});
