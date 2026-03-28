# DS FolderFit — 스마트 폴더 정리 도구 바이브 코딩 프로젝트 종합 문서

> **프로젝트명**: DS FolderFit (스마트 폴더 정리기)
> **작성일**: 2026-03-27 (최종 업데이트: 2026-03-28)
> **대상 플랫폼**: Python CLI + Electron 데스크톱 GUI (Windows)
> **개발 방법론**: 바이브 코딩 (AI 협업 기반 래피드 프로토타이핑)

---

## 1. 아이데이션 (Ideation)

### 1.1 문제 정의

다운로드 폴더뿐 아니라 업무 폴더, 프로젝트 폴더, 바탕화면 등 사용자의 모든 폴더는 시간이 지남에 따라 수백~수천 개의 파일이 무질서하게 쌓이는 디지털 혼돈 공간이 된다. 사용자는 필요한 파일을 찾기 위해 시간을 낭비하고, 중복 파일이 디스크 공간을 점유하며, 오래된 파일이 방치된다.

### 1.2 핵심 가치 제안

DS FolderFit은 **사용자가 지정한 어떤 폴더든** 자동으로 분석하고 분류하여 정리하는 Python CLI + GUI 도구로, 다음의 핵심 가치를 제공한다.

- **멀티 폴더 지원**: 다운로드 폴더뿐 아니라 사용자가 선택한 모든 폴더를 정리 대상으로 지정
- **폴더 분석**: 지정 폴더의 파일 구성, 용량 분포, 중복 현황을 시각적으로 분석
- **자동 분류**: 파일 확장자와 MIME 타입 기반으로 카테고리별 폴더에 자동 정리
- **중복 제거**: 해시 기반 중복 파일 감지 및 처리
- **시간 기반 정리**: 날짜별/기간별 파일 그룹핑
- **대용량 알림**: 설정 임계치 초과 파일 즉시 알림
- **실시간 감시**: 데몬 모드로 새 파일 자동 정리

### 1.3 타겟 사용자

- **일반 사용자**: 다운로드 폴더, 바탕화면 등이 지저분해서 정리가 필요한 사람
- **사무직 근로자**: 업무 폴더, 프로젝트 폴더에 쌓인 문서를 체계적으로 관리하고 싶은 사용자
- **개발자**: CLI 도구에 익숙하고 자동화를 선호하는 사용자
- **파워 유저**: 커스텀 규칙과 스케줄링이 필요한 고급 사용자

### 1.4 유사 도구 분석 및 차별점

| 기존 도구 | 특징 | DS FolderFit 차별점 |
|-----------|------|-----------------|
| Local-File-Organizer (GitHub 3.2k★) | AI 기반 분류, 로컬 LLM 활용 | 경량 CLI+GUI, AI 없이도 스마트 분류 |
| Freshen-File-Sorter | 컨텍스트 메뉴 통합 | 멀티 폴더 + Watch 모드 동시 지원 |
| TidyBit | GUI 기반, 미리보기/실행취소 | CLI+GUI 듀얼 + 안전 모드(dry-run, undo) |
| Connor | NLP 기반 분류 | 의존성 최소화, 빠른 설치 |

DS FolderFit의 핵심 차별점은 **다운로드 폴더에 국한되지 않는 범용 폴더 정리** + **폴더 분석 대시보드** + **완전한 안전장치(dry-run, undo, trash)** + **실시간 Watch 모드**의 조합이다.

---

## 2. 상세 스펙 (Detailed Specification)

### 2.1 기능 요구사항

#### 2.1.1 멀티 폴더 관리 및 폴더 분석 ★ 신규

**멀티 폴더 등록**:

사용자가 원하는 폴더를 자유롭게 등록하고 각 폴더에 서로 다른 정리 규칙을 적용할 수 있다.

**CLI**:
```bash
# 폴더 등록
dsff folder add ~/Downloads --label "다운로드"
dsff folder add ~/Desktop --label "바탕화면"
dsff folder add "D:/업무자료/2026" --label "업무 자료" --watch

# 등록된 폴더 목록
dsff folder list

# 폴더 제거
dsff folder remove "바탕화면"
```

**GUI**: 사이드바에 등록된 폴더 목록 표시 + `[+ 폴더 추가]` 버튼으로 파일 다이얼로그 오픈.

**폴더 분석 (Folder Analysis)**:

지정 폴더의 현재 상태를 심층 분석하여 리포트를 제공한다. 정리 전에 "무엇이 문제인지"를 먼저 파악할 수 있다.

```bash
# 특정 폴더 분석
dsff analyze ~/Downloads
dsff analyze "D:/업무자료/2026" --depth 3

# 등록된 모든 폴더 분석
dsff analyze --all
```

**분석 항목**:

| 항목 | 설명 |
|------|------|
| 파일 수 / 총 용량 | 폴더 내 전체 파일 수와 디스크 사용량 |
| 파일 타입별 분포 | 확장자 기반 카테고리별 파일 수 및 용량 비율 |
| 크기 분포 | 소형(<1MB), 중형(1-100MB), 대형(100MB+) 파일 비율 |
| 날짜 분포 | 최근 7일, 이번 달, 올해, 1년 이상 된 파일 비율 |
| 중복 파일 현황 | 중복 파일 수, 낭비 용량, 상위 중복 그룹 |
| 깊이 분석 | 폴더 중첩 깊이별 파일 분포 |
| 정리 건강도 점수 | 0~100점 (중복율, 미분류율, 오래된 파일 비율 기반) |

**분석 리포트 출력 예시 (CLI)**:
```
📊 폴더 분석: C:/Users/sds/Downloads
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  총 파일:    1,247개          총 용량: 28.3 GB
  정리 점수:  32/100 🔴 정리가 필요합니다

  📁 파일 타입별 분포
  ┌──────────────────────────────────────┐
  │  이미지     ██████████░░░░░░ 42% (523개, 8.2GB)
  │  문서       ██████░░░░░░░░░░ 28% (349개, 2.1GB)
  │  동영상     █████░░░░░░░░░░░ 18% (45개, 15.8GB)
  │  압축파일   ██░░░░░░░░░░░░░░  7% (87개, 1.9GB)
  │  기타       █░░░░░░░░░░░░░░░  5% (243개, 0.3GB)
  └──────────────────────────────────────┘

  ⚠ 발견된 문제
  ├ 중복 파일: 89개 (2.1GB 낭비)
  ├ 대용량 파일(500MB+): 12개 (9.8GB)
  ├ 1년 이상 된 파일: 342개 (31%)
  └ 미분류 파일: 243개

  💡 추천 작업
  ├ dsff organize ~/Downloads --execute   → 타입별 자동 정리
  ├ dsff duplicates ~/Downloads           → 중복 파일 정리
  └ dsff rename ~/Downloads --execute     → 생성일 접두사 추가
```

**GUI 분석 대시보드**:
```
┌─────────────────────────────────────────────────────────┐
│  📊 폴더 분석       [📁 다운로드 ▾] [📁 바탕화면] [+ 추가] │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  정리 건강도          │  📈 파일 타입별 분포 (파이 차트)    │
│  ┌────────────┐     │  ┌──────────────────────────┐    │
│  │            │     │  │                          │    │
│  │   32/100   │     │  │    [인터랙티브 차트]       │    │
│  │    🔴      │     │  │    클릭하면 해당 파일 목록  │    │
│  │            │     │  │                          │    │
│  └────────────┘     │  └──────────────────────────┘    │
│                      │                                  │
│  총 파일: 1,247개     │  📅 날짜별 분포 (바 차트)         │
│  총 용량: 28.3 GB     │  ┌──────────────────────────┐    │
│  중복: 89개 (2.1GB)   │  │                          │    │
│  대용량: 12개 (9.8GB) │  │    [시간축 히트맵]         │    │
│                      │  │                          │    │
├──────────────────────┴──────────────────────────────────┤
│  💡 추천: [원클릭 정리 ▶] [중복 제거] [리네임] [상세 리포트] │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.2 파일 분류 엔진 (Core)

**확장자 기반 분류** — 기본 카테고리 매핑:

| 카테고리 | 확장자 |
|---------|--------|
| Images | .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp, .ico, .tiff, .heic |
| Documents | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .rtf, .odt, .csv |
| Videos | .mp4, .avi, .mkv, .mov, .wmv, .flv, .webm, .m4v |
| Audio | .mp3, .wav, .flac, .aac, .ogg, .wma, .m4a |
| Archives | .zip, .rar, .7z, .tar, .gz, .bz2, .xz |
| Code | .py, .js, .ts, .html, .css, .java, .c, .cpp, .go, .rs |
| Executables | .exe, .msi, .dmg, .app, .deb, .rpm, .AppImage |
| Fonts | .ttf, .otf, .woff, .woff2 |
| Others | 분류되지 않는 모든 파일 |

**MIME 타입 기반 보조 분류**: 확장자가 없거나 잘못된 경우 `filetype` 라이브러리로 매직 넘버 기반 실제 파일 타입 감지.

**커스텀 규칙**: YAML 설정 파일을 통한 사용자 정의 분류 규칙 지원.

```yaml
# ~/.dsff/config.yaml

# ★ 멀티 폴더 관리: 여러 폴더를 등록하고 각각 다른 규칙 적용
folders:
  - path: "~/Downloads"
    label: "다운로드"
    auto_watch: true
    rules_profile: "default"

  - path: "~/Desktop"
    label: "바탕화면"
    auto_watch: false
    rules_profile: "desktop"

  - path: "D:/업무자료/2026"
    label: "업무 자료"
    auto_watch: true
    rules_profile: "work"

  - path: "C:/Users/sds/Documents/프로젝트"
    label: "프로젝트"
    auto_watch: false
    rules_profile: "project"

rules:
  - name: "프로젝트 자료"
    match:
      patterns: ["project_*", "회의록_*"]
      extensions: [".pdf", ".docx"]
    action:
      move_to: "Projects"

  - name: "스크린샷"
    match:
      patterns: ["Screenshot*", "스크린샷*", "캡처*"]
    action:
      move_to: "Screenshots"
```

#### 2.1.2 중복 파일 감지 (Duplicate Detection)

**3단계 중복 감지 파이프라인**:

```
[1단계] 파일 크기 그룹핑 (즉시, 90%+ 비중복 제거)
    ↓ 동일 크기 파일만 통과
[2단계] xxhash64 빠른 해싱 (초고속, 나머지 비중복 제거)
    ↓ 해시 일치 파일만 통과
[3단계] SHA-256 정밀 검증 (선택적, 100% 확인)
    ↓ 최종 중복 확인
