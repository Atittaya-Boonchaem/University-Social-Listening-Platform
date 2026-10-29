@echo off
chcp 65001 >nul
echo =====================================================================
echo  📦 UP Voice Platform - Clean Source Code Packager
echo  สคริปต์เตรียมไฟล์ Source Code สะอาดสำหรับส่งมอบโครงงาน
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0.."
set "TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%"
set "OUTPUT_ZIP=%ROOT_DIR%\UP_Voice_SourceCode_%TIMESTAMP%.zip"

echo -> กำลังแพ็กเกจไฟล์โครงการ (ละเว้น node_modules, venv, cache)...
echo -> ไฟล์ปลายทาง: %OUTPUT_ZIP%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$exclude = @('node_modules', 'venv', '.venv', '__pycache__', '.git', '.idea', 'dist', '.vscode');" ^
    "$dest = '%OUTPUT_ZIP%';" ^
    "if (Test-Path $dest) { Remove-Item $dest -Force };" ^
    "$tempFolder = Join-Path $env:TEMP ('up_voice_pkg_' + [System.Guid]::NewGuid().ToString());" ^
    "New-Item -ItemType Directory -Path $tempFolder | Out-Null;" ^
    "Write-Host '-> กำลังคัดลอกไฟล์ที่จำเป็น...';" ^
    "Get-ChildItem -Path '%ROOT_DIR%' -Exclude $exclude | ForEach-Object {" ^
    "    if ($_.PSIsContainer) {" ^
    "        robocopy $_.FullName (Join-Path $tempFolder $_.Name) /E /XD node_modules venv .venv __pycache__ .git .idea dist .vscode /XF *.zip *.pyc /NFL /NDL /NJH /NJS | Out-Null" ^
    "    } else {" ^
    "        Copy-Item $_.FullName -Destination $tempFolder" ^
    "    }" ^
    "};" ^
    "Write-Host '-> กำลังบีบอัดเป็นไฟล์ ZIP...';" ^
    "Compress-Archive -Path (Join-Path $tempFolder '*') -DestinationPath $dest -Force;" ^
    "Remove-Item -Recurse -Force $tempFolder;" ^
    "Write-Host '✅ สำเร็จ! สร้างไฟล์ ZIP เรียบร้อย:' -ForegroundColor Green;" ^
    "Get-Item $dest | Select-Object Name, @{Name='Size(MB)';Expression={[math]::Round($_.Length/1MB, 2)}} | Format-Table"

echo.
echo =====================================================================
echo  สามารถนำไฟล์ ZIP ที่ได้ไปส่งอาจารย์ที่ปรึกษาได้ทันที
echo  (ขนาดไฟล์จะกะทัดรัด สะอาด ปราศจากไฟล์ชั่วคราว)
echo =====================================================================
pause
