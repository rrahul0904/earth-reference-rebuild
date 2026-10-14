import { createSnapshot, digestSnapshot } from '../../earth-signal-core.js';

const FRESHNESS_ORDER = ['fresh', 'aging', 'stale', 'expired', 'future', 'invalid'];

export async function createEvidenceReceipt({ providerId, sourceUrl, layerState, receivedAt }) {
  const hash = await digestSnapshot(createSnapshot([layerState], layerState.asOf));
  const signals = layerState.signals;
  const freshness = signals.length
    ? [...signals].sort((a, b) => FRESHNESS_ORDER.indexOf(b.freshness) - FRESHNESS_ORDER.indexOf(a.freshness))[0].freshness
    : null;
  const observedAt = signals.reduce((latest, signal) => !latest || Date.parse(signal.observedAt) > Date.parse(latest)
    ? signal.observedAt
    : latest, null);

  return {
    schemaVersion: 'evidence-receipt/v1',
    receiptId: `receipt-${providerId}-${hash.slice(0, 16)}`,
    provider: providerId,
    sourceId: providerId,
    sourceUrl,
    evidenceClass: layerState.layer.evidenceClass,
    observedAt,
    receivedAt,
    freshness,
    coverage: layerState.layer.coverage,
    hash
  };
}