```

**중복 처리 옵션**:
- `--duplicates move`: 중복 파일을 `_duplicates/` 폴더로 이동
- `--duplicates trash`: 중복 파일을 휴지통으로 (send2trash)
- `--duplicates hardlink`: 중복 파일을 하드링크로 교체 (공간 절약)
- `--duplicates report`: 리포트만 출력 (기본값)

**특수 케이스 처리**:
- 빈 파일(0바이트): 크기=0 그룹으로 별도 처리
- 심볼릭 링크: `Path.resolve()`로 원본 추적
- 하드 링크: `inode` 비교로 이미 동일 파일인지 확인
- 스캔 중 변경 파일: 예외 처리 후 건너뛰기

#### 2.1.3 날짜 기반 정리

**정리 모드**:
- `--by-date daily`: `YYYY/MM/DD/` 구조로 정리
- `--by-date monthly`: `YYYY/MM-월명/` 구조로 정리
- `--by-date yearly`: `YYYY/` 구조로 정리
- `--by-date age`: `최근7일/`, `이번달/`, `올해/`, `오래된파일/` 구조

**날짜 기준**: 파일 수정일(`mtime`) 기본, `--use-ctime`으로 생성일 사용 가능.

#### 2.1.4 대용량 파일 알림

**임계치 설정**: 기본 500MB, `--size-threshold 1GB`로 조정 가능.

**알림 방식**:
- CLI: Rich 테이블로 대용량 파일 목록 표시
- 리포트: 크기순 정렬된 파일 목록 출력
- 옵션: `--large-files move`로 `_large_files/` 폴더로 이동

#### 2.1.5 실시간 Watch 모드

```bash
dsff watch [--delay 2.0] [--exclude "*.tmp,*.part"]
```

- Watchdog 기반 파일 시스템 이벤트 모니터링
- 디바운싱(기본 2초)으로 중복 이벤트 방지
- 부분 다운로드 파일(`.part`, `.crdownload`, `.tmp`) 자동 제외
- 데몬 모드: `dsff watch --daemon`으로 백그라운드 실행

#### 2.1.6 파일 날짜 정보 툴팁 (GUI)

GUI 파일 목록에서 파일명 위에 마우스를 올리면 **수정한 날짜**와 **액세스한 날짜**를 툴팁으로 표시한다. Windows 파일 속성 대화상자와 동일한 정보를 즉시 확인 가능.

**표시 정보**:
- 만든 날짜 (ctime): 파일이 최초 생성된 시점
- 수정한 날짜 (mtime): 파일 내용이 마지막으로 변경된 시점
- 액세스한 날짜 (atime): 파일을 마지막으로 열어본 시점
- 파일 크기: 사람이 읽기 쉬운 형태 (KB/MB/GB)

**툴팁 레이아웃**:
```
┌────────────────────────────────────────┐
│  📄 신한디에스_AISP 케이블 추가 포설 건_S.xlsx │
│  ─────────────────────────────────────  │
│  만든 날짜:    2025-04-15 (화) 오전 10:15  │
│  수정한 날짜:  2025-04-15 (화) 오전 10:15  │
│  액세스 날짜:  2026-03-27 (금) 오후 12:36  │
│  ─────────────────────────────────────  │
│  크기: 610 KB (624,911 바이트)            │
│  형식: Microsoft Excel 워크시트(.xlsx)     │
└────────────────────────────────────────┘
```

**구현 설계**:

```python
# gui/widgets/file_browser.py
from PySide6.QtWidgets import QTreeView
from PySide6.QtCore import Qt, QPoint
from datetime import datetime
import humanize

class FileTreeView(QTreeView):
    """날짜 정보 툴팁을 제공하는 파일 트리뷰"""

    def viewportEvent(self, event):
        if event.type() == event.Type.ToolTip:
            index = self.indexAt(event.pos())
            if index.isValid():
                file_info = self.model().get_file_info(index)
                tooltip = self._build_tooltip(file_info)
                QToolTip.showText(event.globalPos(), tooltip, self)
                return True
        return super().viewportEvent(event)

    def _build_tooltip(self, info) -> str:
        """파일 메타데이터로 툴팁 HTML 생성"""
        created = info.created_time.strftime("%Y-%m-%d (%a) %p %I:%M")
        modified = info.modified_time.strftime("%Y-%m-%d (%a) %p %I:%M")
        accessed = info.accessed_time.strftime("%Y-%m-%d (%a) %p %I:%M")
        size_hr = humanize.naturalsize(info.size, binary=True)
        size_bytes = f"{info.size:,}"

        return f"""
        <table style='font-size:12px; padding:4px;'>
          <tr><td colspan='2'><b>📄 {info.name}</b></td></tr>
          <tr><td colspan='2'><hr/></td></tr>
          <tr><td>만든 날짜:</td><td>{created}</td></tr>
          <tr><td>수정한 날짜:</td><td><b>{modified}</b></td></tr>
          <tr><td>액세스 날짜:</td><td>{accessed}</td></tr>
          <tr><td colspan='2'><hr/></td></tr>
          <tr><td>크기:</td><td>{size_hr} ({size_bytes} 바이트)</td></tr>
          <tr><td>형식:</td><td>{info.mime_description}</td></tr>
        </table>
        """
```

**플랫폼별 날짜 수집**:

```python
# core/scanner.py — FileInfo에 accessed_time 추가
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import platform

@dataclass
class FileInfo:
    path: Path
    name: str
    extension: str
    size: int
    created_time: datetime   # ctime (Windows: 생성일, Unix: 메타변경일)
    modified_time: datetime  # mtime
    accessed_time: datetime  # atime ★ 신규 추가
    mime_type: str | None
    mime_description: str    # ★ 신규 추가 ("Microsoft Excel 워크시트" 등)
    is_symlink: bool
    inode: int

    @classmethod
    def from_path(cls, path: Path) -> "FileInfo":
        stat = path.stat()
        return cls(
            path=path,
            name=path.name,
            extension=path.suffix.lower(),
            size=stat.st_size,
            created_time=datetime.fromtimestamp(stat.st_ctime),
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            accessed_time=datetime.fromtimestamp(stat.st_atime),
            mime_type=_detect_mime(path),
            mime_description=_get_mime_description(path),
            is_symlink=path.is_symlink(),
            inode=stat.st_ino,
        )
```

> **참고**: Windows에서 `st_ctime`은 파일 생성일이지만, Unix/Linux에서는 메타데이터 변경일(inode change time)이다. 진정한 생성일이 필요한 경우 macOS는 `st_birthtime`, Linux(ext4)는 `statx()` 시스템콜을 사용해야 한다.

#### 2.1.7 생성일 기반 파일 리네임

파일명 앞에 생성일을 자동으로 붙여 시간순 정렬이 가능하도록 리네임하는 기능.

**리네임 규칙**:
```
원본:   신한디에스_AISP 케이블 추가 포설 건_S.xlsx
결과:   250415_신한디에스_AISP 케이블 추가 포설 건_S.xlsx
        ^^^^^^
        생성일(YYMMDD)
```

**CLI 인터페이스**:
```bash
# 기본: YYMMDD 접두사
dsff rename [PATH] --execute

# 날짜 포맷 옵션
dsff rename --format YYMMDD        # 250415_파일명.xlsx (기본)
dsff rename --format YYYYMMDD      # 20250415_파일명.xlsx
dsff rename --format YYYY-MM-DD    # 2025-04-15_파일명.xlsx

# 날짜 기준 선택
dsff rename --date-source created   # 만든 날짜 (기본)
dsff rename --date-source modified  # 수정한 날짜

# 이미 날짜 접두사가 있는 파일 처리
dsff rename --skip-existing         # 이미 날짜 접두사 있으면 건너뛰기 (기본)
dsff rename --overwrite-date        # 기존 날짜 접두사 교체

# 대상 필터
dsff rename --extensions .xlsx,.pdf,.docx  # 특정 확장자만
dsff rename --exclude "*.tmp"              # 제외 패턴
```

**GUI 통합**:

파일 정리 화면에 "생성일 리네임" 체크박스 추가:
```
┌─────────────────────────────────────────────────────┐
│  📂 파일 정리                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  정리 옵션:                                          │
│  ☑ 파일 종류별 폴더 분류                              │
│  ☑ 생성일 접두사 리네임 (YYMMDD_파일명)   ← ★ 신규    │
│  ☐ 중복 파일 처리                                    │
│  ☐ 대용량 파일 분리                                   │
│                                                     │
│  날짜 포맷: [YYMMDD  ▾]   날짜 기준: [만든 날짜  ▾]   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  미리보기:                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │  신한디에스_AISP...건_S.xlsx                  │    │
│  │    → 250415_신한디에스_AISP...건_S.xlsx       │    │
│  │  quarterly_report.pdf                       │    │
│  │    → 260301_quarterly_report.pdf            │    │
│  │  250327_meeting_notes.docx                  │    │
│  │    → (건너뛰기: 이미 날짜 접두사 있음)         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [🟢 정리 실행]   [↩ 되돌리기]                        │
└─────────────────────────────────────────────────────┘
```

**핵심 구현 설계**:

```python
# core/renamer.py
import re
from pathlib import Path
from datetime import datetime

# 이미 날짜 접두사가 붙어있는지 감지하는 패턴
DATE_PREFIX_PATTERNS = [
    re.compile(r"^\d{6}_"),          # YYMMDD_
    re.compile(r"^\d{8}_"),          # YYYYMMDD_
    re.compile(r"^\d{4}-\d{2}-\d{2}_"),  # YYYY-MM-DD_
]

DATE_FORMATS = {
    "YYMMDD": "%y%m%d",
    "YYYYMMDD": "%Y%m%d",
    "YYYY-MM-DD": "%Y-%m-%d",
}

class FileRenamer:
    """생성일 기반 파일 리네임"""

    def __init__(self, date_format: str = "YYMMDD",
                 date_source: str = "created",
                 skip_existing: bool = True):
        self.date_format = date_format
        self.date_source = date_source
        self.skip_existing = skip_existing
        self._fmt = DATE_FORMATS[date_format]

    def plan_rename(self, file_info) -> RenamePlan | None:
        """리네임 계획 생성 (dry-run용)"""
        # 이미 날짜 접두사가 있는지 확인
        if self.skip_existing and self._has_date_prefix(file_info.name):
            return None  # 건너뛰기

        # 날짜 기준 선택
        if self.date_source == "created":
            date = file_info.created_time
        else:
            date = file_info.modified_time

        # 새 파일명 생성
        date_str = date.strftime(self._fmt)
        new_name = f"{date_str}_{file_info.name}"
        new_path = file_info.path.parent / new_name

        # 이름 충돌 처리
        new_path = self._resolve_conflict(new_path)

        return RenamePlan(
            source=file_info.path,
            dest=new_path,
            original_name=file_info.name,
            new_name=new_path.name,
            date_applied=date_str,
        )

    def execute_rename(self, plan: RenamePlan) -> bool:
        """리네임 실행"""
        try:
            plan.source.rename(plan.dest)
            return True
        except OSError as e:
            logger.error(f"리네임 실패: {plan.original_name} → {e}")
            return False

    def _has_date_prefix(self, filename: str) -> bool:
        """파일명에 이미 날짜 접두사가 있는지 확인"""
        return any(p.match(filename) for p in DATE_PREFIX_PATTERNS)

    def _resolve_conflict(self, path: Path) -> Path:
        """파일명 충돌 시 번호 접미사 추가"""
        if not path.exists():
            return path
        stem = path.stem
        suffix = path.suffix
        counter = 1
        while path.exists():
            path = path.parent / f"{stem}({counter}){suffix}"
            counter += 1
        return path

@dataclass
class RenamePlan:
    source: Path
    dest: Path
    original_name: str
    new_name: str
    date_applied: str
```

**플랫폼별 생성일 처리 (크로스 플랫폼)**:

```python
# utils/platform.py
import os, sys, platform
from datetime import datetime
from pathlib import Path

def get_creation_time(path: Path) -> datetime:
    """크로스 플랫폼 파일 생성일 취득"""
    stat = path.stat()

    if sys.platform == "win32":
        # Windows: st_ctime이 진짜 생성일
        return datetime.fromtimestamp(stat.st_ctime)

    elif sys.platform == "darwin":
        # macOS: st_birthtime 사용
        return datetime.fromtimestamp(stat.st_birthtime)

    else:
        # Linux: statx() 시스템콜 시도 (커널 4.11+, ext4/btrfs)
        try:
            import ctypes
            import ctypes.util
            # statx 시스템콜로 btime(birth time) 취득
            btime = _linux_get_birthtime(path)
            if btime:
                return btime
        except Exception:
            pass

        # 폴백: mtime과 ctime 중 더 오래된 값
        return datetime.fromtimestamp(min(stat.st_mtime, stat.st_ctime))
```

**Undo 지원**:

리네임 작업도 기존 Undo 시스템에 통합:
```json
{
  "timestamp": "2026-03-27T14:30:00",
  "operations": [
    {
      "type": "rename",
      "source": "신한디에스_AISP 케이블 추가 포설 건_S.xlsx",
      "dest": "250415_신한디에스_AISP 케이블 추가 포설 건_S.xlsx",
      "folder": "C:/Users/sds/Downloads"
    }
  ]
}
```

#### 2.1.8 안전 기능

**Dry-Run 모드** (기본 활성화):
```bash
dsff organize          # dry-run (미리보기만)
dsff organize --execute  # 실제 실행
```

**Undo 기능**:
- 모든 파일 이동을 JSON 로그에 기록
- `dsff undo` 명령으로 마지막 작업 되돌리기
- `dsff undo --all` 모든 작업 되돌리기
- 로그 파일: `~/.dsff/history/YYYY-MM-DD_HH-MM-SS.json`

```json
{
  "timestamp": "2026-03-27T14:30:00",
  "operations": [
    {"type": "move", "source": "/Downloads/photo.jpg", "dest": "/Downloads/Images/photo.jpg"},
    {"type": "move", "source": "/Downloads/report.pdf", "dest": "/Downloads/Documents/report.pdf"}
  ]
}
```

**휴지통 삭제**: `send2trash` 사용으로 영구 삭제 방지.

### 2.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | 10,000개 파일 스캔 < 10초 (SSD 기준) |
| 메모리 | 대용량 파일 해싱 시 스트리밍 방식 (청크 8KB) |
| 호환성 | Python 3.9+, Windows/macOS/Linux |
| 설치 | `pip install dsff` 단일 명령 |
| 설정 | 제로 컨피그로 즉시 사용, YAML로 커스터마이즈 |
| 로깅 | 모든 작업 기록, 디버그 모드 지원 |

### 2.3 CLI 인터페이스 설계

```
dsff — DS FolderFit 스마트 폴더 정리 도구

