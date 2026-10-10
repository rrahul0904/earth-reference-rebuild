import assert from 'node:assert/strict';
import {
  WildlifeContractError,
  buildReceiptIndex,
  compareToHuman,
  fixtureNearbyProvider,
  preserveProviderObscuration,
  sanitizeOccurrenceForEvidence,
  validateConservationAssessment,
  validateSpeciesMeasurement,
  validateVisualAssetForRelease,
} from '../wildlife-core.js';

const receipts = buildReceiptIndex([
  {
    id: 'src-measurement',
    provider: 'fixture-reference',
    sourceUrlOrId: 'fixture://measurement',
    fetchedAt: '2026-10-10T17:00:00Z',
    freshnessClass: 'fixture',
  },
  {
    id: 'src-conservation',
    provider: 'fixture-reference',
    sourceUrlOrId: 'fixture://conservation',
    fetchedAt: '2026-10-10T17:00:00Z',
    freshnessClass: 'fixture',
  },
  {
    id: 'src-asset',
    provider: 'owned-fixture',
    sourceUrlOrId: 'fixture://asset',
    fetchedAt: '2026-10-10T17:00:00Z',
    freshnessClass: 'fixture',
    license: 'OWNED',
  },
]);

const shoulderHeight = validateSpeciesMeasurement({
  id: 'measure-1',
  speciesId: 'species-demo',
  dimensionType: 'shoulder_height',
  min: 110,
  max: 130,
  unit: 'cm',
  qualifier: 'range',
  sourceReceiptId: 'src-measurement',
}, receipts);

const comparison = compareToHuman(shoulderHeight, 1.8);
assert.equal(comparison.dimensionType, 'shoulder_height');
assert.ok(Math.abs(comparison.animalMeters - 1.2) < 1e-9);
assert.ok(Math.abs(comparison.ratioToHumanHeight - (1.2 / 1.8)) < 1e-9);
assert.match(comparison.semantics, /shoulder_height/);

assert.throws(
  () => validateSpeciesMeasurement({
    speciesId: 'species-demo',
    dimensionType: 'size',
    value: 120,
    unit: 'cm',
    qualifier: 'typical',
    sourceReceiptId: 'src-measurement',
  }, receipts),
  (error) => error instanceof WildlifeContractError && error.code === 'AMBIGUOUS_MEASUREMENT',
);

assert.throws(
  () => validateSpeciesMeasurement({
    speciesId: 'species-demo',
    dimensionType: 'body_length',
    value: 120,
    unit: 'cm',
    qualifier: 'typical',
    sourceReceiptId: 'missing-source',
  }, receipts),
  (error) => error instanceof WildlifeContractError && error.code === 'MISSING_PROVENANCE',
);

const assessment = validateConservationAssessment({
  id: 'assessment-1',
  speciesId: 'species-demo',
  status: 'fixture-status',
  populationTrend: 'decreasing',
  sourceReceiptId: 'src-conservation',
}, receipts);
assert.equal(assessment.populationTrend, 'decreasing');

assert.throws(
  () => validateConservationAssessment({
    speciesId: 'species-demo',
    status: 'fixture-status',
    populationTrend: 'plummeting',
    sourceReceiptId: 'src-conservation',
  }, receipts),
  (error) => error instanceof WildlifeContractError && error.code === 'INVALID_POPULATION_TREND',
);

const sanitized = sanitizeOccurrenceForEvidence({
  provider: 'fixture-provider',
  providerObservationId: 'obs-1',
  scientificName: 'Species exemplaris',
  observedAt: '2026-10-09',
  coarseArea: 'fixture-grid-001',
  latitude: 42.123456,
  longitude: -71.123456,
  positionalUncertaintyM: 2500,
  obscured: true,
  sourceReceiptId: 'src-conservation',
});
assert.equal('latitude' in sanitized, false);
assert.equal('longitude' in sanitized, false);
assert.equal(sanitized.coarseArea, 'fixture-grid-001');
assert.equal(sanitized.obscured, true);

assert.throws(
  () => preserveProviderObscuration(sanitized, { latitude: 42.1, longitude: -71.1 }),
  (error) => error instanceof WildlifeContractError && error.code === 'OBSCURED_LOCATION_PROTECTED',
);
assert.equal(preserveProviderObscuration(sanitized, { coarseArea: 'fixture-grid-001' }), true);

const provider = fixtureNearbyProvider({ observations: [
  {
    provider: 'fixture-provider',
    providerObservationId: 'obs-1',
    scientificName: 'Species exemplaris',
    observedAt: '2026-10-09',
    coarseArea: 'fixture-grid-001',
    latitude: 42.123456,
    longitude: -71.123456,
    positionalUncertaintyM: 2500,
    obscured: true,
    sourceReceiptId: 'src-conservation',
  },
  {
    provider: 'fixture-provider',
    providerObservationId: 'obs-2',
    scientificName: 'Another species',
    coarseArea: 'fixture-grid-002',
    obscured: false,
    sourceReceiptId: 'src-conservation',
  },
] });

const nearby = await provider.search({ coarseArea: 'fixture-grid-001' });
assert.equal(nearby.length, 1);
assert.equal(nearby[0].providerObservationId, 'obs-1');
assert.equal('latitude' in nearby[0], false);

const released = validateVisualAssetForRelease({
  id: 'asset-1',
  type: 'illustration',
  license: 'OWNED',
  sourceReceiptId: 'src-asset',
}, receipts);
assert.equal(released.license, 'OWNED');

assert.throws(
  () => validateVisualAssetForRelease({
    id: 'asset-2',
    type: 'illustration',
    license: 'UNKNOWN',
    sourceReceiptId: 'src-asset',
  }, receipts),
  (error) => error instanceof WildlifeContractError && error.code === 'UNKNOWN_ASSET_RIGHTS',
);

assert.throws(
  () => buildReceiptIndex([
    {
      id: 'dup',
      provider: 'fixture',
      sourceUrlOrId: 'fixture://one',
      fetchedAt: '2026-10-10T17:00:00Z',
      freshnessClass: 'fixture',
    },
    {
      id: 'dup',
      provider: 'fixture',
      sourceUrlOrId: 'fixture://two',
      fetchedAt: '2026-10-10T17:00:00Z',
      freshnessClass: 'fixture',
    },
  ]),
  (error) => error instanceof WildlifeContractError && error.code === 'DUPLICATE_RECEIPT',
);

console.log('wildlife-core: all contract and privacy tests passed');
