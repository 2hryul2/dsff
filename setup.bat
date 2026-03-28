@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   DS FolderFit — 환경 설정
echo ============================================
echo.

:: Python 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo https://www.python.org/downloads/ 에서 Python 3.9+ 설치 후 재시도하세요.
    echo 설치 시 "Add Python to PATH" 체크 필수!
    pause
    exit /b 1
)

echo [1/3] 가상환경 생성 중...
python -m venv .venv
if errorlevel 1 (
    echo [오류] 가상환경 생성 실패
    pause
    exit /b 1
)

echo [2/3] 가상환경 활성화...
call .venv\Scripts\activate.bat

echo [3/3] 패키지 설치 중... (잠시 기다려주세요)
pip install -e ".[dev]" --quiet
pip install pyinstaller --quiet

echo.
echo ============================================
echo   설치 완료!
echo ============================================
echo.
echo 사용법:
echo   .venv\Scripts\activate    (가상환경 활성화)
echo   dsff --help               (도움말)
echo   dsff scan %%USERPROFILE%%\Downloads  (스캔)
echo   build.bat                 (실행파일 빌드)
echo.
pause
