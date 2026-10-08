const baseUrl = (process.argv[2] || process.env.KROM_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const authToken = process.env.KROM_MCP_AUTH_TOKEN || '';
const expectAuth = process.env.KROM_EXPECT_AUTH === 'true';

function parseJsonOrSse(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    const dataLines = text.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    for (const data of dataLines.reverse()) {
      try { return JSON.parse(data); } catch {}
    }
    throw new Error(`Expected JSON/MCP SSE from ${url}, received: ${text.slice(0, 500)}`);
  }
}

async function readJson(response) {
  return parseJsonOrSse(await response.text(), response.url);
}

function mcpHeaders(sessionId, authorized = true) {
  const headers = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json'
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  if (authorized && authToken) headers.authorization = `Bearer ${authToken}`;
  return headers;
}

async function postMcp(body, sessionId, authorized = true) {
  return fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: mcpHeaders(sessionId, authorized),
    body: JSON.stringify(body),
    redirect: 'manual'
  });
}

async function main() {
  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });
  const health = await readJson(healthResponse);

  if (!healthResponse.ok) throw new Error(`/health returned HTTP ${healthResponse.status}`);
  if (health.ok !== true || health.status !== 'ready') {
    throw new Error(`/health is not ready: ${JSON.stringify(health)}`);
  }
  if (!health.version || health.endpoint !== '/mcp' || health.transport !== 'Streamable HTTP') {
    throw new Error(`/health metadata contract failed: ${JSON.stringify(health)}`);
  }

  if (expectAuth) {
    const anonymous = await postMcp({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'krom-v79-anonymous-smoke', version: '1.0.0' }
      }
    }, null, false);
    if (anonymous.status !== 401) {
      throw new Error(`Expected anonymous MCP initialize to return 401, got ${anonymous.status}`);
    }
  }

  const mcpGetResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'GET',
    headers: authToken ? { accept: 'application/json', authorization: `Bearer ${authToken}` } : { accept: 'application/json' },
    redirect: 'manual'
  });
  const mcpGet = await readJson(mcpGetResponse);
  if (mcpGetResponse.status !== 405) {
    throw new Error(`Expected authorized GET /mcp to reject unsupported transport request with 405, got ${mcpGetResponse.status}`);
  }
  if (mcpGet?.jsonrpc !== '2.0' || mcpGet?.error?.message !== 'Method not allowed.') {
    throw new Error(`GET /mcp returned unexpected MCP error shape: ${JSON.stringify(mcpGet)}`);
  }

  const initializeResponse = await postMcp({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'krom-v79-smoke', version: '1.0.0' }
    }
  });
  const initialize = await readJson(initializeResponse);
  if (!initializeResponse.ok || initialize?.result?.serverInfo?.name !== 'krom-forge') {
    throw new Error(`MCP initialize failed: HTTP ${initializeResponse.status} ${JSON.stringify(initialize)}`);
  }
  const sessionId = initializeResponse.headers.get('mcp-session-id');

  const initializedResponse = await postMcp({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {}
  }, sessionId);
  if (!initializedResponse.ok) {
    throw new Error(`MCP initialized notification failed with HTTP ${initializedResponse.status}`);
  }

  const listResponse = await postMcp({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sessionId);
  const listed = await readJson(listResponse);
  const tools = listed?.result?.tools;
  if (!listResponse.ok || !Array.isArray(tools)) {
    throw new Error(`MCP tools/list failed: HTTP ${listResponse.status} ${JSON.stringify(listed)}`);
  }
  if (tools.length < 10 || tools.length > 15) {
    throw new Error(`v79 core tools/list must expose 10-15 tools, got ${tools.length}`);
  }

  const names = new Set(tools.map((tool) => tool.name));
  for (const required of [
    'krom_route_workflow',
    'krom_inspect_project',
    'krom_plan_code_change',
    'krom_verify_evidence',
    'krom_evaluate_security_assessment',
    'krom_evaluate_production_readiness',
    'krom_decide_release',
    'krom_v77_build_native_mission_plan',
    'krom_v77_mission_control',
    'krom_v78_autonomous_governance',
    'krom_get_capabilities',
    'krom_search_capabilities',
    'krom_describe_capability',
    'krom_dispatch_capability'
  ]) {
    if (!names.has(required)) throw new Error(`Required v79 public tool missing from tools/list: ${required}`);
  }

  const toolCalls = [
    ['krom_get_capabilities', {}],
    ['krom_search_capabilities', { query: 'project snapshot', limit: 3 }],
    ['krom_describe_capability', { tool: 'krom_inspect_project' }],
    ['krom_dispatch_capability', { tool: 'krom_get_capabilities', input: {} }]
  ];
  for (const [index, [name, args]] of toolCalls.entries()) {
    const response = await postMcp({ jsonrpc: '2.0', id: 10 + index, method: 'tools/call', params: { name, arguments: args } }, sessionId);
    const body = await readJson(response);
    if (!response.ok || body?.error || body?.result?.isError) {
      throw new Error(`MCP tools/call failed for ${name}: HTTP ${response.status} ${JSON.stringify(body)}`);
    }
  }

  const unknownToolResponse = await postMcp({
    jsonrpc: '2.0', id: 20, method: 'tools/call',
    params: { name: 'krom_nonexistent_smoke_test', arguments: {} }
  }, sessionId);
  const unknownTool = await readJson(unknownToolResponse);
  if (!unknownToolResponse.ok || unknownTool?.error?.code !== -32602) {
    throw new Error(`MCP tools/call unknown-tool rejection failed: ${JSON.stringify(unknownTool)}`);
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
    authNegativeVerified: expectAuth,
    mcpGetStatus: mcpGetResponse.status,
    protocolVersion: initialize?.result?.protocolVersion ?? null,
    toolsListCount: tools.length,
    toolsCallSuccessCount: toolCalls.length,
    toolsCallUnknownToolRejected: true,
    tools: [...names].sort()
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
