import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyRelease } from '../scripts/verify-release.mjs';

const sha = 'e314e8c015bb87a481985b195148c2585b0f10bf';
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body), text: async () => body };
}
function fakeFetch({ marker = sha, missing = null } = {}) {
  const html = '<main id="app"></main>' + [
    '/experiences.js', '/share-state.js', '/cinematic-overhaul.js', '/experience-bridge.js', '/earth-convergence.js'
  ].map(path => `<script src="${path}"></script>`).join('');
  return async url => {
    const path = new URL(url).pathname;
    if (path === '/release.json') return response(JSON.stringify({ sha: marker }));
    if (path === '/') return response(html);
    if (path === missing) return response('', 404);
    return response('asset');
  };
}

test('release verification binds the app shell and local renderer assets to one SHA', async () => {
  const evidence = await verifyRelease({ baseUrl: 'https://deploy.example', expectedSha: sha, fetchImpl: fakeFetch() });
  assert.equal(evidence.sha, sha);
  assert.equal(evidence.url, 'https://deploy.example/');
  assert.ok(evidence.checkedAssets.includes('/assets/earth/earth_atmos_2048.jpg'));
});

test('release verification rejects mismatched and malformed SHA metadata', async () => {
  await assert.rejects(verifyRelease({ baseUrl: 'https://deploy.example', expectedSha: sha, fetchImpl: fakeFetch({ marker: '0'.repeat(40) }) }), /SHA mismatch/);
  await assert.rejects(verifyRelease({ baseUrl: 'https://deploy.example', expectedSha: 'main', fetchImpl: fakeFetch() }), /40 hexadecimal/);
});

test('release verification rejects missing local assets before certification', async () => {
  await assert.rejects(verifyRelease({ baseUrl: 'https://deploy.example', expectedSha: sha, fetchImpl: fakeFetch({ missing: '/earth-convergence.js' }) }), /earth-convergence.js returned HTTP 404/);
});
