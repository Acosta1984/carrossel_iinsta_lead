# Setup inicial do projeto (Windows)
# Uso: .\scripts\setup.ps1
$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Arquivo .env criado. Edite e defina GEMINI_API_KEY."
}
npm install
Write-Host "Setup concluído. Execute: npm run dev"
