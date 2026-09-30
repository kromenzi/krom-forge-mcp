import pkg from '../../package.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = {
    ok: true,
    status: 'ready',
    name: 'KROM Forge MCP',
    version: pkg.version,
    transport: 'Streamable HTTP',
    protocol: 'MCP',
    endpoint: '/mcp',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    region: process.env.VERCEL_REGION ?? null
  };

  return Response.json(payload, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