Usage:
  dsff folder add|remove|list          폴더 등록/해제/목록 ★
  dsff analyze [PATH] [OPTIONS]        폴더 분석 리포트 ★
  dsff organize [PATH] [OPTIONS]       파일 정리 실행
  dsff rename [PATH] [OPTIONS]         생성일 접두사 리네임
  dsff scan [PATH] [OPTIONS]           폴더 스캔 (간략)
  dsff duplicates [PATH] [OPTIONS]     중복 파일 검사
  dsff watch [PATH] [OPTIONS]          실시간 감시 모드
  dsff undo [OPTIONS]                  마지막 작업 되돌리기
  dsff config [OPTIONS]                설정 관리

Folder Options:  ★ 신규
  dsff folder add PATH [--label NAME] [--watch] [--profile PROFILE]
  dsff folder remove LABEL
  dsff folder list

Analyze Options:  ★ 신규
  --depth N              분석 폴더 깊이 (기본: 전체)
  --all                  등록된 모든 폴더 분석
  --export FILE          분석 결과를 JSON/HTML로 내보내기
  --score-only           정리 건강도 점수만 출력

Global Options:
  --path, -p PATH        대상 폴더 (기본: 등록된 폴더 또는 ~/Downloads)
  --config, -c FILE      설정 파일 경로
  --verbose, -v          상세 출력
  --quiet, -q            최소 출력
  --no-color             컬러 비활성화
  --version              버전 정보

Organize Options:
  --execute              실제 실행 (기본은 dry-run)
  --by-type              확장자 기반 분류 (기본)
  --by-date MODE         날짜 기반 정리 (daily/monthly/yearly/age)
  --by-size              크기 기반 정리
  --duplicates ACTION    중복 처리 (report/move/trash/hardlink)
  --size-threshold SIZE  대용량 파일 임계치 (기본: 500MB)
  --exclude PATTERNS     제외 패턴 (콤마 구분)
  --include PATTERNS     포함 패턴 (콤마 구분)

Rename Options:  ★ 신규
  --execute              실제 실행 (기본은 dry-run)
  --format FORMAT        날짜 포맷 (YYMMDD/YYYYMMDD/YYYY-MM-DD, 기본: YYMMDD)
  --date-source SOURCE   날짜 기준 (created/modified, 기본: created)
  --skip-existing        이미 날짜 접두사 있으면 건너뛰기 (기본)
  --overwrite-date       기존 날짜 접두사 교체
  --extensions EXTS      대상 확장자 (콤마 구분)

Watch Options:
  --delay SECONDS        디바운스 지연 (기본: 2.0)
  --daemon               백그라운드 실행
  --exclude PATTERNS     제외 패턴
```

### 2.4 데이터 모델

```python
# config.py — Pydantic 기반 설정 모델
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional

class ManagedFolder(BaseModel):
    """★ 사용자가 등록한 관리 대상 폴더"""
    path: Path
    label: str                          # 사용자 지정 이름 ("다운로드", "업무자료" 등)
    auto_watch: bool = False            # 실시간 감시 자동 시작 여부
    rules_profile: str = "default"      # 적용할 규칙 프로필
    last_analyzed: datetime | None = None
    health_score: int | None = None     # 마지막 분석 시 건강도 점수 (0~100)

class CategoryRule(BaseModel):
    name: str
    extensions: list[str] = []
    patterns: list[str] = []
    mime_types: list[str] = []
    target_folder: str

class DuplicateConfig(BaseModel):
    enabled: bool = True
    action: str = "report"  # report | move | trash | hardlink
    hash_algorithm: str = "xxhash64"
    verify_with_sha256: bool = False

class WatchConfig(BaseModel):
    enabled: bool = False
    delay: float = 2.0
    exclude_patterns: list[str] = ["*.tmp", "*.part", "*.crdownload"]
    daemon: bool = False

class RenameConfig(BaseModel):
    """★ 생성일 리네임 설정"""
    date_format: str = "YYMMDD"         # YYMMDD | YYYYMMDD | YYYY-MM-DD
    date_source: str = "created"        # created | modified
    skip_existing: bool = True
    separator: str = "_"

class AnalyzeConfig(BaseModel):
    """★ 폴더 분석 설정"""
    depth: int | None = None            # 분석 깊이 (None=전체)
    large_file_threshold_mb: int = 500
    old_file_days: int = 365            # N일 이상 된 파일을 '오래된' 것으로 분류

class DSFolderFitConfig(BaseModel):
    folders: list[ManagedFolder] = [    # ★ 멀티 폴더 관리
        ManagedFolder(path=Path.home() / "Downloads", label="다운로드")
    ]
    categories: list[CategoryRule] = []  # 기본 카테고리 자동 로드
    duplicates: DuplicateConfig = DuplicateConfig()
    watch: WatchConfig = WatchConfig()
    rename: RenameConfig = RenameConfig()
    analyze: AnalyzeConfig = AnalyzeConfig()
    size_threshold_mb: int = 500
    use_trash: bool = True
    date_format: str = "monthly"
    log_level: str = "INFO"
```

---

## 3. 아키텍처 설계

### 3.1 전체 구조

```
dsff/
├── pyproject.toml           # 프로젝트 메타데이터 및 의존성
├── README.md
├── src/
│   └── dsff/
│       ├── __init__.py
│       ├── __main__.py      # python -m dsff 진입점
│       ├── cli.py           # Typer CLI 정의
│       ├── config.py        # Pydantic 설정 모델
│       ├── core/
│       │   ├── __init__.py
│       │   ├── scanner.py   # 파일 스캔/발견
│       │   ├── analyzer.py  # ★ 폴더 분석/건강도 점수
│       │   ├── classifier.py # 파일 분류 엔진
│       │   ├── organizer.py # 정리 실행 로직
│       │   ├── renamer.py   # 생성일 기반 리네임
│       │   ├── duplicates.py # 중복 감지
│       │   ├── folder_mgr.py # ★ 멀티 폴더 등록/관리
│       │   └── watcher.py   # 실시간 감시
│       ├── rules/
│       │   ├── __init__.py
│       │   ├── engine.py    # 규칙 엔진
│       │   └── defaults.py  # 기본 분류 규칙
│       ├── safety/
│       │   ├── __init__.py
│       │   ├── dryrun.py    # Dry-run 모드
│       │   ├── history.py   # 작업 이력 관리
│       │   └── undo.py      # 실행취소
│       └── utils/
│           ├── __init__.py
│           ├── platform.py  # 크로스 플랫폼 유틸
│           ├── formatting.py # Rich 출력 포매팅
│           └── hashing.py   # 해싱 유틸리티
├── tests/
│   ├── conftest.py          # pytest fixtures
│   ├── test_scanner.py
│   ├── test_classifier.py
│   ├── test_organizer.py
│   ├── test_duplicates.py
│   ├── test_watcher.py
│   └── test_rules.py
└── config/
    └── default_rules.yaml   # 기본 분류 규칙
```

### 3.2 핵심 모듈 상세 설계

#### Scanner 모듈

```python
# core/scanner.py
class FileInfo:
    """스캔된 파일의 메타데이터"""
    path: Path
    name: str
    extension: str
    size: int
    created_time: datetime
    modified_time: datetime
    accessed_time: datetime   # ★ 액세스 시간
    mime_type: Optional[str]
    mime_description: str     # ★ "Microsoft Excel 워크시트" 등
    is_symlink: bool
    inode: int

class FolderScanner:
    """폴더 스캔 및 파일 정보 수집"""

    def scan(self, target: Path, recursive: bool = False) -> list[FileInfo]:
        """대상 폴더의 모든 파일 스캔"""

    def get_statistics(self) -> FolderStats:
        """폴더 통계 (파일 수, 총 크기, 카테고리별 분포 등)"""

    def find_large_files(self, threshold_mb: int = 500) -> list[FileInfo]:
        """임계치 초과 대용량 파일 검색"""
```

#### FolderManager 모듈 ★

```python
# core/folder_mgr.py
class FolderManager:
    """멀티 폴더 등록/해제/조회"""

    def add_folder(self, path: Path, label: str,
                   auto_watch: bool = False, profile: str = "default") -> ManagedFolder:
        """새 폴더를 관리 대상으로 등록"""

    def remove_folder(self, label: str) -> bool:
        """라벨로 폴더 등록 해제"""

    def list_folders(self) -> list[ManagedFolder]:
        """등록된 모든 폴더 목록"""

    def get_folder(self, label_or_path: str) -> ManagedFolder | None:
        """라벨 또는 경로로 폴더 검색"""
```

#### Analyzer 모듈 ★

```python
# core/analyzer.py
@dataclass
class FolderAnalysis:
    """폴더 분석 결과"""
    folder_path: Path
    total_files: int
    total_size: int
    category_distribution: dict[str, CategoryStats]  # 타입별 파일수/용량
    size_distribution: dict[str, int]   # "small"/"medium"/"large" → 파일 수
    age_distribution: dict[str, int]    # "recent"/"this_month"/"this_year"/"old" → 파일 수
    duplicate_summary: DuplicateSummary  # 중복 파일 수, 낭비 용량
    depth_distribution: dict[int, int]  # 깊이별 파일 수
    health_score: int                   # 0~100 정리 건강도
    recommendations: list[str]          # 추천 작업 목록

class FolderAnalyzer:
    """폴더 심층 분석"""

    def analyze(self, target: Path, depth: int | None = None) -> FolderAnalysis:
        """폴더 전체 분석 실행"""

    def analyze_all(self, folders: list[ManagedFolder]) -> list[FolderAnalysis]:
        """등록된 모든 폴더 분석"""

    def calculate_health_score(self, analysis: FolderAnalysis) -> int:
        """정리 건강도 점수 산출 (0~100)
        - 중복율 높으면 감점
        - 미분류 파일 비율 높으면 감점
        - 1년 이상 오래된 파일 비율 높으면 감점
        - 대용량 파일 방치 시 감점
        """

    def generate_recommendations(self, analysis: FolderAnalysis) -> list[str]:
        """분석 결과 기반 추천 작업 생성"""
```

#### Classifier 모듈

```python
# core/classifier.py
class FileClassifier:
    """파일 분류 엔진"""

    def classify(self, file_info: FileInfo) -> str:
        """파일을 카테고리로 분류 (확장자 → MIME → 패턴 순)"""

    def classify_batch(self, files: list[FileInfo]) -> dict[str, list[FileInfo]]:
        """배치 분류"""

    def add_rule(self, rule: CategoryRule) -> None:
        """커스텀 규칙 추가"""
```

#### Duplicates 모듈

```python
# core/duplicates.py
class DuplicateDetector:
    """중복 파일 감지기"""

    def find_duplicates(self, files: list[FileInfo]) -> list[DuplicateGroup]:
        """3단계 파이프라인으로 중복 그룹 검색"""

    def _group_by_size(self, files) -> dict[int, list[FileInfo]]:
        """1단계: 크기 기반 그룹핑"""

    def _hash_fast(self, files) -> dict[str, list[FileInfo]]:
        """2단계: xxhash64 빠른 해싱"""

    def _hash_verify(self, files) -> dict[str, list[FileInfo]]:
        """3단계: SHA-256 정밀 검증"""

class DuplicateGroup:
    hash: str
    files: list[FileInfo]
    total_wasted_bytes: int  # (파일 수 - 1) * 파일 크기
    original: FileInfo       # 가장 오래된 파일을 원본으로 추정
```

### 3.3 실행 흐름도

```
사용자 입력: dsff organize --execute --duplicates move
    │
    ▼
[1] 설정 로드 (CLI args + YAML config + 기본값)
    │
    ▼
