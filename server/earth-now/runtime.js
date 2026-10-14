const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 180;
const TIMEOUT_MS = 2_500;
const DEFAULT_COOLDOWN_MS = 15_000;

const caches = new Map();

function send(response, status, body, cacheControl = 'public, max-age=30, stale-while-revalidate=120') {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cacheControl);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.status(status).json(body);
}

function retryAfterMs(value, now) {
  if (!value) return DEFAULT_COOLDOWN_MS;
  const seconds = Number(value);
  const parsed = Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) return DEFAULT_COOLDOWN_MS;
  return Math.max(1_000, Math.min(300_000, parsed - now));
}

async function readLimitedJson(response, maxBytes) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (!/^application\/(?:[a-z0-9.+-]*\+)?json\b/i.test(contentType)) throw new Error('invalid_content_type');
  const declaredSize = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new Error('payload_too_large');

  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('payload_too_large');
    return JSON.parse(text);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('payload_too_large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function fetchProvider(config, fetchImpl, nowFn) {
  let lastError = 'provider_unavailable';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(1_000, RETRY_DELAY_MS * (2 ** (attempt - 1)))));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(config.url, {
        method: 'GET',
        redirect: 'error',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (response.status === 429) {
        const delay = retryAfterMs(response.headers?.get?.('retry-after'), nowFn());
        lastError = 'provider_rate_limited';
        return { error: lastError, retryAfterMs: delay };
      }
      if (!response.ok) {
        lastError = 'provider_unavailable';
        continue;
      }
      const parsed = await readLimitedJson(response, config.maxBytes);
      const receivedAt = new Date(nowFn()).toISOString();
      const signals = config.normalize(parsed, receivedAt);
      const layerState = config.createState(signals, receivedAt);
      return { layerState, receivedAt };
    } catch (error) {
      lastError = error?.name === 'AbortError' ? 'provider_timeout'
        : error?.message === 'payload_too_large' ? 'provider_payload_too_large'
          : error?.message === 'invalid_content_type' ? 'provider_invalid_response'
            : error instanceof SyntaxError || error instanceof TypeError ? 'provider_invalid_response'
              : 'provider_unavailable';
    } finally {
      clearTimeout(timeout);
    }
  }
  return { error: lastError, retryAfterMs: DEFAULT_COOLDOWN_MS };
}

export function createProviderHandler(config, { fetchImpl = fetch, now = Date.now } = {}) {
  if (!config || !/^[a-z0-9-]+$/.test(config.id) || !Number.isSafeInteger(config.ttlMs) || config.ttlMs < 1_000) {
    throw new TypeError('invalid provider configuration');
  }
  return async function providerHandler(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      return response.status(405).end();
    }
    if (request.method === 'HEAD') {
      response.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      return response.status(200).end();
    }
    if (request.url && new URL(request.url, 'https://earth.invalid').search) {
      return send(response, 400, { error: 'query_not_supported' });
    }

    const nowMs = now();
    let entry = caches.get(config.id);
    if (entry?.lastGood && nowMs - entry.lastGood.fetchedAtMs < config.ttlMs) {
      const receipt = await config.createReceipt(entry.lastGood.layerState, entry.lastGood.fetchedAt);
      return send(response, 200, {
        schemaVersion: 'earth-now-provider/v1',
        providerId: config.id,
        sourceStatus: 'healthy',
        servedFromCache: true,
        fetchedAt: new Date(entry.lastGood.fetchedAtMs).toISOString(),
        layerState: entry.lastGood.layerState,
        receipt
      });
    }

    if (entry?.retryAtMs > nowMs) {
      const staleLayerState = entry.lastGood
        ? config.createState(entry.lastGood.layerState.signals, new Date(nowMs).toISOString(), 'down', entry.lastGood.fetchedAt)
        : config.createState([], new Date(nowMs).toISOString(), 'down', null);
      const receipt = await config.createReceipt(staleLayerState, entry.lastGood?.fetchedAt ?? null);
      return send(response, 200, {
        schemaVersion: 'earth-now-provider/v1', providerId: config.id, sourceStatus: 'down',
        servedFromCache: Boolean(entry.lastGood), fetchedAt: entry.lastGood?.fetchedAt ?? null,
        detail: entry.lastGood
          ? 'Provider temporarily unavailable; showing the last validated source data.'
          : 'Provider cooldown is active; no validated data is available.',
        layerState: staleLayerState, receipt
      }, 'private, no-store, max-age=0');
    }

    const result = await fetchProvider(config, fetchImpl, now);
    if (result.layerState) {
      entry = { lastGood: { layerState: result.layerState, fetchedAt: result.receivedAt, fetchedAtMs: Date.parse(result.receivedAt) }, retryAtMs: 0 };
      caches.set(config.id, entry);
      const receipt = await config.createReceipt(result.layerState, result.receivedAt);
      return send(response, 200, {
        schemaVersion: 'earth-now-provider/v1', providerId: config.id, sourceStatus: 'healthy',
        servedFromCache: false, fetchedAt: result.receivedAt, layerState: result.layerState, receipt
      });
    }

    const cooldown = result.retryAfterMs ?? DEFAULT_COOLDOWN_MS;
    entry = { ...(entry || {}), retryAtMs: nowMs + cooldown };
    caches.set(config.id, entry);
    if (entry.lastGood) {
      const staleLayerState = config.createState(entry.lastGood.layerState.signals, new Date(nowMs).toISOString(), 'down', entry.lastGood.fetchedAt);
      const receipt = await config.createReceipt(staleLayerState, entry.lastGood.fetchedAt);
      return send(response, 200, {
        schemaVersion: 'earth-now-provider/v1', providerId: config.id, sourceStatus: 'down',
        servedFromCache: true, fetchedAt: entry.lastGood.fetchedAt,
        detail: 'Provider temporarily unavailable; showing the last validated source data.',
        layerState: staleLayerState, receipt
      }, 'private, no-store, max-age=0');
    }
    const emptyState = config.createState([], new Date(nowMs).toISOString(), 'down', null);
    const receipt = await config.createReceipt(emptyState, null);
    return send(response, 200, {
      schemaVersion: 'earth-now-provider/v1', providerId: config.id, sourceStatus: 'down',
      servedFromCache: false, fetchedAt: null,
      detail: result.error === 'provider_rate_limited'
        ? 'Provider rate limit reached; try again after the source cooldown.'
        : 'Provider data is temporarily unavailable.',
      layerState: emptyState, receipt
    }, 'private, no-store, max-age=0');
  };
}

export function resetProviderRuntimeForTests() { caches.clear(); }
