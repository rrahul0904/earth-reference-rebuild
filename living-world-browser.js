import { createLivingWorld, livingWorldStats, snapshotLivingWorld, tickLivingWorld } from '/living-world-core.js';

const world = createLivingWorld({ seed: 'earth-living-world-demo-v1', population: 36, settlementCount: 3, maxPopulation: 96 });
tickLivingWorld(world, 2160);

function populationBySettlement() {
  const counts = new Map();
  for (const person of Object.values(world.people)) {
    if (!person.alive) continue;
    counts.set(person.settlementId, (counts.get(person.settlementId) || 0) + 1);
  }
  return counts;
}

function drawLivingWorld(tools = {}) {
  const { ctx, project, experience } = tools;
  if (!ctx || typeof project !== 'function') return;
  if (experience !== 'planet' && experience !== 'civilization') return;

  const counts = populationBySettlement();
  ctx.save();
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  for (const settlement of Object.values(world.settlements)) {
    const population = counts.get(settlement.id) || 0;
    if (!population) continue;
    const point = project(settlement.lat, settlement.lon);
    if (!point) continue;
    const radius = Math.max(3, Math.min(9, 2 + Math.sqrt(population)));
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244,226,164,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244,226,164,.78)';
    ctx.fill();
    if (population >= 4) {
      const label = settlement.name + ' · ' + population;
      const width = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(3,11,14,.78)';
      ctx.fillRect(point.x + 10, point.y - 9, width, 18);
      ctx.fillStyle = 'rgba(245,241,220,.88)';
      ctx.fillText(label, point.x + 16, point.y + 4);
    }
  }
  ctx.restore();
}

function install() {
  if (!window.EarthConvergence) {
    setTimeout(install, 50);
    return;
  }
  if (window.LivingWorldDemo) return;

  window.EarthConvergence.registerLayer('living-world', {
    label: 'Living world',
    description: 'Seeded settlements and population from the deterministic civilization kernel',
    kind: 'points',
    draw: drawLivingWorld
  });

  const app = document.getElementById('app');
  if (app) app.dataset.livingWorldReady = 'true';

  window.LivingWorldDemo = Object.freeze({
    seed: world.seed,
    tick: world.tick,
    stats: () => ({ ...livingWorldStats(world) }),
    snapshot: () => snapshotLivingWorld(world),
    settlements: () => Object.values(world.settlements).map(item => ({ ...item }))
  });
}

install();