[2] 폴더 스캔 (Scanner)
    │ → FileInfo 목록 생성
    │ → 대용량 파일 감지
    ▼
[3] 파일 분류 (Classifier)
    │ → 카테고리별 그룹핑
    ▼
[4] 중복 검사 (DuplicateDetector)
    │ → 중복 그룹 식별
    ▼
[5] 실행 계획 생성 (Organizer)
    │ → Operation 목록 생성
    │ → 충돌 해결 (동일 이름 파일)
    ▼
[6] 미리보기 출력 (Rich 테이블)
    │ → 이동될 파일 목록
    │ → 중복 처리 목록
    │ → 대용량 파일 알림
    ▼
[7] 실행 (--execute 플래그 확인)
    │ → 파일 이동/복사
    │ → 중복 처리
    │ → 이력 기록 (JSON)
    ▼
[8] 결과 리포트 출력
```

---

## 4. 기술 스택 및 구현 방안

### 4.1 핵심 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| **typer** | ≥0.24 | CLI 프레임워크 (Click 기반, 타입 힌트 활용) |
| **rich** | ≥14.0 | 터미널 출력 포매팅 (테이블, 프로그레스 바, 컬러) |
| **pydantic** | ≥2.0 | 설정 모델 검증 |
| **watchdog** | ≥6.0 | 파일 시스템 이벤트 모니터링 |
| **filetype** | ≥1.2 | MIME 타입 감지 (의존성 없음) |
| **xxhash** | ≥4.0 | 초고속 해싱 (중복 감지) |
| **send2trash** | ≥2.0 | 안전한 휴지통 삭제 |
| **platformdirs** | ≥4.0 | 크로스 플랫폼 디렉토리 경로 |
| **humanize** | ≥4.0 | 사람이 읽기 쉬운 크기/시간 표시 |
| **loguru** | ≥0.7 | 간편한 로깅 |
| **pyyaml** | ≥6.0 | YAML 설정 파싱 |

### 4.2 개발 도구

| 도구 | 용도 |
|------|------|
| **pytest** | 단위/통합 테스트 |
| **pytest-tmp-files** | 임시 파일 테스트 fixture |
| **black** | 코드 포매팅 |
| **ruff** | 린팅 |
| **mypy** | 타입 체크 |
| **pre-commit** | Git 훅 자동화 |

### 4.3 바이브 코딩 구현 전략

바이브 코딩의 핵심은 AI와의 반복적 대화를 통해 빠르게 프로토타입을 만들고, 테스트로 검증하며, 점진적으로 완성도를 높이는 것이다.

#### Phase 1: 프로젝트 부트스트랩 (Day 1)

**AI 프롬프트 전략**:
```
"Python CLI 프로젝트를 생성해줘. pyproject.toml, src 레이아웃,
typer CLI 기본 구조, pytest 설정까지 포함. 패키지 이름은 dsff."
```

**산출물**: 실행 가능한 빈 CLI 스켈레톤

#### Phase 2: 핵심 스캐너/분류기 (Day 2-3)

**AI 프롬프트 전략**:
```
"pathlib로 폴더를 스캔해서 FileInfo 데이터클래스 목록을 반환하는
FolderScanner 클래스를 만들어줘. 확장자 기반 분류 맵은 defaults.py에
딕셔너리로 정의. pytest 테스트도 함께 작성해줘."
```

**반복 포인트**: 에지 케이스 (확장자 없는 파일, 심볼릭 링크, 권한 에러)

#### Phase 3: 중복 감지 (Day 4-5)

**AI 프롬프트 전략**:
```
"3단계 중복 감지 파이프라인을 구현해줘:
1) 파일 크기 그룹핑 2) xxhash64 해싱 3) SHA-256 검증.
대용량 파일(100MB+)은 스트리밍 해싱, 병렬 처리는 ThreadPoolExecutor.
DuplicateGroup 결과 구조체도 정의해줘."
```

**반복 포인트**: 성능 튜닝, 메모리 프로파일링

#### Phase 4: 안전 기능 + Watch 모드 (Day 6-7)

**AI 프롬프트 전략**:
```
"dry-run 모드, JSON 이력 기록, undo 기능을 구현해줘.
watchdog 기반 실시간 감시 모드도 추가.
이벤트 디바운싱 2초, .part/.crdownload 자동 제외."
```

#### Phase 5: UX 폴리싱 + 테스트 (Day 8-10)

**AI 프롬프트 전략**:
```
"Rich 라이브러리로 CLI 출력을 개선해줘:
스캔 프로그레스 바, 결과 테이블, 카테고리별 컬러 코딩,
대용량 파일 경고 패널. 통합 테스트도 작성해줘."
```

### 4.4 테스트 전략

```python
# tests/conftest.py — 테스트 공통 fixture
@pytest.fixture
def sample_downloads(tmp_path):
    """다양한 파일 타입의 테스트 폴더 생성"""
    files = {
        "photo.jpg": b"\xff\xd8\xff\xe0...",  # JPEG 매직 넘버
        "report.pdf": b"%PDF-1.4...",
        "video.mp4": b"\x00\x00\x00\x1c...",
        "song.mp3": b"ID3...",
        "archive.zip": b"PK\x03\x04...",
        "script.py": b"#!/usr/bin/env python3\n...",
        "noext": b"random content",
        "duplicate1.txt": b"same content here",
        "duplicate2.txt": b"same content here",
    }
    for name, content in files.items():
        (tmp_path / name).write_bytes(content)
    return tmp_path
```

**테스트 커버리지 목표**: 80% 이상

| 테스트 영역 | 테스트 항목 |
|------------|------------|
| Scanner | 파일 스캔, 메타데이터 수집, 심볼릭 링크, 권한 에러 |
| Analyzer | 폴더 분석, 건강도 점수, 추천 생성, 멀티 폴더 분석 |
| FolderManager | 폴더 등록/해제, 중복 등록 방지, 유효성 검증 |
| Classifier | 확장자 분류, MIME 분류, 커스텀 규칙, 미분류 파일 |
| Renamer | 날짜 접두사, 기존 접두사 감지, 이름 충돌, 크로스 플랫폼 생성일 |
| Duplicates | 크기 그룹핑, 해싱 정확도, 빈 파일, 대용량 파일 |
| Organizer | 파일 이동, 이름 충돌 해결, 폴더 생성 |
| Safety | Dry-run, 이력 기록, Undo, 휴지통 삭제 |
| Watcher | 이벤트 감지, 디바운싱, 제외 패턴 |
| Config | YAML 로드, 기본값, 유효성 검증 |
| Cross-platform | 경로 처리, 특수 문자 파일명 |

---

## 5. 제약사항 (Constraints)

### 5.1 기술적 제약

| 제약사항 | 영향 | 심각도 |
|---------|------|--------|
| **Windows MAX_PATH (260자)** | 깊은 중첩 폴더에서 경로 초과 가능 | 중 |
| **파일 잠금 (Windows)** | 사용 중인 파일 이동/삭제 불가 | 상 |
| **심볼릭 링크 순환 참조** | 무한 루프 위험 | 상 |
| **대용량 파일 해싱 시간** | 수 GB 파일은 해싱에 수십 초 소요 | 중 |
| **Watchdog kqueue (macOS)** | 깊은 중첩 디렉토리에서 성능 저하 | 하 |
| **네트워크 드라이브** | 파일 감시 신뢰성 낮음 | 중 |
| **파일 인코딩 차이** | Windows(CP1252) vs Unix(UTF-8) 파일명 | 하 |
| **권한 문제** | 루트 권한 없이 시스템 파일 접근 불가 | 중 |

### 5.2 플랫폼별 제약

#### Windows
- 예약 파일명: CON, PRN, AUX, NUL, COM1-9, LPT1-9
- 파일명 대소문자 미구분 (NTFS)
- `\\?\` 접두사 없이 260자 경로 제한
- 파일 사용 중 잠금 (mandatory locking)

#### macOS
- .DS_Store 파일 자동 생성 (무시 필요)
- FSEvents API의 이벤트 배칭 (약간의 지연)
- HFS+/APFS 대소문자 미구분 가능

#### Linux
- inotify 감시 제한 (`/proc/sys/fs/inotify/max_user_watches`)
- SELinux/AppArmor 파일 접근 제한 가능
- 다양한 파일시스템 특성 (ext4, btrfs, zfs 등)

### 5.3 사용자 경험 제약

| 제약 | 설명 |
|------|------|
| CLI 전용 | GUI 없이 터미널만 지원 (Phase 1) |
| Python 의존성 | Python 3.9+ 설치 필요 |
| 초기 학습 곡선 | CLI 명령어 익숙하지 않은 사용자 |
| 실시간 모드 리소스 | Watch 모드 상시 실행 시 CPU/메모리 소비 |

---

## 6. 극복 방안 (Mitigation Strategies)

### 6.1 Windows MAX_PATH 제한 극복

```python
# utils/platform.py
import sys

def safe_path(path: Path) -> Path:
    """Windows에서 긴 경로 처리"""
    if sys.platform == "win32":
        str_path = str(path.resolve())
        if len(str_path) > 250 and not str_path.startswith("\\\\?\\"):
            return Path(f"\\\\?\\{str_path}")
    return path
```

추가 조치: 정리 시 폴더 중첩 깊이를 최대 3단계로 제한하는 옵션 제공.

### 6.2 파일 잠금 문제 극복

```python
# utils/platform.py
import time

def safe_move(source: Path, dest: Path, retries: int = 3, delay: float = 1.0) -> bool:
    """재시도 로직이 포함된 안전한 파일 이동"""
    for attempt in range(retries):
        try:
            shutil.move(str(source), str(dest))
            return True
        except PermissionError:
            if attempt < retries - 1:
                logger.warning(f"파일 잠금 감지, {delay}초 후 재시도: {source.name}")
                time.sleep(delay)
            else:
                logger.error(f"파일 이동 실패 (잠금): {source.name}")
                return False
    return False
```

Watch 모드에서는 `on_closed` 이벤트를 우선 활용하여 다운로드 완료 후 정리.

### 6.3 심볼릭 링크 순환 참조 방지

```python
# core/scanner.py
def scan_safe(self, target: Path, _seen_inodes: set = None) -> list[FileInfo]:
    """순환 참조 방지 스캔"""
    if _seen_inodes is None:
        _seen_inodes = set()

    stat = target.stat()
    inode_key = (stat.st_dev, stat.st_ino)

    if inode_key in _seen_inodes:
        logger.warning(f"순환 참조 감지, 건너뛰기: {target}")
        return []

    _seen_inodes.add(inode_key)
    # ... 스캔 계속
```

### 6.4 대용량 파일 해싱 성능 최적화

```python
# utils/hashing.py
from concurrent.futures import ThreadPoolExecutor, as_completed

def hash_files_optimized(files: list[Path], max_workers: int = 4) -> dict[Path, str]:
    """최적화된 병렬 해싱"""
    results = {}

    # 크기별 분류: 소형(<10MB)은 메모리, 대형은 스트리밍
    small_files = [f for f in files if f.stat().st_size < 10_000_000]
    large_files = [f for f in files if f.stat().st_size >= 10_000_000]

    # 소형 파일: 병렬 처리
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(hash_file_memory, f): f for f in small_files}
        for future in as_completed(futures):
            path = futures[future]
            results[path] = future.result()

    # 대형 파일: 스트리밍 + 프로그레스 바
    for f in large_files:
        results[f] = hash_file_streaming(f, chunk_size=1_048_576)  # 1MB 청크

    return results

def hash_file_streaming(path: Path, chunk_size: int = 8192) -> str:
    """스트리밍 해싱 (메모리 효율적)"""
    hasher = xxhash.xxh64()
    with open(path, 'rb') as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()
```

### 6.5 네트워크 드라이브 대응

```python
# core/watcher.py
def start_watch(self, target: Path):
    """네트워크 드라이브 감지 및 폴백"""
    if self._is_network_path(target):
        logger.warning("네트워크 드라이브 감지 → 폴링 모드로 전환")
        from watchdog.observers.polling import PollingObserver
        self.observer = PollingObserver(timeout=5)
    else:
        self.observer = Observer()
```

### 6.6 크로스 플랫폼 파일명 안전 처리

```python
# utils/platform.py
import re, sys

WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL"} | {
    f"{p}{n}" for p in ("COM", "LPT") for n in range(1, 10)
}

def sanitize_filename(name: str) -> str:
    """크로스 플랫폼 안전한 파일명 생성"""
    # 불법 문자 제거
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)

    # Windows 예약명 처리
    if sys.platform == "win32":
        stem = Path(name).stem.upper()
        if stem in WINDOWS_RESERVED:
            name = f"_{name}"

    # 앞뒤 공백/점 제거
    name = name.strip('. ')

    return name or "unnamed"
```

### 6.7 inotify 감시 제한 극복 (Linux)

```python
# 시작 시 inotify 제한 확인 및 안내
def check_inotify_limit():
    """Linux inotify 제한 확인"""
    try:
        with open('/proc/sys/fs/inotify/max_user_watches') as f:
            limit = int(f.read().strip())
        if limit < 65536:
            logger.warning(
                f"inotify 감시 제한이 낮습니다 ({limit}). "
                f"다음 명령으로 늘릴 수 있습니다:\n"
                f"  sudo sysctl fs.inotify.max_user_watches=524288"
            )
    except FileNotFoundError:
        pass  # Linux가 아닌 경우
```

### 6.8 사용자 경험 개선 전략

| 제약 | 극복 방안 |
|------|----------|
| CLI 전용 | Rich 라이브러리로 시각적 피드백 극대화 (테이블, 패널, 프로그레스 바, 트리) |
| Python 의존성 | PyInstaller로 독립 실행 파일 빌드 옵션 제공 |
| 학습 곡선 | `dsff --help` 한국어 도움말 + `dsff wizard` 대화형 설정 모드 |
| 리소스 소비 | Watch 모드 CPU/메모리 모니터링, 비활성 시 자동 절전 |

---

## 7. 바이브 코딩 실행 가이드

### 7.1 프롬프트 엔지니어링 원칙

바이브 코딩에서 AI에게 효과적으로 작업을 지시하기 위한 원칙:

**컨텍스트 엔지니어링**: 단순 프롬프트가 아닌, 기존 코드/패턴/아키텍처를 함께 제공하여 AI가 일관된 코드를 생성하도록 유도.

**구체적 명세**: "파일 정리 기능을 만들어줘"(X) → "pathlib 기반 FolderScanner 클래스를 만들어줘. scan() 메서드는 FileInfo 데이터클래스 리스트를 반환하고, 심볼릭 링크는 resolve()로 처리해줘."(O)

**테스트 우선**: 모든 기능 요청 시 pytest 테스트를 함께 요청. AI가 생성한 코드를 테스트로 즉시 검증.

**점진적 반복**: 한 번에 전체를 요청하지 말고, 모듈 단위로 나누어 3-5회 반복. 각 반복에서 테스트 결과를 기반으로 수정 요청.

### 7.2 주의해야 할 함정

| 함정 | 증상 | 예방 |
|------|------|------|
| 맹목적 수용 | AI 코드를 검토 없이 반영 | 모든 출력에 대해 테스트 실행 및 코드 리뷰 |
| 컨텍스트 유실 | 대화가 길어지면 AI가 앞선 결정을 잊음 | 핵심 설계 결정을 별도 문서로 관리, 새 대화마다 공유 |
| 과도한 추상화 | AI가 불필요하게 복잡한 패턴 제안 | "가장 단순한 구현"을 명시적으로 요청 |
| 에지 케이스 누락 | Happy path만 구현 | 에지 케이스를 명시적으로 나열하여 요청 |
| 의존성 폭발 | AI가 불필요한 라이브러리 추가 | 각 의존성의 필요성을 질문, 대안 검토 |

### 7.3 개발 일정 (10일 스프린트)

```
Day 1   ▸ 프로젝트 스켈레톤 + CI 설정
Day 2-3 ▸ Scanner + Classifier 구현 + 단위 테스트
Day 4-5 ▸ DuplicateDetector 구현 + 성능 테스트
Day 6   ▸ Organizer + Safety (dry-run, undo) 구현
Day 7   ▸ Watcher (실시간 감시) 구현
Day 8   ▸ Rich UX + CLI 폴리싱
Day 9   ▸ 통합 테스트 + 크로스 플랫폼 검증
Day 10  ▸ 문서화 + PyPI 배포 준비
```

---

## 8. 데스크톱 GUI 설계 — Windows 탐색기 스타일

> **설계 원칙**: Windows 11 파일 탐색기와 동일한 UI 패턴을 적용하여, 사용자가 별도 학습 없이 즉시 사용할 수 있도록 한다. 모든 CLI 명령어는 GUI에 내장되어 터미널 없이도 전체 기능을 사용할 수 있다.

### 8.1 GUI 프레임워크 선정

> **설계 시점 검토 (2026-03-27)**: 초기 PySide6 계획에서 **Electron + React**로 전환하여 구현 완료.

| 프레임워크 | 드래그앤드롭 | 차트 | 트레이 | Python 통합 | 추천도 |
|-----------|:---------:|:---:|:-----:|:----------:|:-----:|
| **Electron + React + TypeScript** | ★★★ | ★★★ | ★★☆ | ★★★ | **실제 구현** |
| PySide6 + PyQt-Fluent-Widgets | ★★★ | ★★★ | ★★★ | ★★★ | 초기 계획 (미채택) |

**실제 구현: Electron 33 + React 19 + TypeScript + Vite**

선정 이유: Python CLI 백엔드를 그대로 재사용하면서 웹 기술(React)로 빠르게 UI를 구현할 수 있다. Electron의 `child_process.spawn()`을 통해 Python CLI를 `--json` 모드로 호출하는 IPC 브릿지 패턴을 채택하여, 기존 CLI 코드를 한 줄도 수정하지 않고 GUI를 연결했다. `electron-builder`로 Windows portable exe 배포.

### 8.2 CLI → GUI 완전 매핑

모든 CLI 명령어를 GUI에 내장하여, 터미널을 한 번도 열지 않고 전체 기능을 사용할 수 있다.

| CLI 명령어 | GUI 위치 | GUI 조작 방식 |
|-----------|---------|--------------|
| `dsff folder add PATH` | 좌측 탐색창 → `[+ 폴더 추가]` | 폴더 선택 다이얼로그 |
| `dsff folder remove` | 좌측 폴더 우클릭 → "등록 해제" | 컨텍스트 메뉴 |
| `dsff folder list` | 좌측 탐색창 | 항상 표시 |
| `dsff analyze PATH` | 커맨드바 → `📊 분석` 버튼 | 원클릭 → 분석 패널 |
| `dsff organize --execute` | 커맨드바 → `🗂 정리` 버튼 | 미리보기 → 확인 → 실행 |
| `dsff organize --by-type` | 커맨드바 → `🗂 정리 ▾` → "타입별" | 드롭다운 메뉴 |
| `dsff organize --by-date` | 커맨드바 → `🗂 정리 ▾` → "날짜별" | 드롭다운 메뉴 |
| `dsff rename --execute` | 커맨드바 → `✏ 리네임` 버튼 | 미리보기 → 확인 → 실행 |
| `dsff rename --format YYMMDD` | 리네임 패널 → 포맷 콤보박스 | 드롭다운 선택 |
| `dsff duplicates PATH` | 커맨드바 → `🔍 중복검사` 버튼 | 원클릭 → 결과 테이블 |
| `dsff duplicates --action trash` | 중복 결과 → `[🗑 휴지통으로]` | 체크박스 선택 → 버튼 |
| `dsff watch --daemon` | 커맨드바 → `👁 감시` 토글 버튼 | ON/OFF 스위치 |
| `dsff watch --delay 2.0` | 설정 → 감시 탭 → 지연 슬라이더 | 슬라이더 드래그 |
| `dsff undo` | 커맨드바 → `↩ 되돌리기` 버튼 | 원클릭 |
| `dsff config` | 좌측 하단 → `⚙ 설정` | 설정 페이지 |
| `dsff scan PATH` | 폴더 클릭 시 자동 실행 | 자동 |
| `--verbose`, `--quiet` | 하단 상태바 → 로그 패널 토글 | 클릭으로 펼침/접기 |
| `--exclude PATTERNS` | 설정 → 제외 패턴 입력칸 | 텍스트 입력 + 태그 |
| `--size-threshold` | 설정 → 대용량 임계치 스핀박스 | 숫자 입력 |

### 8.3 Windows 탐색기 스타일 메인 윈도우

#### 전체 레이아웃 (Windows 11 File Explorer 패턴)

```
┌──────────────────────────────────────────────────────────────────────┐
│  DS FolderFit                                           ─  □  ✕    │
├──────────────────────────────────────────────────────────────────────┤
│  ← → ↑  │ 📁 다운로드 > Images > 2026                │ 🔍 검색...  │
├──────────────────────────────────────────────────────────────────────┤
│  🗂 정리 ▾ │ 📊 분석 │ ✏ 리네임 │ 🔍 중복검사 │ 👁 감시 🟢 │ ↩ 되돌리기 │
├──────────┬───────────────────────────────────────────┬───────────────┤
│          │ 이름 ▾        수정한 날짜    유형    크기  │               │
│ ▼ 즐겨찾기 │─────────────────────────────────────────│  📄 미리보기   │
│  📁 다운로드│ 📁 Images     2026-03-27   폴더    ─   │               │
│  📁 바탕화면│ 📁 Documents  2026-03-26   폴더    ─   │  report.pdf   │
│  📁 업무자료│ 📁 Videos     2026-03-25   폴더    ─   │               │
│          │ 📄 todo.txt   2026-03-27   텍스트  2KB  │  수정: 03-27  │
│ ▼ 내 PC   │ 📄 note.md    2026-03-26   마크다운 5KB │  액세스: 03-27│
│  💽 C:\   │ 🖼 photo.jpg  2026-03-25   이미지  3MB  │  크기: 15KB   │
│  💽 D:\   │ 📊 data.xlsx  2026-03-24   엑셀   890KB│               │
│          │ 🎵 song.mp3   2026-03-23   오디오  4MB  │  [📂 열기]    │
│ [+ 추가]  │ 📦 backup.zip 2026-03-22   압축   1.2GB│  [🗂 정리]    │
│          │                                         │  [✏ 리네임]   │
├──────────┴───────────────────────────────────────────┴───────────────┤
│  12개 항목 │ 1개 선택 (15KB)  │ 정리점수: 32/100 🔴  │ 📊 ≡ 🔲 ▾ 줌 │
└──────────────────────────────────────────────────────────────────────┘
```

#### 영역별 상세 설명

**① 제목 표시줄** — Mica 효과가 적용된 Windows 11 스타일 제목줄. Fluent Design 둥근 모서리(8px).

**② 주소 표시줄 (Breadcrumb Navigation)**:
```
← → ↑  │ 📁 다운로드 > Images > 2026                │ 🔍 검색...
 뒤 앞 상위  클릭하면 해당 폴더로 이동                    실시간 필터링
             각 세그먼트 클릭 가능 (Breadcrumb)
             직접 경로 입력도 가능 (클릭하면 텍스트 편집 모드)
```

**③ 커맨드바 (Windows 11 간소화 툴바)** — 기존 CLI 명령어가 버튼으로 구현된 핵심 영역:
```
🗂 정리 ▾ │ 📊 분석 │ ✏ 리네임 │ 🔍 중복검사 │ 👁 감시 🟢 │ ↩ 되돌리기
   │
   └── 드롭다운:
       ├ 타입별 정리 (dsff organize --by-type)
       ├ 날짜별 정리 (dsff organize --by-date monthly)
       ├ 크기별 정리 (dsff organize --by-size)
       ├ ─────────
       └ 커스텀 규칙으로 정리...
```

**④ 탐색 창 (Navigation Pane)** — Windows 탐색기의 좌측 트리와 동일:
```
▼ 즐겨찾기                    ← 사용자 등록 폴더 (dsff folder list)
  📁 다운로드  (32/100 🔴)     ← 건강도 점수 뱃지
  📁 바탕화면  (78/100 🟡)
  📁 업무자료  (95/100 🟢)

▼ 내 PC                      ← QFileSystemModel 자동
  💽 C:\
  💽 D:\
  💽 네트워크 드라이브

