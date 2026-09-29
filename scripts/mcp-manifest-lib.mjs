import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const propertyName = (node) => {
  if (!node) return '';
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return node.getText();
};

const literalText = (node) => {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
};

const objectProperty = (object, name) => object?.properties.find((property) =>
  ts.isPropertyAssignment(property) && propertyName(property.name) === name
);

const duplicates = (items) => [...new Set(items.filter((item, index) => items.indexOf(item) !== index))];

const loadV53GeneratedTools = (root, route) => {
  const catalogPath = path.resolve(root, 'src/v53-catalog.json');
  if (!fs.existsSync(catalogPath) || !route.includes('V53_TOOL_SPECS')) return [];
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const domains = Array.isArray(catalog.domains) ? catalog.domains : [];
  const operations = Array.isArray(catalog.operations) ? catalog.operations : [];
  const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  const registrationMarker = 'for (const spec of V53_TOOL_SPECS)';
  const registrationIndex = route.indexOf(registrationMarker);
  const registrationLine = registrationIndex >= 0 ? route.slice(0, registrationIndex).split('\n').length : 1;
  return domains.flatMap((domain) => operations.map((operation) => ({
    name: `krom_v53_${slug(domain.id)}_${slug(operation.id)}`,
    title: `${operation.title} — ${domain.title}`,
    description: `${operation.intent} Domain focus: ${(domain.focus ?? []).join(', ')}. Outputs remain evidence-bound and never imply host execution.`,
    inputSchemaExpression: 'v53UniversalSchema',
    line: registrationLine,
    generated: true
  })));
};

const loadV54GeneratedTools = (root, route) => {
  const catalogPath = path.resolve(root, 'src/v54-catalog.json');
  if (!fs.existsSync(catalogPath) || !route.includes('V54_TOOL_SPECS')) return [];
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const domains = Array.isArray(catalog.domains) ? catalog.domains : [];
  const operations = Array.isArray(catalog.operations) ? catalog.operations : [];
  const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  const registrationMarker = 'for (const spec of V54_TOOL_SPECS)';
  const registrationIndex = route.indexOf(registrationMarker);
  const registrationLine = registrationIndex >= 0 ? route.slice(0, registrationIndex).split('\n').length : 1;
  return domains.flatMap((domain) => operations.map((operation) => ({
    name: `krom_v54_${slug(domain.id)}_${slug(operation.id)}`,
    title: `${operation.title} — ${domain.title}`,
    description: `${operation.intent} Domain focus: ${(domain.focus ?? []).join(', ')}. Automation remains evidence-bound, deterministic and host-authorized.`,
    inputSchemaExpression: 'v54AutomationSchema',
    line: registrationLine,
    generated: true
  })));
};

