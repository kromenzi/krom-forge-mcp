import pkg from '../../package.json';

export async function GET() {
  return Response.json({ ok: true, name: 'KROM Forge MCP', version: pkg.version });
}
