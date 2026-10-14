import { createLayerState, createProviderState } from '../../earth-signal-core.js';
import { normalizeNoaaPlanetaryKp, PLANETARY_KP_LAYER } from '../../earth-now-adapters.js';
import { createProviderHandler } from '../../server/earth-now/runtime.js';
import { createEvidenceReceipt } from '../../server/earth-now/receipt.js';

const NOAA_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

const handler = createProviderHandler({
  id: PLANETARY_KP_LAYER.provider.id,
  url: NOAA_URL,
  ttlMs: 15 * 60 * 1000,
  maxBytes: 128_000,
  sourceUrl: PLANETARY_KP_LAYER.provider.sourceRef,
  createReceipt: (layerState, receivedAt) => createEvidenceReceipt({
    providerId: PLANETARY_KP_LAYER.provider.id,
    sourceUrl: PLANETARY_KP_LAYER.provider.sourceRef,
    layerState,
    receivedAt
  }),
  normalize: (rows, receivedAt) => {
    const cutoff = Date.parse(receivedAt) - 24 * 60 * 60 * 1000;
    return normalizeNoaaPlanetaryKp(rows, receivedAt).filter((signal) => Date.parse(signal.observedAt) >= cutoff);
  },
  createState: (signals, now, status = 'healthy', lastSuccessAt = now) => createLayerState(
    PLANETARY_KP_LAYER,
    signals,
    createProviderState({
      providerId: PLANETARY_KP_LAYER.provider.id,
      status,
      checkedAt: now,
      lastSuccessAt,
      detail: status === 'down' ? 'Provider is unavailable; validated cached data may be stale.' : 'NOAA planetary Kp feed retrieved and validated.'
    }),
    now
  )
});

export default handler;
