Write-Host "=== KROM Forge v45 Build ==="
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "=== Linking Vercel project ==="
vercel link --yes --project krom-forge-mcp --scope kromenzis-projects
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "=== Production deploy ==="
vercel --prod --yes --scope kromenzis-projects
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "=== DONE ==="
