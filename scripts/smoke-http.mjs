const baseUrl = (process.argv[2] || process.env.KROM_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${response.url}, received: ${text.slice(0, 300)}`);
  }
}

async function main() {
  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });
  const health = await readJson(healthResponse);

  if (!healthResponse.ok) {
    throw new Error(`/health returned HTTP ${healthResponse.status}`);
  }
  if (health.ok !== true || health.status !== 'ready') {
    throw new Error(`/health is not ready: ${JSON.stringify(health)}`);
  }
  if (!health.version || health.endpoint !== '/mcp' || health.transport !== 'Streamable HTTP') {
    throw new Error(`/health metadata contract failed: ${JSON.stringify(health)}`);
  }

  const mcpGetResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'manual'
  });
  const mcpGet = await readJson(mcpGetResponse);

  if (mcpGetResponse.status !== 405) {
    throw new Error(`Expected GET /mcp to reject unsupported transport request with 405, got ${mcpGetResponse.status}`);
  }
  if (mcpGet?.jsonrpc !== '2.0' || mcpGet?.error?.message !== 'Method not allowed.') {
    throw new Error(`GET /mcp returned unexpected MCP error shape: ${JSON.stringify(mcpGet)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    health: {
      version: health.version,
      environment: health.environment,
      gitSha: health.gitSha,
      region: health.region
    },
    mcpGetStatus: mcpGetResponse.status
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
