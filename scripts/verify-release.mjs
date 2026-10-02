const HEX_SHA = /^[a-f0-9]{40}$/i;
const REQUIRED_SCRIPTS = [
  '/experiences.js', '/share-state.js', '/cinematic-overhaul.js',
  '/experience-bridge.js', '/earth-convergence.js'
];

export async function verifyRelease({ baseUrl, expectedSha, fetchImpl = fetch }) {
  if (!HEX_SHA.test(expectedSha || '')) throw new Error('Expected release SHA must be 40 hexadecimal characters');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Release URL must use HTTP or HTTPS');
  const get = async path => {
    const response = await fetchImpl(new URL(path, base), { redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    return response;
  };
  const release = await (await get('/release.json')).json();
  if (release?.sha !== expectedSha) throw new Error(`Release SHA mismatch: expected ${expectedSha}, received ${String(release?.sha)}`);
  const html = await (await get('/')).text();
  if (!/<(?:main|div)\b[^>]*\bid=["']app["']/i.test(html)) throw new Error('The release page does not contain the Earth app shell');
  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi), match => match[1]);
  for (const source of REQUIRED_SCRIPTS) if (!scripts.includes(source)) throw new Error(`Required application script is missing: ${source}`);
  const localAssets = [...new Set([
    ...scripts,
    ...Array.from(html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.(?:css|svg)(?:\?[^"']*)?)["']/gi), match => match[1]),
    '/assets/earth/earth_atmos_2048.jpg'
  ])].filter(path => path.startsWith('/'));
  for (const path of localAssets) await get(path);
  return { sha: release.sha, url: base.href, checkedAssets: localAssets };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  try {
    const result = await verifyRelease({
      baseUrl: process.env.EARTH_BASE_URL || 'https://earth-reference-rebuild.vercel.app',
      expectedSha: process.env.EARTH_EXPECTED_SHA || process.argv[2]
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Release verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
