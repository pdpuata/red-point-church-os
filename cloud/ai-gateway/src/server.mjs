import http from 'node:http';

const port = Number(process.env.PORT || 8080);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'red-point-church-ai-gateway',
      version: '0.1.0',
      mode: 'free-tier-first'
    });
  }

  if (req.method === 'POST' && req.url === '/v1/ai') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body;
    try { body = raw ? JSON.parse(raw) : {}; }
    catch { return json(res, 400, { ok: false, error: 'invalid_json' }); }

    return json(res, 200, {
      ok: true,
      status: 'accepted',
      contract: 'church-os-ai-gateway/v1',
      operation: body.operation ?? null,
      message: 'Gateway scaffold is ready for provider-specific AI adapters.'
    });
  }

  return json(res, 404, { ok: false, error: 'not_found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`AI gateway listening on ${port}`);
});
