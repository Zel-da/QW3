# =============================================
# FoodieMatch 로컬 PC 자동 백업 스크립트
# =============================================
# 사용법:
#   1. 아래 $API_URL, $API_KEY 값을 실제 값으로 변경
#   2. PowerShell에서 직접 실행: .\backup_script.ps1
#   3. 자동화: Windows 작업 스케줄러에 등록
#
# 작업 스케줄러 등록 방법:
#   - 프로그램: powershell.exe
#   - 인수: -ExecutionPolicy Bypass -File "C:\경로\backup_script.ps1"
#   - 트리거: 매일 원하는 시간

# ---- 설정 ----
$API_URL  = "https://tbm-0nu9.onrender.com/api/admin/backup/full"
$API_KEY  = "da30b836f0384a788406e5ae162a8cd6ee10b1a8592d7630680619945f27cda9"
$BACKUP_DIR = "C:\Backups\FoodieMatch"

# ---- 백업 폴더 생성 ----
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# ---- 파일명 생성 ----
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$filename  = "backup_full_$timestamp.json"
$filepath  = Join-Path $BACKUP_DIR $filename

# ---- API 호출 및 저장 ----
try {
    Write-Host "[$timestamp] 백업 시작: $API_URL"
    Invoke-WebRequest -Uri $API_URL `
        -Headers @{ "x-backup-key" = $API_KEY } `
        -OutFile $filepath `
        -UseBasicParsing

    $size = (Get-Item $filepath).Length
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Host "[$timestamp] 백업 완료: $filename ($sizeMB MB)"
}
catch {
    Write-Host "[$timestamp] 백업 실패: $_" -ForegroundColor Red
    exit 1
}
