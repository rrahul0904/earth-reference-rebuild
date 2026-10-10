const DIMENSION_TYPES = new Set([
  'body_length',
  'shoulder_height',
  'standing_height',
  'wingspan',
  'mass',
]);

const TREND_VALUES = new Set(['increasing', 'decreasing', 'stable', 'unknown']);
const RELEASE_LICENSES = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'PUBLIC-DOMAIN',
  'OWNED',
]);

export class WildlifeContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WildlifeContractError';
    this.code = code;
  }
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new WildlifeContractError('INVALID_TEXT', `${field} must be a non-empty string`);
  }
  return value.trim();
}

function requireFinitePositive(value, field) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new WildlifeContractError('INVALID_NUMBER', `${field} must be a finite positive number`);
  }
  return value;
}

export function validateSourceReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    throw new WildlifeContractError('MISSING_PROVENANCE', 'A source receipt is required');
  }

  const normalized = {
    id: requireText(receipt.id, 'sourceReceipt.id'),
    provider: requireText(receipt.provider, 'sourceReceipt.provider'),
    sourceUrlOrId: requireText(receipt.sourceUrlOrId, 'sourceReceipt.sourceUrlOrId'),
    fetchedAt: requireText(receipt.fetchedAt, 'sourceReceipt.fetchedAt'),
    freshnessClass: requireText(receipt.freshnessClass, 'sourceReceipt.freshnessClass'),
  };

  if (receipt.license != null) normalized.license = requireText(receipt.license, 'sourceReceipt.license');
  if (receipt.attribution != null) normalized.attribution = requireText(receipt.attribution, 'sourceReceipt.attribution');
  if (receipt.evidenceHash != null) normalized.evidenceHash = requireText(receipt.evidenceHash, 'sourceReceipt.evidenceHash');

  const parsedDate = Date.parse(normalized.fetchedAt);
  if (!Number.isFinite(parsedDate)) {
    throw new WildlifeContractError('INVALID_TIMESTAMP', 'sourceReceipt.fetchedAt must be an ISO-compatible timestamp');
  }

  return Object.freeze(normalized);
}

export function validateSpeciesMeasurement(measurement, sourceReceiptsById = new Map()) {
  if (!measurement || typeof measurement !== 'object') {
    throw new WildlifeContractError('INVALID_MEASUREMENT', 'Measurement must be an object');
  }

  const dimensionType = requireText(measurement.dimensionType, 'measurement.dimensionType');
  if (!DIMENSION_TYPES.has(dimensionType)) {
    throw new WildlifeContractError('AMBIGUOUS_MEASUREMENT', `Unsupported measurement dimension: ${dimensionType}`);
  }

  const sourceReceiptId = requireText(measurement.sourceReceiptId, 'measurement.sourceReceiptId');
  if (!sourceReceiptsById.has(sourceReceiptId)) {
    throw new WildlifeContractError('MISSING_PROVENANCE', `No source receipt exists for measurement ${sourceReceiptId}`);
  }

  const unit = requireText(measurement.unit, 'measurement.unit');
  const qualifier = requireText(measurement.qualifier, 'measurement.qualifier');

  const hasValue = Number.isFinite(measurement.value);
  const hasRange = Number.isFinite(measurement.min) && Number.isFinite(measurement.max);
  if (!hasValue && !hasRange) {
    throw new WildlifeContractError('MISSING_MEASUREMENT_VALUE', 'Measurement needs value or min/max range');
  }

  if (hasValue) requireFinitePositive(measurement.value, 'measurement.value');
  if (hasRange) {
    requireFinitePositive(measurement.min, 'measurement.min');
    requireFinitePositive(measurement.max, 'measurement.max');
    if (measurement.min > measurement.max) {
      throw new WildlifeContractError('INVALID_RANGE', 'measurement.min cannot exceed measurement.max');
    }
  }

  return Object.freeze({
    ...measurement,
    dimensionType,
    unit,
    qualifier,
    sourceReceiptId,
  });
}

export function validateConservationAssessment(assessment, sourceReceiptsById = new Map()) {
  if (!assessment || typeof assessment !== 'object') {
    throw new WildlifeContractError('INVALID_ASSESSMENT', 'Conservation assessment must be an object');
  }

  const populationTrend = requireText(assessment.populationTrend, 'assessment.populationTrend').toLowerCase();
  if (!TREND_VALUES.has(populationTrend)) {
    throw new WildlifeContractError(
      'INVALID_POPULATION_TREND',
      'Population trend must be increasing, decreasing, stable, or unknown',
    );
  }

  const sourceReceiptId = requireText(assessment.sourceReceiptId, 'assessment.sourceReceiptId');
  if (!sourceReceiptsById.has(sourceReceiptId)) {
    throw new WildlifeContractError('MISSING_PROVENANCE', `No source receipt exists for assessment ${sourceReceiptId}`);
  }

  return Object.freeze({
    ...assessment,
    status: requireText(assessment.status, 'assessment.status'),
    populationTrend,
    sourceReceiptId,
  });
}

