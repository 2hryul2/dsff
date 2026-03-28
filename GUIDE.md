# DS FolderFit — Windows 설치 및 실행 가이드

## 사전 준비

- **Python 3.9+** 설치 필요 ([다운로드](https://www.python.org/downloads/))
- 설치 시 **"Add Python to PATH"** 반드시 체크

## 1단계: 프로젝트 복사

이 폴더 전체를 `D:\source\dsff`로 복사합니다.

```
D:\source\dsff\
├── setup.bat          ← 환경 설정 (처음 1회)
├── build.bat          ← 실행파일 빌드
├── pyproject.toml
├── src\dsff\          ← 소스 코드
├── tests\             ← 테스트
└── config\            ← 기본 규칙
```

## 2단계: 환경 설정 (처음 1회만)

**`setup.bat` 더블클릭** 또는 명령 프롬프트에서:

```cmd
cd D:\source\dsff
setup.bat
```

이 스크립트가 하는 일:
1. Python 설치 확인
2. 가상환경(`.venv`) 생성
3. 모든 패키지 + PyInstaller 설치

## 3단계: CLI로 바로 사용하기

```cmd
cd D:\source\dsff
.venv\Scripts\activate

dsff --version
dsff --help
dsff scan %USERPROFILE%\Downloads
dsff analyze %USERPROFILE%\Downloads
dsff organize %USERPROFILE%\Downloads              # 미리보기
dsff organize %USERPROFILE%\Downloads --execute    # 실행
dsff rename %USERPROFILE%\Downloads                # 리네임 미리보기
dsff duplicates %USERPROFILE%\Downloads            # 중복 검사
```

## 4단계: 실행파일(dsff.exe) 빌드

**`build.bat` 더블클릭** 또는:

```cmd
cd D:\source\dsff
.venv\Scripts\activate
build.bat
```

빌드 완료 후 `dist\dsff.exe`가 생성됩니다.

```cmd
dist\dsff.exe --help
dist\dsff.exe scan %USERPROFILE%\Downloads
dist\dsff.exe analyze "D:\업무자료"
```

## 5단계: 테스트 실행

```cmd
cd D:\source\dsff
.venv\Scripts\activate
python -m pytest tests/ -v
```

## 주요 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `dsff scan [폴더]` | 파일 스캔 및 통계 |
| `dsff analyze [폴더]` | 심층 분석 + 건강도 점수 |
| `dsff organize [폴더]` | 파일 정리 (기본: 미리보기) |
| `dsff organize [폴더] --execute` | 파일 정리 실행 |
| `dsff rename [폴더]` | 생성일 접두사 리네임 |
| `dsff duplicates [폴더]` | 중복 파일 검사 |
| `dsff watch [폴더]` | 실시간 감시 모드 |
| `dsff undo` | 마지막 작업 되돌리기 |
| `dsff folder add [경로]` | 관리 폴더 등록 |
| `dsff folder list` | 등록된 폴더 목록 |
| `dsff config --show` | 설정 확인 |

## 문제 해결

**"python을 찾을 수 없습니다"**
→ Python 설치 후 PATH에 추가. 또는 `py` 명령어 사용

**"pip install 실패"**
→ `python -m pip install --upgrade pip` 후 재시도

**"dsff 명령어를 찾을 수 없습니다"**
→ `.venv\Scripts\activate` 실행 확인

**빌드 시 바이러스 백신 차단**
→ PyInstaller로 만든 exe는 종종 오탐. dist 폴더를 예외 등록
