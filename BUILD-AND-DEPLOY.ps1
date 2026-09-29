$ErrorActionPreference = "Stop"
Write-Host "=== KROM Forge v44 Build ==="
npm install
npm run build
Write-Host "=== Linking Vercel project ==="
vercel link --yes --project krom-forge-mcp --scope kromenzis-projects
Write-Host "=== Production deploy ==="
vercel --prod --yes --scope kromenzis-projects
Write-Host "=== DONE ==="
