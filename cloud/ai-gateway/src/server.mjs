import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { analyzeEntities } from './google-language.mjs';

const port = Number(process.env.PORT || 8080);
const maxBodyBytes = 25000;
const gatewayToken = process.env.AI_GATEWAY_TOKEN || '';

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!gatewayToken) return false;
  const supplied = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(gatewayToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > maxBodyBytes) {
      const error = new Error('request_too_large');
      error.status = 413;
      throw error;
    }
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch {
    const error = new Error('invalid_json');
    error.status = 400;
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'red-point-church-ai-gateway',
        version: '0.2.0',
        mode: 'free-tier-first'
      });
    }

    if (!authorized(req)) {
      return json(res, 401, { ok: false, error: 'unauthorized' });
    }

    if (req.method === 'POST' && req.url === '/v1/text/entities') {
      const body = await readJson(req);
      const result = await analyzeEntities(body.text);
      return json(res, 200, {
        ok: true,
        provider: 'google-cloud-natural-language',
        operation: 'analyzeEntities',
        result
      });
    }

    if (req.method === 'POST' && req.url === '/v1/ai') {
      const body = await readJson(req);
      return json(res, 200, {
        ok: true,
        status: 'accepted',
        contract: 'church-os-ai-gateway/v1',
        operation: body.operation ?? null,
        message: 'Use a bounded operation endpoint; generic AI execution is intentionally disabled in V1.'
      });
    }

    return json(res, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return json(res, status, {
      ok: false,
      error: error?.message || 'internal_error',
      ...(error?.details ? { details: error.details } : {})
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`AI gateway listening on ${port}`);
});