[+ 폴더 추가]                  ← dsff folder add
```

**⑤ 파일 목록 (Content Area)** — QTableView + QFileSystemModel:
```
이름 ▾          수정한 날짜      유형       크기
──────────────────────────────────────────────────
📁 Images      2026-03-27     폴더       ─
📁 Documents   2026-03-26     폴더       ─
📄 todo.txt    2026-03-27     텍스트     2 KB
🖼 photo.jpg   2026-03-25     JPEG 이미지 3.2 MB
📊 data.xlsx   2026-03-24     Excel 문서  890 KB

→ 컬럼 클릭: 정렬 (이름/날짜/유형/크기)
→ 컬럼 헤더 우클릭: 컬럼 표시/숨김 (생성일, 액세스일 추가 가능)
→ 파일 호버: 수정일/액세스일/크기 툴팁 표시
→ 뷰 전환: 상세목록 / 타일 / 큰아이콘 / 목록
```

**⑥ 상세 패널 (Details Pane)** — 선택 파일의 미리보기 + 메타데이터:
```
┌─────────────┐
│  📄 미리보기  │  ← 이미지는 썸네일, PDF는 1페이지 미리보기
│             │
│ report.pdf  │
│             │
│ 수정: 03-27 │  ← 날짜 정보 (CLI 없이 바로 확인)
│ 액세스: 03-27│
│ 만든날짜: 03-01│
│ 크기: 15KB  │
│ 형식: PDF   │
│             │
│ [📂 열기]   │  ← 퀵 액션 버튼
│ [🗂 정리]   │  ← dsff organize (이 파일만)
│ [✏ 리네임]  │  ← dsff rename (이 파일만)
└─────────────┘
```

**⑦ 상태 표시줄 (Status Bar)**:
```
12개 항목 │ 1개 선택 (15KB) │ 정리점수: 32/100 🔴 │ 📊 ≡ 🔲 ▾ 줌
  파일 수    선택 요약           폴더 건강도          뷰 전환 + 확대축소
```

### 8.4 우클릭 컨텍스트 메뉴 (Windows 11 스타일)

**파일 우클릭 메뉴** — Windows 11 2단 메뉴 패턴 적용:

```
┌──────────────────────────────────┐
│  📂 열기    ✂ 잘라내기   📋 복사  │  ← 상단 아이콘 행 (빠른 접근)
│  📝 이름변경  🗑 삭제            │
├──────────────────────────────────┤
│  🗂 정리                    ▶   │  ← DS FolderFit 전용
│     ├ 타입별 폴더로 이동          │
│     ├ 날짜별 폴더로 이동          │
│     └ 커스텀 규칙 적용...        │
│  ✏ 생성일 리네임             ▶   │
│     ├ YYMMDD_파일명 (250415_...) │
│     ├ YYYYMMDD_파일명            │
│     └ YYYY-MM-DD_파일명          │
│  📊 이 파일 분석                  │  ← 파일 상세 정보 표시
│  🔍 중복 파일 찾기                │  ← 이 파일과 동일한 파일 검색
├──────────────────────────────────┤
│  📄 속성                         │  ← 날짜/크기/해시 상세 다이얼로그
│  ─────────────────────────────── │
│  ⋯ 더 보기                       │  ← Windows 11 스타일 확장 메뉴
└──────────────────────────────────┘
```

**폴더 빈 공간 우클릭 메뉴**:
```
┌──────────────────────────────────┐
│  📊 이 폴더 분석                  │  ← dsff analyze
│  🗂 전체 정리                ▶   │  ← dsff organize
│  🔍 중복 파일 전체 검사           │  ← dsff duplicates
│  ✏ 전체 리네임                   │  ← dsff rename
├──────────────────────────────────┤
│  📁 새 폴더 만들기                │
│  🔄 새로 고침                    │
│  📋 붙여넣기                     │
├──────────────────────────────────┤
│  🖥 보기                    ▶   │
│     ├ 상세 목록                   │
│     ├ 타일                       │
│     ├ 큰 아이콘                   │
│     └ 목록                       │
│  📊 정렬                    ▶   │
│     ├ 이름 / 날짜 / 유형 / 크기   │
│     └ 그룹화: 유형별 / 날짜별     │
└──────────────────────────────────┘
```

### 8.5 분석 오버레이 패널

커맨드바의 `📊 분석` 버튼을 클릭하면 메인 뷰 위에 오버레이 패널이 나타난다 (Fluent Flyout 스타일).

```
┌──────────────────────────────────────────────────────────────┐
│  📊 폴더 분석: 다운로드                           [✕ 닫기]   │
├──────────────────────┬───────────────────────────────────────┤
│                      │                                       │
│  정리 건강도          │   파일 타입 분포        날짜 분포       │
│  ┌────────────┐     │  ┌──────────┐  ┌──────────────┐      │
│  │            │     │  │          │  │ ████ 최근7일  │      │
│  │   32/100   │     │  │ [파이차트] │  │ ██   이번달   │      │
│  │    🔴      │     │  │          │  │ █    올해     │      │
│  │            │     │  └──────────┘  │ ███  1년이상  │      │
│  └────────────┘     │                 └──────────────┘      │
│                      │                                       │
│  총 파일: 1,247개     │   크기 분포 (바 차트)                  │
│  총 용량: 28.3 GB     │  ┌────────────────────────────────┐  │
│  중복: 89개 (2.1GB)   │  │ ████████ 소형(<1MB)   672개    │  │
│  대용량: 12개 (9.8GB) │  │ █████    중형(1-100MB) 530개   │  │
│                      │  │ ██       대형(100MB+)  45개    │  │
│  ⚠ 문제 발견          │  └────────────────────────────────┘  │
│  ├ 중복 89개 (2.1GB)  │                                       │
│  ├ 대용량 12개 (9.8GB)│                                       │
│  └ 1년+ 오래된 342개  │                                       │
├──────────────────────┴───────────────────────────────────────┤
│  💡 [원클릭 정리 ▶]  [중복 제거]  [리네임]  [리포트 내보내기]  │
└──────────────────────────────────────────────────────────────┘
```

### 8.6 파일 정리 미리보기 (Before/After 분할뷰)

`🗂 정리` 실행 시 즉시 정리하지 않고, 미리보기 모드가 먼저 표시된다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  🗂 정리 미리보기 — 다운로드                               [✕ 닫기]  │
├───────────────────────────────┬──────────────────────────────────────┤
│  📁 현재 (Before)              │  📁 정리 후 (After)                  │
│  ┌─────────────────────────┐  │  ┌──────────────────────────────┐   │
│  │ Downloads/              │  │  │ Downloads/                   │   │
│  │  ├ photo1.jpg      3MB  │  │  │  ├ 📁 Images/           11MB │   │
│  │  ├ report.pdf     15KB  │→→│  │  │  ├ photo1.jpg              │   │
│  │  ├ photo2.png      8MB  │  │  │  │  └ photo2.png              │   │
│  │  ├ movie.mp4     1.2GB  │  │  │  ├ 📁 Documents/        15KB │   │
│  │  ├ song.mp3       4MB   │  │  │  │  └ report.pdf              │   │
│  │  ├ data.xlsx     890KB  │  │  │  ├ 📁 Videos/          1.2GB │   │
│  │  ├ backup.zip    1.8GB  │  │  │  │  └ movie.mp4               │   │
│  │  └ script.py      2KB   │  │  │  ├ 📁 Audio/            4MB  │   │
│  │                         │  │  │  │  └ song.mp3                │   │
│  │  8개 파일, 3.9GB         │  │  │  ├ 📁 Spreadsheets/   890KB │   │
│  └─────────────────────────┘  │  │  │  └ data.xlsx               │   │
│                               │  │  ├ 📁 Archives/        1.8GB │   │
│  정리 옵션:                    │  │  │  └ backup.zip              │   │
│  ☑ 타입별 분류                 │  │  └ 📁 Code/             2KB  │   │
│  ☑ 생성일 리네임 [YYMMDD ▾]   │  │     └ script.py               │   │
│  ☐ 중복 파일 처리              │  └──────────────────────────────┘   │
│  ☐ 대용량 파일 분리            │  6개 폴더 생성, 8개 파일 이동         │
├───────────────────────────────┴──────────────────────────────────────┤
│  이동: 8개  │  생성: 6폴더  │  리네임: 8개  │  삭제: 0개              │
│                                                                      │
│        [🟢 정리 실행]     [↩ 되돌리기]     [취소]                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.7 GUI 아키텍처 (Windows 탐색기 패턴)

```
dsff/
├── src/dsff/
│   ├── core/                    # 기존 코어 (CLI/GUI 공유)
│   ├── cli.py                   # CLI 인터페이스 (유지)
│   └── gui/
│       ├── __init__.py
│       ├── app.py               # MSFluentWindow 진입점
│       ├── main_window.py       # 메인 윈도우 (탐색기 레이아웃)
│       ├── explorer/            # ★ Windows 탐색기 핵심 컴포넌트
│       │   ├── navigation_pane.py   # 좌측 폴더 트리 (QTreeView)
│       │   ├── address_bar.py       # Breadcrumb 주소 표시줄
│       │   ├── command_bar.py       # 커맨드바 (CLI→GUI 매핑)
│       │   ├── file_view.py         # 파일 목록 (QTableView/QListView)
│       │   ├── details_pane.py      # 우측 상세 패널 (메타데이터+미리보기)
│       │   ├── status_bar.py        # 하단 상태바
│       │   └── context_menu.py      # 우클릭 컨텍스트 메뉴
│       ├── panels/              # ★ 기능별 오버레이 패널
│       │   ├── analyze_panel.py     # 폴더 분석 (dsff analyze)
│       │   ├── preview_panel.py     # 정리 미리보기 (Before/After)
│       │   ├── duplicate_panel.py   # 중복 검사 결과
│       │   ├── rename_panel.py      # 리네임 미리보기
│       │   └── watch_panel.py       # 실시간 감시 로그
│       ├── dialogs/
│       │   ├── oobe_wizard.py       # 첫 실행 위자드
│       │   ├── settings_dialog.py   # 설정 (dsff config)
│       │   ├── folder_add_dialog.py # 폴더 등록 (dsff folder add)
│       │   └── properties_dialog.py # 파일 속성 (날짜/해시 상세)
│       ├── workers/             # QThread 백그라운드 작업
│       │   ├── scan_worker.py
│       │   ├── organize_worker.py
│       │   ├── analyze_worker.py
│       │   ├── duplicate_worker.py
│       │   ├── rename_worker.py
│       │   └── watch_worker.py
│       ├── models/
│       │   ├── file_model.py        # QFileSystemModel 확장
│       │   └── folder_model.py      # 등록 폴더 모델
│       ├── delegates/
│       │   ├── file_delegate.py     # 파일 아이콘/썸네일 커스텀 렌더링
│       │   └── tooltip_delegate.py  # 날짜 정보 툴팁
│       ├── resources/
│       │   ├── icons/               # Fluent Design 아이콘
│       │   ├── themes/              # 라이트/다크 테마 QSS
│       │   └── i18n/               # 다국어 (ko, en)
│       └── tray/
│           └── system_tray.py       # 시스템 트레이
```

#### GUI-Core 분리 원칙

```
┌───────────────────────────────────────────────────┐
│           GUI Layer (PySide6 + Fluent Widgets)     │
│  ┌────────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ Explorer   │ │ Panels   │ │ Dialogs         │ │
│  │ Components │ │ (분석,   │ │ (설정, OOBE,    │ │
│  │ (탐색기)   │ │  미리보기)│ │  속성)          │ │
│  └─────┬──────┘ └────┬─────┘ └───────┬─────────┘ │
│        │ Signal/Slot │               │            │
│  ┌─────▼─────────────▼───────────────▼──────────┐ │
│  │           QThread Workers (비동기)            │ │
│  └──────────────────┬───────────────────────────┘ │
└─────────────────────┼─────────────────────────────┘
                      │ 함수 호출
┌─────────────────────▼─────────────────────────────┐
│              Core Layer (Python)                   │
│  Scanner │ Analyzer │ Classifier │ Organizer      │
│  Renamer │ Duplicates │ FolderMgr │ Watcher       │
│  CLI와 GUI가 동일한 코어를 공유                     │
└───────────────────────────────────────────────────┘
```

### 8.8 핵심 위젯 구현

#### 8.8.1 커맨드바 (Command Bar) — CLI 명령어의 GUI 진입점

```python
# gui/explorer/command_bar.py
from qfluentwidgets import CommandBar, Action, FluentIcon as FIF
from PySide6.QtCore import Signal

