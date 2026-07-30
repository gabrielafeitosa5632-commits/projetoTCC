$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AndroidRoot = Join-Path $ProjectRoot "android"
$ApkPath = Join-Path $AndroidRoot "app\build\outputs\apk\debug\app-debug.apk"
$BuildStartedAt = Get-Date

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Command
  $ExitCode = $LASTEXITCODE
  if ($null -ne $ExitCode -and $ExitCode -ne 0) {
    throw "Etapa falhou: $Title (codigo $ExitCode)"
  }
}

function Use-DetectedJava {
  if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor DarkGreen
    return
  }

  if (Get-Command java -ErrorAction SilentlyContinue) {
    Write-Host "Java encontrado no PATH." -ForegroundColor DarkGreen
    return
  }

  $Candidates = @(
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "$env:ProgramFiles\Android\Android Studio\jre",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium"
  )

  foreach ($Candidate in $Candidates) {
    if (!(Test-Path -LiteralPath $Candidate)) {
      continue
    }

    $JavaRoot = $Candidate
    if ((Split-Path -Leaf $Candidate) -eq "Eclipse Adoptium") {
      $JavaRoot = Get-ChildItem -LiteralPath $Candidate -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1 -ExpandProperty FullName
    }

    if ($JavaRoot -and (Test-Path -LiteralPath (Join-Path $JavaRoot "bin\java.exe"))) {
      $env:JAVA_HOME = $JavaRoot
      $env:PATH = "$(Join-Path $JavaRoot "bin");$env:PATH"
      Write-Host "Java detectado automaticamente: $JavaRoot" -ForegroundColor DarkGreen
      return
    }
  }

  throw @"
JAVA_HOME nao esta configurado e o comando java nao foi encontrado.

Instale o JDK 17 ou configure o Java do Android Studio.
Se voce tiver Android Studio instalado, o caminho costuma ser:
C:\Program Files\Android\Android Studio\jbr

No PowerShell, voce pode testar:
java -version
"@
}

try {
  Push-Location $ProjectRoot

  Invoke-Step "Verificando Java/JDK" {
    Use-DetectedJava
  }

  Invoke-Step "Compilando app web atualizado" {
    node ".\node_modules\vite\bin\vite.js" build
  }

  Invoke-Step "Sincronizando arquivos com Android/Capacitor" {
    node ".\node_modules\@capacitor\cli\bin\capacitor" sync android
  }

  Invoke-Step "Gerando APK debug atualizado" {
    Push-Location $AndroidRoot
    try {
      .\gradlew.bat assembleDebug
    } finally {
      Pop-Location
    }
  }

  if (!(Test-Path -LiteralPath $ApkPath)) {
    throw "APK nao encontrado em: $ApkPath"
  }

  $Apk = Get-Item -LiteralPath $ApkPath
  if ($Apk.LastWriteTime -lt $BuildStartedAt) {
    throw "O APK encontrado e antigo e nao foi regenerado nesta execucao: $($Apk.FullName)"
  }

  Write-Host ""
  Write-Host "APK gerado com sucesso!" -ForegroundColor Green
  Write-Host "Arquivo: $($Apk.FullName)"
  Write-Host "Tamanho: $([math]::Round($Apk.Length / 1MB, 2)) MB"
  Write-Host "Atualizado em: $($Apk.LastWriteTime)"
} catch {
  Write-Host ""
  Write-Host "Falha ao gerar APK:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