export function buildMcpManifest(options = {}) {
  const root = options.root ?? process.cwd();
  const routePath = options.routePath ?? 'app/mcp/route.ts';
  const packagePath = options.packagePath ?? 'package.json';
  const absoluteRoute = path.resolve(root, routePath);
  const route = fs.readFileSync(absoluteRoute, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(root, packagePath), 'utf8'));
  const source = ts.createSourceFile(absoluteRoute, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tools = [];
  const capabilityCandidates = [];
  const modules = [];
  const stringArrays = new Map();
  const v53GeneratedTools = loadV53GeneratedTools(root, route);
  const v54GeneratedTools = loadV54GeneratedTools(root, route);
  if (v53GeneratedTools.length && route.includes('...V53_TOOL_NAMES')) {
    stringArrays.set('V53_TOOL_NAMES', v53GeneratedTools.map((tool) => tool.name));
  }
  if (v54GeneratedTools.length && route.includes('...V54_TOOL_NAMES')) {
    stringArrays.set('V54_TOOL_NAMES', v54GeneratedTools.map((tool) => tool.name));
  }

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const moduleName = statement.moduleSpecifier.text;
      if (moduleName.startsWith('../../src/')) modules.push(moduleName.replace('../../src/', ''));
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const initializer = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer;
        if (!ts.isArrayLiteralExpression(initializer)) continue;
        const values = initializer.elements.map(literalText).filter((value) => typeof value === 'string');
        if (values.length === initializer.elements.length) stringArrays.set(declaration.name.text, values);
      }
    }
  }

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(source) === 'server' && node.expression.name.text === 'registerTool') {
      const [nameNode, configNode] = node.arguments;
      const name = literalText(nameNode);
      if (name && ts.isObjectLiteralExpression(configNode)) {
        const titleProperty = objectProperty(configNode, 'title');
        const descriptionProperty = objectProperty(configNode, 'description');
        const inputSchemaProperty = objectProperty(configNode, 'inputSchema');
        const location = source.getLineAndCharacterOfPosition(node.getStart(source));
        tools.push({
          name,
          title: literalText(titleProperty?.initializer) ?? '',
          description: literalText(descriptionProperty?.initializer) ?? '',
          inputSchemaExpression: inputSchemaProperty?.initializer.getText(source) ?? '',
          line: location.line + 1
        });
      }
    }

    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'tools' && ts.isArrayLiteralExpression(node.initializer)) {
      const names = node.initializer.elements.flatMap((element) => {
        const literal = literalText(element);
        if (literal) return [literal];
        if (ts.isSpreadElement(element) && ts.isIdentifier(element.expression)) return stringArrays.get(element.expression.text) ?? [];
        return [];
      });
      if (names.length) capabilityCandidates.push(names);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (v53GeneratedTools.length) {
    const runtimeContractPresent = route.includes('for (const spec of V53_TOOL_SPECS)') &&
      route.includes('server.registerTool(') &&
      route.includes('spec.name') &&
      route.includes('executeV53Tool(spec, input)');
    if (runtimeContractPresent) tools.push(...v53GeneratedTools);
  }
  if (v54GeneratedTools.length) {
    const runtimeContractPresent = route.includes('for (const spec of V54_TOOL_SPECS)') &&
      route.includes('server.registerTool(') &&
      route.includes('spec.name') &&
      route.includes('executeV54Tool(spec, input)');
    if (runtimeContractPresent) tools.push(...v54GeneratedTools);
  }

  const capabilityTools = capabilityCandidates.sort((a, b) => b.length - a.length)[0] ?? [];
  const registeredNames = tools.map((tool) => tool.name);
  const missingCapabilities = [...new Set(registeredNames)].filter((name) => !capabilityTools.includes(name));
  const extraCapabilities = [...new Set(capabilityTools)].filter((name) => !registeredNames.includes(name));
  const metadataGaps = tools.filter((tool) => !tool.title || !tool.description || !tool.inputSchemaExpression)
    .map((tool) => ({ name: tool.name, missing: [!tool.title && 'title', !tool.description && 'description', !tool.inputSchemaExpression && 'inputSchema'].filter(Boolean) }));

  const body = {
    schemaVersion: '1',
    package: pkg.name,
    version: pkg.version,
    route: routePath.replaceAll('\\', '/'),
    protocol: 'MCP',
    counts: {
      registered: new Set(registeredNames).size,
      capabilities: new Set(capabilityTools).size,
      sourceModules: new Set(modules).size
    },
    integrity: {
      duplicateRegistrations: duplicates(registeredNames),
      duplicateCapabilities: duplicates(capabilityTools),
      missingCapabilities,
      extraCapabilities,
      metadataGaps
    },
    sourceModules: [...new Set(modules)].sort(),
    tools
  };
  const fingerprint = `sha256:${crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')}`;
  return { ...body, fingerprint };
}

export function validateMcpManifest(manifest) {
  const failures = [];
  if (manifest.integrity.duplicateRegistrations.length) failures.push('Duplicate tool registrations');
  if (manifest.integrity.duplicateCapabilities.length) failures.push('Duplicate capability entries');
  if (manifest.integrity.missingCapabilities.length) failures.push('Registered tools missing from capabilities');
  if (manifest.integrity.extraCapabilities.length) failures.push('Capabilities missing registrations');
  if (manifest.integrity.metadataGaps.length) failures.push('Tool metadata is incomplete');
  if (!manifest.tools.every((tool) => tool.name.startsWith('krom_'))) failures.push('Unexpected tool name prefix');
  return { status: failures.length ? 'FAIL' : 'PASS', failures };
}

export function writeMcpManifest(manifest, outputPath, root = process.cwd()) {
  const absolute = path.resolve(root, outputPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(manifest, null, 2)}\n`);
  return absolute;
}
