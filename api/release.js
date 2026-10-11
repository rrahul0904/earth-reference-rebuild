const SHA_PATTERN = /^[a-f0-9]{40}$/i;

export default function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).end();
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  if (!SHA_PATTERN.test(sha)) {
    return response.status(503).json({ error: 'release_sha_unavailable' });
  }

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method === 'HEAD') return response.status(200).end();
  return response.status(200).json({ sha });
}
