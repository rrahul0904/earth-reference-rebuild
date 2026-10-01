import assert from 'node:assert/strict';
import {
  createLivingWorld,
  hashLivingWorld,
  killPerson,
  livingWorldStats,
  restoreLivingWorld,
  runExperiment,
  snapshotLivingWorld,
  teachKnowledge,
  tickLivingWorld
} from '../living-world-core.js';

const deterministicA = createLivingWorld({ seed: 'repeatable-world', population: 30, settlementCount: 3 });
const deterministicB = createLivingWorld({ seed: 'repeatable-world', population: 30, settlementCount: 3 });
tickLivingWorld(deterministicA, 10_000);
tickLivingWorld(deterministicB, 10_000);
assert.equal(hashLivingWorld(deterministicA), hashLivingWorld(deterministicB), 'same seed and ticks must produce identical hashes');
assert.equal(snapshotLivingWorld(deterministicA), snapshotLivingWorld(deterministicB), 'deterministic runs must be byte-identical');
assert.ok(livingWorldStats(deterministicA).settlements >= 3, 'simulation must preserve or grow settlements');

const teachingWorld = createLivingWorld({ seed: 'teaching', population: 24, settlementCount: 2 });
const carrier = Object.values(teachingWorld.people).find(person => person.skills.pottery);
const learner = Object.values(teachingWorld.people).find(person => person.alive && person.id !== carrier.id && person.settlementId === carrier.settlementId && !person.skills.pottery);
const teachingEvent = teachKnowledge(teachingWorld, carrier.id, learner.id, 'pottery');
assert.equal(teachingEvent.type, 'knowledge_taught');
assert.equal(teachingWorld.people[learner.id].skills.pottery.sourcePersonId, carrier.id);
assert.deepEqual(teachingWorld.people[learner.id].skills.pottery.eventIds, [teachingEvent.id]);

const lossWorld = createLivingWorld({ seed: 'knowledge-loss', population: 24, settlementCount: 2 });
const potteryCarriers = Object.values(lossWorld.people).filter(person => person.alive && person.skills.pottery);
assert.equal(potteryCarriers.length, 1, 'fixture expects one initial pottery carrier');
killPerson(lossWorld, potteryCarriers[0].id, 'test');
assert.equal(lossWorld.knowledgeState.pottery.status, 'lost', 'knowledge must be lost when its final unwritten carrier dies');
assert.ok(lossWorld.events.some(event => event.type === 'knowledge_lost' && event.payload.knowledgeId === 'pottery'));

const rediscoverer = Object.values(lossWorld.people).find(person => person.alive && person.skills.firemaking);
assert.ok(rediscoverer, 'pottery rediscovery requires a living firemaking carrier');
const rediscovery = runExperiment(lossWorld, rediscoverer.id, { inputs: ['clay'], process: ['shape', 'sustained_heat'] });
assert.equal(rediscovery.discovered, 'pottery', 'bounded experiment should rediscover lost pottery knowledge');
assert.equal(lossWorld.knowledgeState.pottery.status, 'known');
assert.equal(lossWorld.people[rediscoverer.id].skills.pottery.source, 'experiment');

const uninterrupted = createLivingWorld({ seed: 'snapshot-replay', population: 30, settlementCount: 3 });
tickLivingWorld(uninterrupted, 4_000);
const snap = snapshotLivingWorld(uninterrupted);
const resumed = restoreLivingWorld(snap);
tickLivingWorld(uninterrupted, 6_000);
tickLivingWorld(resumed, 6_000);
assert.equal(hashLivingWorld(uninterrupted), hashLivingWorld(resumed), 'snapshot restore continuation must match uninterrupted execution');
assert.equal(snapshotLivingWorld(uninterrupted), snapshotLivingWorld(resumed), 'restored continuation must be byte-identical');

const differentSeed = createLivingWorld({ seed: 'different-world', population: 30, settlementCount: 3 });
tickLivingWorld(differentSeed, 10_000);
assert.notEqual(hashLivingWorld(deterministicA), hashLivingWorld(differentSeed), 'different seeds should create different worlds');

console.log('Living World deterministic kernel checks passed.');
