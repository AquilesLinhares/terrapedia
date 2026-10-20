# Extrai os arquivos de tradução (en-US e pt-BR) que ficam embutidos no Terraria.exe.
# Só lê o arquivo: o jogo não é executado nem alterado.
#
# Uso (PowerShell):
#   .\scripts\extract-terraria-loc.ps1 -TerrariaExe "D:\SteamLibrary\steamapps\common\Terraria\Terraria.exe" -OutDir "C:\temp\terraria-loc"
#
# Os arquivos extraídos NÃO vão pro repositório (são do jogo). Depois rode:
#   node scripts/build-dictionary.mjs C:\temp\terraria-loc

param(
  [Parameter(Mandatory = $true)][string]$TerrariaExe,
  [Parameter(Mandatory = $true)][string]$OutDir
)

New-Item -ItemType Directory -Force $OutDir | Out-Null
$asm = [System.Reflection.Assembly]::ReflectionOnlyLoadFrom($TerrariaExe)
Write-Host "Lendo $($asm.FullName)"

foreach ($name in $asm.GetManifestResourceNames() | Where-Object { $_ -match 'Localization\.Content\.(en-US|pt-BR)\.' }) {
  $target = Join-Path $OutDir ($name -replace '^Terraria\.Localization\.Content\.', '')
  $stream = $asm.GetManifestResourceStream($name)
  $file = [System.IO.File]::Create($target)
  $stream.CopyTo($file)
  $file.Close()
  $stream.Close()
  Write-Host "  $target"
}
