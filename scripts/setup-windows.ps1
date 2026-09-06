$ErrorActionPreference = 'Stop'
Write-Host "Red Point Church App setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Checking Node..."
node --version
Write-Host "2. Installing packages..."
npm install
Write-Host "3. Checking Expo project..."
npx expo-doctor
Write-Host "4. Running TypeScript check..."
npm run typecheck
Write-Host ""
Write-Host "Setup checks completed." -ForegroundColor Green
Write-Host "Next: create .env from .env.example, then run npx expo start."