class DSCommandBar(CommandBar):
    """Windows 11 스타일 커맨드바 — 모든 CLI 명령어를 버튼으로 제공"""

    organize_requested = Signal(str)    # dsff organize --by-type/date/size
    analyze_requested = Signal()        # dsff analyze
    rename_requested = Signal()         # dsff rename
    duplicates_requested = Signal()     # dsff duplicates
    watch_toggled = Signal(bool)        # dsff watch --daemon
    undo_requested = Signal()           # dsff undo

    def __init__(self, parent=None):
        super().__init__(parent)

        # 🗂 정리 (드롭다운 메뉴)
        organize_action = Action(FIF.FOLDER, "정리")
        organize_menu = RoundMenu(parent=self)
        organize_menu.addAction(Action("타입별 정리", triggered=lambda: self.organize_requested.emit("type")))
        organize_menu.addAction(Action("날짜별 정리", triggered=lambda: self.organize_requested.emit("date")))
        organize_menu.addAction(Action("크기별 정리", triggered=lambda: self.organize_requested.emit("size")))
        organize_menu.addSeparator()
        organize_menu.addAction(Action("커스텀 규칙...", triggered=lambda: self.organize_requested.emit("custom")))
        organize_action.setMenu(organize_menu)
        self.addAction(organize_action)

        # 📊 분석
        self.addAction(Action(FIF.PIE_SINGLE, "분석", triggered=self.analyze_requested))

        # ✏ 리네임
        self.addAction(Action(FIF.EDIT, "리네임", triggered=self.rename_requested))

        # 🔍 중복검사
        self.addAction(Action(FIF.SEARCH, "중복검사", triggered=self.duplicates_requested))

        self.addSeparator()

        # 👁 감시 (토글)
        self.watch_action = Action(FIF.VIEW, "감시")
        self.watch_action.setCheckable(True)
        self.watch_action.toggled.connect(self.watch_toggled)
        self.addAction(self.watch_action)

        # ↩ 되돌리기
        self.addAction(Action(FIF.RETURN, "되돌리기", triggered=self.undo_requested))
```

#### 8.8.2 탐색 창 (Navigation Pane)

```python
# gui/explorer/navigation_pane.py
from qfluentwidgets import TreeWidget, NavigationTreeWidget
from PySide6.QtWidgets import QFileSystemModel

class NavigationPane(QWidget):
    """Windows 탐색기 좌측 폴더 트리"""

    folder_selected = Signal(Path)

    def __init__(self, folder_manager, parent=None):
        super().__init__(parent)
        self.folder_mgr = folder_manager

        # 즐겨찾기 (등록된 폴더)
        self.favorites_tree = TreeWidget()
        self._populate_favorites()

        # 내 PC (전체 파일 시스템)
        self.fs_model = QFileSystemModel()
        self.fs_model.setRootPath("")
        self.fs_tree = TreeWidget()
        self.fs_tree.setModel(self.fs_model)

        # [+ 폴더 추가] 버튼
        self.add_button = PushButton("+ 폴더 추가")
        self.add_button.clicked.connect(self._add_folder_dialog)

    def _populate_favorites(self):
        """등록된 폴더 목록을 즐겨찾기에 표시"""
        for folder in self.folder_mgr.list_folders():
            item = QTreeWidgetItem([f"{folder.label}"])
            # 건강도 점수 뱃지 표시
            if folder.health_score is not None:
                badge = "🟢" if folder.health_score >= 70 else "🟡" if folder.health_score >= 40 else "🔴"
                item.setText(0, f"{folder.label}  {badge} {folder.health_score}")
            self.favorites_tree.addTopLevelItem(item)
```

#### 8.8.3 파일 목록 (File View) — 날짜 툴팁 포함

```python
# gui/explorer/file_view.py
from PySide6.QtWidgets import QTableView, QHeaderView
from PySide6.QtCore import Qt

class FileView(QTableView):
    """Windows 탐색기 스타일 파일 목록 (Details/Tiles/Icons 뷰 지원)"""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setSelectionMode(QTableView.ExtendedSelection)  # Ctrl/Shift 다중 선택
        self.setDragEnabled(True)
        self.setAcceptDrops(True)
        self.setDropIndicatorShown(True)
        self.setSortingEnabled(True)  # 컬럼 클릭으로 정렬

        # 컬럼 설정 (이름, 수정일, 유형, 크기 + 숨김: 생성일, 액세스일)
        header = self.horizontalHeader()
        header.setSectionsMovable(True)
        header.setContextMenuPolicy(Qt.CustomContextMenu)
        header.customContextMenuRequested.connect(self._show_column_menu)

    def viewportEvent(self, event):
        """★ 파일 호버 시 날짜 정보 툴팁"""
        if event.type() == event.Type.ToolTip:
            index = self.indexAt(event.pos())
            if index.isValid():
                file_info = self.model().get_file_info(index)
                tooltip = self._build_date_tooltip(file_info)
                QToolTip.showText(event.globalPos(), tooltip, self)
                return True
        return super().viewportEvent(event)

    def _build_date_tooltip(self, info) -> str:
        """수정일/액세스일/크기 툴팁 HTML"""
        return f"""
        <table style='font-size:12px; padding:6px;'>
          <tr><td colspan='2'><b>{info.name}</b></td></tr>
          <tr><td colspan='2'><hr/></td></tr>
          <tr><td>만든 날짜:</td><td>{info.created_time:%Y-%m-%d %p %I:%M}</td></tr>
          <tr><td><b>수정한 날짜:</b></td><td><b>{info.modified_time:%Y-%m-%d %p %I:%M}</b></td></tr>
          <tr><td>액세스 날짜:</td><td>{info.accessed_time:%Y-%m-%d %p %I:%M}</td></tr>
          <tr><td colspan='2'><hr/></td></tr>
          <tr><td>크기:</td><td>{humanize.naturalsize(info.size)}</td></tr>
          <tr><td>형식:</td><td>{info.mime_description}</td></tr>
        </table>
        """

    def _show_column_menu(self, pos):
        """컬럼 헤더 우클릭 → 표시할 컬럼 선택"""
        menu = RoundMenu(self)
        for col_name in ["이름", "수정한 날짜", "만든 날짜", "액세스 날짜", "유형", "크기"]:
            action = Action(col_name, checkable=True)
            action.setChecked(not self.isColumnHidden(col_index))
            menu.addAction(action)
        menu.exec(self.mapToGlobal(pos))
```

#### 8.8.4 주소 표시줄 (Breadcrumb)

```python
# gui/explorer/address_bar.py
from qfluentwidgets import BreadcrumbBar

class AddressBar(QWidget):
    """Windows 11 스타일 Breadcrumb 주소 표시줄"""

    path_changed = Signal(Path)

    def __init__(self, parent=None):
        super().__init__(parent)

        # ← → ↑ 네비게이션 버튼
        self.back_btn = ToolButton(FluentIcon.LEFT_ARROW)
        self.forward_btn = ToolButton(FluentIcon.RIGHT_ARROW)
        self.up_btn = ToolButton(FluentIcon.UP)

        # Breadcrumb 경로 (클릭 가능)
        self.breadcrumb = BreadcrumbBar()
        self.breadcrumb.currentItemChanged.connect(self._on_breadcrumb_click)

        # 🔍 검색 (실시간 필터)
        self.search_box = SearchLineEdit()
        self.search_box.textChanged.connect(self._filter_files)

    def set_path(self, path: Path):
        """경로 변경 시 Breadcrumb 갱신"""
        parts = path.parts  # ('C:\\', 'Users', 'sds', 'Downloads')
        self.breadcrumb.clear()
        for part in parts:
            self.breadcrumb.addItem(part)
```

### 8.9 초보 사용자 UX 전략

#### 첫 실행 경험 (OOBE)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│      🎉 DS FolderFit에 오신 것을 환영합니다!       │
│                                                  │
│   어떤 폴더든 깔끔하게 분석하고 정리해드립니다.    │
│                                                  │
│   1단계: 정리할 폴더를 선택하세요 (여러 개 가능)   │
│         ☑ 📁 다운로드  (~/Downloads)              │
│         ☐ 📁 바탕화면  (~/Desktop)                │
│         ☐ 📁 문서      (~/Documents)              │
│         [+ 다른 폴더 추가...]                     │
│                                                  │
│   2단계: 시작!                                    │
│         [📊 먼저 분석하기]  [✨ 미리보기 후 정리]   │
│                                                  │
│   ☐ 자동 감시 모드 활성화 (새 파일 자동 정리)      │
│                                                  │
│           [건너뛰기]          [시작하기 →]         │
└──────────────────────────────────────────────────┘
```

#### UX 안전장치 & 접근성

| 원칙 | 구현 |
|------|------|
| **실수 방지** | 모든 정리/리네임/삭제 전 미리보기 필수 + 확인 다이얼로그 |
| **되돌리기** | 커맨드바에 `↩ 되돌리기` 항상 노출. Ctrl+Z 단축키 |
| **안전 삭제** | 영구 삭제 없음, 모든 삭제는 send2trash로 휴지통 이동 |
| **상태 표시** | 하단 상태바에 파일수, 선택 요약, 건강도 점수, 감시 상태 상시 표시 |
| **날짜 즉시 확인** | 파일에 마우스 올리면 수정일/액세스일 툴팁 (CLI 없이) |
| **키보드** | Tab 네비게이션, Ctrl+C/V/Z, F2(이름변경), F5(새로고침), F1(도움말) |
| **다크 모드** | 시스템 테마 자동 연동 (Fluent Widgets 내장) |
| **한국어 기본** | 모든 메뉴/툴팁/다이얼로그 한국어, Qt Linguist로 영어 추가 |

### 8.10 GUI 추가 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| **PySide6** | ≥6.6 | Qt 위젯, 차트, 시스템 트레이 |
| **PySide6-Fluent-Widgets** | ≥1.7 | Windows 11 Fluent Design 컴포넌트 |
| **PySide6-Addons** | ≥6.6 | QChart 등 추가 모듈 |
| **Pillow** | ≥10.0 | 이미지 썸네일 미리보기 |
| **PyInstaller** | ≥6.0 | 독립 실행 파일(.exe) 빌드 |

### 8.11 GUI 제약사항 및 극복 방안

| 제약사항 | 극복 방안 |
|---------|----------|
| PySide6 번들 크기 (50-100MB) | PyInstaller `--onefile` + UPX 압축 → 30-50MB |
| QThread 데드락 위험 | Signal/Slot 엄격 준수, 코어에서 GUI 직접 접근 금지 |
| Fluent Widgets GPLv3 라이선스 | 비상용은 무료, 상용 시 라이선스 구매 또는 자체 QSS |
| 고해상도(HiDPI) 디스플레이 흐림 | `setHighDpiScaleFactorRoundingPolicy()` 설정 |
| 초보자 Python 설치 장벽 | PyInstaller로 `.exe` 원클릭 설치 파일 제공 |

### 8.12 GUI 바이브 코딩 전략 (10일 스프린트)

```
Day 11  ▸ MSFluentWindow 스켈레톤 + 3영역 레이아웃(탐색창/파일뷰/상세패널)
Day 12  ▸ NavigationPane(폴더 트리) + AddressBar(Breadcrumb) + QFileSystemModel
Day 13  ▸ CommandBar(CLI→GUI 매핑) + 정리/분석/리네임/중복검사 버튼 연결
Day 14  ▸ FileView(QTableView) + 날짜 툴팁 + 컬럼 정렬 + 뷰 전환
Day 15  ▸ ContextMenu(우클릭 메뉴) + 상세 패널(미리보기+메타데이터)
Day 16  ▸ AnalyzePanel(분석 오버레이) + QChart 대시보드
Day 17  ▸ PreviewPanel(Before/After 분할뷰) + DuplicatePanel
Day 18  ▸ WatchPanel(실시간 로그) + 시스템 트레이 + 알림
Day 19  ▸ OOBE 위자드 + 설정 다이얼로그 + 다크모드 + 한국어
Day 20  ▸ PyInstaller .exe 빌드 + 크로스 플랫폼 테스트
```

