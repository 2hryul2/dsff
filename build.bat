@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   DS FolderFit — 실행파일 빌드
echo ============================================
echo.

:: 가상환경 활성화
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo [오류] 가상환경이 없습니다. setup.bat을 먼저 실행하세요.
    pause
    exit /b 1
)

:: PyInstaller 확인
pyinstaller --version >nul 2>&1
if errorlevel 1 (
    echo [설치] PyInstaller 설치 중...
    pip install pyinstaller --quiet
)

echo.
echo [빌드] dsff.exe 생성 중... (1~2분 소요)
echo.

pyinstaller ^
    --name dsff ^
    --onefile ^
    --console ^
    --clean ^
    --noconfirm ^
    --add-data "config;config" ^
    --hidden-import=typer ^
    --hidden-import=rich ^
    --hidden-import=pydantic ^
    --hidden-import=xxhash ^
    --hidden-import=filetype ^
    --hidden-import=send2trash ^
    --hidden-import=watchdog ^
    --hidden-import=watchdog.observers ^
    --hidden-import=platformdirs ^
    --hidden-import=humanize ^
    --hidden-import=loguru ^
    --hidden-import=yaml ^
    --icon=NONE ^
    src\dsff\__main__.py

if errorlevel 1 (
    echo.
    echo [오류] 빌드 실패. 위의 에러 메시지를 확인하세요.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   빌드 완료!
echo ============================================
echo.
echo   실행파일: dist\dsff.exe
echo.
echo   사용법:
echo     dist\dsff.exe --help
echo     dist\dsff.exe scan %%USERPROFILE%%\Downloads
echo     dist\dsff.exe organize %%USERPROFILE%%\Downloads
echo.

:: dist 폴더 열기
explorer dist

pause
