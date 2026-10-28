$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
if (-not (Get-Process zotero -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'D:\Zotero\zotero.exe' -WindowStyle Hidden
    Start-Sleep -Seconds 8
}
& 'D:\language\python311\python.exe' "$taskRoot\local_app.py" daily *>> "$taskRoot\data\daily-update.log"
exit $LASTEXITCODE