**AI 프롬프트 예시 (Day 11)**:
```
"PySide6 + PyQt-Fluent-Widgets로 Windows 11 탐색기 스타일의
DS FolderFit 메인 윈도우를 만들어줘.
MSFluentWindow 기반, QSplitter로 3영역 분할:
좌측 NavigationPane(TreeWidget), 중앙 FileView(QTableView),
우측 DetailsPane. 상단에 Breadcrumb AddressBar + CommandBar.
하단 StatusBar에 파일수, 선택 요약, 건강도 점수 표시.
최소 크기 1024x768, Mica 효과 적용."
```

---

## 9. 향후 확장 로드맵

### Phase 1 (v1.0) — Python CLI ✅ 완료
- Typer CLI + Rich 출력 (모든 커맨드 구현)
- 멀티 폴더 관리, 분석, 정리, 리네임, 중복검사, 감시, 되돌리기
- PyInstaller 독립 실행 파일 (`dsff.exe`)
- YAML 프로필 시스템 (by-date, by-type, by-subject)

### Phase 1.1 (v1.1) — Electron GUI ✅ 완료 (2026-03-28)
- Electron + React + TypeScript 데스크톱 GUI
- Python CLI `--json` 출력 모드 + Electron IPC 브릿지
- Windows 탐색기 스타일 UI (파일 목록, 주소창, 네비게이션 등)
- 6대 기능 GUI 연동: 정리, 분석, 리네임, 중복검사, 감시, 되돌리기
- 정리 미리보기: 폴더명 인라인 편집, 파일 드래그앤드롭 이동, 파일 제외
- 관리폴더 서브폴더 트리 확장 (최대 3단계)
- 파일 더블클릭 → OS 기본 연결 프로그램으로 열기
- 작업 완료 모달 다이얼로그 알림
- electron-builder portable exe 배포

### Phase 2 (v2.0) — 고급 기능
- 시스템 트레이 상주 모드 + 자동 시작
- 파일 태깅 시스템
- 정리 스케줄러 (주기적 자동 정리)
- 사용 통계 대시보드 (일별/주별 정리 현황)

### Phase 3 (v3.0) — 클라우드 + AI
- 클라우드 스토리지 연동 (Google Drive, Dropbox)
- AI 기반 파일명 분석 (LLM 연동)
- 사용 패턴 학습 (자주 접근하는 파일 우선 정리)
- 팀 공유 규칙 (조직 단위 정리 정책)
- 플러그인 시스템

---

## 10. 구현 현황 (2026-03-28 기준)

### 10.1 아키텍처 — 실제 구현

```
dsff/
├── src/dsff/                    ← Python CLI 백엔드
│   ├── cli.py                   # Typer CLI + --json 출력 모드
│   ├── config.py                # Pydantic 설정 모델
│   ├── core/
│   │   ├── scanner.py           # 파일 스캔 (FileInfo 데이터클래스)
│   │   ├── analyzer.py          # 폴더 분석 + 건강도 점수 (0~100)
│   │   ├── classifier.py        # 확장자/MIME 기반 분류 엔진
│   │   ├── organizer.py         # 정리 실행 (plan → execute 2단계)
│   │   ├── renamer.py           # 생성일 접두사 리네임
│   │   ├── duplicates.py        # 3단계 중복 감지 (크기→xxhash→SHA256)
│   │   ├── watcher.py           # watchdog 실시간 감시 + NDJSON 스트림
│   │   └── folder_mgr.py        # 폴더 등록/해제/목록
│   ├── safety/
│   │   ├── history.py           # JSON 이력 기록
│   │   └── undo.py              # 작업 되돌리기 (이동/리네임 역순)
│   ├── rules/
│   │   ├── engine.py            # 분류 규칙 엔진
│   │   └── loader.py            # YAML 프로필 로더
│   └── utils/
│       └── formatting.py        # Rich 출력 포매팅
│
├── webapp/                      ← Electron GUI 프론트엔드
│   ├── electron/
│   │   ├── main.cjs             # Electron 메인 프로세스 + IPC 핸들러
│   │   └── preload.cjs          # contextBridge API 노출
│   ├── src/
│   │   ├── App.tsx              # 메인 앱 (상태 관리 + CLI 연동)
│   │   ├── types.ts             # TypeScript 인터페이스
│   │   ├── electron.d.ts        # Window.electronAPI 타입 선언
│   │   ├── services/fsService.ts # 파일시스템 서비스
│   │   └── components/
│   │       ├── TitleBar.tsx      # 커스텀 타이틀바
│   │       ├── AddressBar.tsx    # 경로 네비게이션 (뒤로/앞으로/상위)
│   │       ├── CommandBar.tsx    # 기능 버튼 (정리/분석/리네임/중복/감시/되돌리기)
│   │       ├── NavigationPane.tsx # 관리폴더 목록 + 서브폴더 트리
│   │       ├── FileList.tsx      # 파일 목록 (정렬/검색/더블클릭 열기)
│   │       ├── DetailsPane.tsx   # 파일 세부 정보
│   │       ├── StatusBar.tsx     # 상태바
│   │       └── views/
│   │           ├── AnalyzeView.tsx    # 분석 대시보드
│   │           ├── PreviewView.tsx    # 정리 미리보기 (편집/D&D/제외)
│   │           ├── DuplicatesView.tsx # 중복 검사 결과
│   │           └── RenameView.tsx     # 리네임 미리보기
│   └── package.json
│
├── config/profiles/             ← 정리 프로필 (YAML)
│   ├── by-date.yaml
│   ├── by-type.yaml
│   └── by-subject.yaml
│
├── dist/dsff.exe                ← PyInstaller CLI 실행 파일
├── build/electron/              ← Electron 빌드 결과물
│   └── DSFolderFit-1.0.0-portable.exe
└── docs/
    └── 개발노트_20260328.md
```

### 10.2 Electron ↔ Python IPC 브릿지

GUI와 CLI 백엔드의 연결은 **child_process.spawn + JSON** 패턴으로 구현:

```
[Renderer]  →  electronAPI.analyze(path)
                ↓ ipcRenderer.invoke
[Main]      →  spawn("python", ["-m", "dsff", "--json", "analyze", path])
                ↓ stdout (JSON)
[Main]      →  JSON.parse(stdout)
                ↓ { ok: true, data: {...} }
[Renderer]  ←  AnalyzeView에 실데이터 렌더링
```

| IPC 채널 | Python 커맨드 | 설명 |
|----------|--------------|------|
| `dsff:analyze` | `analyze <path> --json` | 폴더 분석 |
| `dsff:organize` | `organize <path> --by-X [--execute] --json` | 정리 (dry-run/실행) |
| `dsff:rename` | `rename <path> --format X --date-source Y --json` | 리네임 (dry-run/실행) |
| `dsff:duplicates` | `duplicates <path> --action X --json` | 중복검사/처리 |
| `dsff:undo` | `undo [--all] --json` | 되돌리기 |
| `dsff:watchStart` | `watch <path> --json` (장기실행 NDJSON) | 감시 시작 |
| `dsff:watchStop` | 프로세스 kill | 감시 중지 |
| `dsff:organizeCustom` | Node.js fs로 직접 이동 | 사용자 커스텀 정리 |

### 10.3 기능별 구현 상태

| # | 기능 | CLI | GUI | 상세 |
|---|------|:---:|:---:|------|
| 1 | 폴더 등록/해제/목록 | ✅ | ✅ | 좌측 NavigationPane + 서브폴더 트리 |
| 2 | 파일 탐색 | N/A | ✅ | Windows 탐색기 스타일 (정렬/검색/더블클릭 열기) |
| 3 | 폴더 분석 | ✅ | ✅ | 건강도 점수, 카테고리/연령/크기 분포, 추천 작업 |
| 4 | 파일 정리 (유형별) | ✅ | ✅ | dry-run 미리보기 → 확인 → 실행, 폴더명 편집, D&D |
| 5 | 파일 정리 (날짜별) | ✅ | ✅ | daily/monthly/yearly/age 모드 |
| 6 | 파일 정리 (커스텀) | ✅ | ✅ | 커스텀 이동 (폴더명 수정, 파일 드래그) |
| 7 | 리네임 | ✅ | ✅ | 날짜 포맷/기준 선택, 실시간 미리보기 갱신 |
| 8 | 중복검사 | ✅ | ✅ | 3단계 파이프라인, 삭제/이동 처리 |
| 9 | 실시간 감시 | ✅ | ✅ | ON/OFF 토글, watchdog + NDJSON 스트림 |
| 10 | 되돌리기 | ✅ | ✅ | 마지막/전체 작업 역순 복원 |
| 11 | 프로필 시스템 | ✅ | ✅ | by-date, by-type, by-subject YAML |
| 12 | 파일 열기 | N/A | ✅ | 더블클릭 → OS 기본 연결 프로그램 |

### 10.4 정리 미리보기 (PreviewView) 상세 기능

| 기능 | 설명 |
|------|------|
| 현재 경로 표시 | 관리폴더 루트가 아닌 실제 탐색 중인 경로를 표시 |
| 파일 제외 | "현재 상태"에서 개별 파일 제외 버튼 → 정리 후 화면에서도 제외 |
| ← 화살표 제외 | 정리 후에서 파일 선택 → ← 클릭 → 정리 대상에서 제외 |
| 폴더명 인라인 편집 | 정리 후의 폴더명을 클릭하여 직접 수정 → 수정된 이름으로 생성 |
| 파일 드래그앤드롭 | 정리 후의 파일을 다른 폴더로 드래그하여 이동 |
| 실행 후 새로고침 | 정리 실행 완료 후 현재 상태를 자동으로 재로드 |
| 모달 결과 알림 | 실행 결과를 확인 버튼이 있는 모달로 표시 |

### 10.5 빌드 및 배포

```bash
# Python CLI 단독 실행파일
pyinstaller dsff.spec                     # → dist/dsff.exe

# Electron GUI 빌드
cd webapp && npm run build                # Vite 빌드 → dist/
npx electron-builder --win --x64          # → build/electron/DSFolderFit-1.0.0-portable.exe

# GUI가 CLI를 내장하는 구조:
#   DSFolderFit.exe (Electron)
#     └─ resources/dsff.exe (PyInstaller) 또는 python -m dsff (개발 모드)
```

---

## 부록 A: 기술 스택 비교표

| 영역 | 선택 | 대안 | 선택 이유 |
|------|------|------|----------|
| CLI | Typer | Click, argparse | 타입 힌트 기반, 더 적은 보일러플레이트 |
| 출력 | Rich | Colorama, termcolor | 테이블/프로그레스/패널 통합 지원 |
| 해싱 | xxhash | hashlib SHA256 | 10-100배 빠른 속도, 중복 감지에 충분 |
| MIME | filetype | python-magic | C 라이브러리 의존성 없음, 크로스 플랫폼 |
| 삭제 | send2trash | os.remove | 휴지통 이동으로 안전 보장 |
| 설정 | Pydantic | dataclasses | 유효성 검증 내장, IDE 지원 우수 |
| 감시 | Watchdog | inotify 직접 | 크로스 플랫폼, 추상화 계층 |
| 로깅 | Loguru | logging | 설정 간소화, 10배 빠른 성능 |
| **GUI** | **Electron + React + TypeScript** | PySide6, Flet, Tauri | **웹 기술로 빠른 UI 구현, Python CLI 재사용** |
| **프론트 빌드** | **Vite** | webpack, parcel | **빠른 HMR, 간단한 설정** |
| **패키징** | **electron-builder** | electron-forge | **portable exe 배포 지원** |
| CLI 빌드 | PyInstaller | cx_Freeze, Nuitka | 원클릭 .exe 실행 파일, 크로스 플랫폼 빌드 |

## 부록 B: 참고 리소스

- Watchdog 공식 문서: https://python-watchdog.readthedocs.io
- Typer 공식 문서: https://typer.tiangolo.com
- Rich 공식 문서: https://rich.readthedocs.io
- xxhash Python 바인딩: https://github.com/ifduyue/python-xxhash
- send2trash: https://github.com/arsenetar/send2trash
- Pydantic: https://docs.pydantic.dev
- Electron 공식 문서: https://www.electronjs.org/docs
- React 공식 문서: https://react.dev
- Vite 공식 문서: https://vite.dev
- electron-builder: https://www.electron.build
- PyInstaller: https://pyinstaller.org
- Windows 11 Fluent Design: https://learn.microsoft.com/design/fluent
