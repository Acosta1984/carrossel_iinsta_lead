# Libera a porta 3000 (encerra processos que a utilizam)
$port = 3000
$lines = netstat -ano | findstr ":$port.*LISTENING"
if (-not $lines) {
  Write-Host "Porta $port nao esta em uso."
  exit 0
}
foreach ($line in $lines) {
  $parts = $line -split '\s+'
  $pid = $parts[-1]
  if ($pid -match '^\d+$') {
    Write-Host "Encerrando PID $pid (porta $port)..."
    taskkill /PID $pid /F 2>$null
  }
}
Write-Host "Porta $port liberada."
