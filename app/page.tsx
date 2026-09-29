import pkg from '../package.json';

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: '64px auto', padding: 24 }}>
      <h1>KROM Forge MCP</h1>
      <p>Production MCP endpoint:</p>
      <code>/mcp</code>
      <p>Health endpoint:</p>
      <code>/health</code>
      <p>Version {pkg.version}</p>
    </main>
  );
}