export function measurementMeters(measurement) {
  if (measurement.dimensionType === 'mass') {
    throw new WildlifeContractError('INCOMPARABLE_DIMENSION', 'Mass cannot be compared to a human height reference');
  }

  const representative = Number.isFinite(measurement.value)
    ? measurement.value
    : (measurement.min + measurement.max) / 2;

  switch (measurement.unit) {
    case 'm': return representative;
    case 'cm': return representative / 100;
    case 'mm': return representative / 1000;
    case 'ft': return representative * 0.3048;
    case 'in': return representative * 0.0254;
    default:
      throw new WildlifeContractError('UNSUPPORTED_UNIT', `Cannot convert ${measurement.unit} to meters`);
  }
}

export function compareToHuman(measurement, humanHeightMeters) {
  requireFinitePositive(humanHeightMeters, 'humanHeightMeters');
  const animalMeters = measurementMeters(measurement);
  return Object.freeze({
    dimensionType: measurement.dimensionType,
    animalMeters,
    humanHeightMeters,
    ratioToHumanHeight: animalMeters / humanHeightMeters,
    semantics: `${measurement.dimensionType} compared with human standing height`,
  });
}

export function sanitizeOccurrenceForEvidence(observation) {
  if (!observation || typeof observation !== 'object') {
    throw new WildlifeContractError('INVALID_OCCURRENCE', 'Occurrence must be an object');
  }

  const sourceReceiptId = requireText(observation.sourceReceiptId, 'occurrence.sourceReceiptId');
  const coarseArea = requireText(observation.coarseArea, 'occurrence.coarseArea');

  // Deliberately omit latitude/longitude, even when callers accidentally pass them.
  return Object.freeze({
    provider: requireText(observation.provider, 'occurrence.provider'),
    providerObservationId: requireText(observation.providerObservationId, 'occurrence.providerObservationId'),
    scientificName: requireText(observation.scientificName, 'occurrence.scientificName'),
    observedAt: observation.observedAt ?? null,
    coarseArea,
    positionalUncertaintyM: Number.isFinite(observation.positionalUncertaintyM)
      ? Math.max(0, observation.positionalUncertaintyM)
      : null,
    obscured: Boolean(observation.obscured),
    sourceReceiptId,
  });
}

export function preserveProviderObscuration(observation, proposedLocation) {
  if (observation?.obscured) {
    if (proposedLocation?.latitude != null || proposedLocation?.longitude != null) {
      throw new WildlifeContractError(
        'OBSCURED_LOCATION_PROTECTED',
        'An obscured provider location cannot be sharpened or replaced with precise coordinates',
      );
    }
  }
  return true;
}

export function validateVisualAssetForRelease(asset, sourceReceiptsById = new Map()) {
  if (!asset || typeof asset !== 'object') {
    throw new WildlifeContractError('INVALID_ASSET', 'Visual asset must be an object');
  }

  const sourceReceiptId = requireText(asset.sourceReceiptId, 'asset.sourceReceiptId');
  if (!sourceReceiptsById.has(sourceReceiptId)) {
    throw new WildlifeContractError('MISSING_PROVENANCE', `No source receipt exists for asset ${sourceReceiptId}`);
  }

  const license = requireText(asset.license, 'asset.license').toUpperCase();
  if (!RELEASE_LICENSES.has(license)) {
    throw new WildlifeContractError('UNKNOWN_ASSET_RIGHTS', `Asset license ${license} is not on the release allowlist`);
  }

  if (license !== 'CC0-1.0' && license !== 'PUBLIC-DOMAIN' && license !== 'OWNED') {
    requireText(asset.attribution, 'asset.attribution');
  }

  return Object.freeze({ ...asset, license, sourceReceiptId });
}

export function buildReceiptIndex(receipts) {
  const map = new Map();
  for (const receipt of receipts) {
    const normalized = validateSourceReceipt(receipt);
    if (map.has(normalized.id)) {
      throw new WildlifeContractError('DUPLICATE_RECEIPT', `Duplicate source receipt: ${normalized.id}`);
    }
    map.set(normalized.id, normalized);
  }
  return map;
}

export function fixtureNearbyProvider({ observations = [] } = {}) {
  const safeObservations = observations.map(sanitizeOccurrenceForEvidence);
  return Object.freeze({
    async search({ coarseArea, scientificName } = {}) {
      const requestedArea = requireText(coarseArea, 'nearbyQuery.coarseArea');
      return safeObservations.filter((observation) => {
        if (observation.coarseArea !== requestedArea) return false;
        if (scientificName && observation.scientificName !== scientificName) return false;
        return true;
      });
    },
  });
}

export const wildlifeContractValues = Object.freeze({
  dimensionTypes: Object.freeze([...DIMENSION_TYPES]),
  populationTrends: Object.freeze([...TREND_VALUES]),
  releaseLicenses: Object.freeze([...RELEASE_LICENSES]),
});
