import { createLayerState, createProviderState } from '../../earth-signal-core.js';
import { EARTHQUAKE_LAYER, normalizeUsgsGeoJson } from '../../earth-now-adapters.js';
import { createProviderHandler } from '../../server/earth-now/runtime.js';
import { createEvidenceReceipt } from '../../server/earth-now/receipt.js';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

const handler = createProviderHandler({
  id: EARTHQUAKE_LAYER.provider.id,
  url: USGS_URL,
  ttlMs: 5 * 60 * 1000,
  maxBytes: 1_500_000,
  sourceUrl: USGS_URL,
  createReceipt: (layerState, receivedAt) => createEvidenceReceipt({
    providerId: EARTHQUAKE_LAYER.provider.id,
    sourceUrl: USGS_URL,
    layerState,
    receivedAt
  }),
  normalize: (feed, receivedAt) => {
    const cutoff = Date.parse(receivedAt) - 24 * 60 * 60 * 1000;
    return normalizeUsgsGeoJson(feed, receivedAt).filter((signal) => Date.parse(signal.observedAt) >= cutoff);
  },
  createState: (signals, now, status = 'healthy', lastSuccessAt = now) => createLayerState(
    EARTHQUAKE_LAYER,
    signals,
    createProviderState({
      providerId: EARTHQUAKE_LAYER.provider.id,
      status,
      checkedAt: now,
      lastSuccessAt,
      detail: status === 'down' ? 'Provider is unavailable; validated cached data may be stale.' : 'USGS feed retrieved and validated.'
    }),
    now
  )
});

export default handler;
