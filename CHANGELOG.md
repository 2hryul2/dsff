# Changelog

## [1.0.0] — 2026-03-28

### Added

#### GUI — Electron 포터블 EXE 신규 구현

- **Windows 11 탐색기 스타일 전체 UI** 구현 (`webapp/`)
  - `TitleBar` — 프레임리스 커스텀 타이틀바 (최소화 / 최대화 / 닫기)
  - `AddressBar` — 경로 브레드크럼, 뒤로 / 앞으로 / 위로 탐색, 경로 직접 입력, 파일 검색
  - `CommandBar` — 정리 / 분석 / 리네임 / 중복검사 / 감시 / 되돌리기 명령 모음
  - `NavigationPane` — 관리 폴더 목록 + 건강 점수 배지 + 폴더 추가 버튼
  - `FileList` — 정렬 가능한 파일 테이블 (이름 / 수정 날짜 / 형식 / 크기), 로딩 상태 표시
  - `DetailsPane` — 선택 파일 메타데이터 + 빠른 작업 버튼
  - `StatusBar` — 파일 수 / 선택 항목 / 건강 점수 / 감시 상태
  - `ContextMenu` — 우클릭 컨텍스트 메뉴
  - `DateTooltip` — hover 시 생성일 / 수정일 / 접근일 툴팁
  - `AnalyzeView` — 건강 점수 바, 카테고리 분포, 나이·크기 분포, AI 추천
  - `PreviewView` — 정리 전/후 트리 미리보기 (타입별 / 날짜별 / 크기별 / 커스텀)
  - `DuplicatesView` — 중복 그룹 체크박스 선택 + 삭제·이동 액션
  - `RenameView` — 날짜 접두사 이름 변경 미리보기 + 포맷 선택

- **실제 파일 시스템 연동** (`electron/` + `src/`)
  - `electron/main.cjs` — IPC 핸들러 4종 추가
    - `fs:readDir` — 디렉토리 항목 읽기 (이름, 타입, 크기, 수정일, 생성일, 접근일)
    - `dialog:openFolder` — Windows 네이티브 폴더 선택 다이얼로그
    - `config:load` — 관리 폴더 목록 불러오기 (`userData/dsff-folders.json`)
    - `config:save` — 관리 폴더 목록 저장
  - `electron/preload.cjs` — `readDir`, `openFolder`, `loadConfig`, `saveConfig` API 노출
  - `src/electron.d.ts` — `window.electronAPI` 전역 타입 선언 (신규)
  - `src/services/fsService.ts` — raw 엔트리 → `FileItem` 매핑 유틸 (신규)
    - 40+ 확장자 자동 분류 (문서 / 이미지 / 동영상 / 음악 / 압축 / 코드)
    - 날짜 포맷터 (`YYYY.MM.DD HH:mm`), 크기 포맷터 (B / KB / MB / GB)
    - 경로 유틸: `joinPath`, `parentDir`, `pathSegments` (브레드크럼용)

- **폴더 탐색 기능** (`src/App.tsx`)
  - 앱 시작 시 저장된 관리 폴더 목록 자동 복원
  - 뒤로 / 앞으로 탐색 히스토리 스택 (`backStack`, `fwdStack`)
  - 서브폴더 더블클릭으로 하위 경로 진입
  - 관리 폴더 추가 후 `userData` JSON에 자동 저장

- **빌드 결과물**
  - `D:\source\dsff\dist\DSFolderFit-1.0.0-portable.exe` (72 MB)
  - Windows 11 PC에서 추가 설치 없이 더블클릭 실행 가능
  - Electron 33 + Chromium + Node.js 완전 내장

### Changed

- `webapp/package.json` — electron-builder 출력 경로 `release/` → `../dist` (프로젝트 루트 `dist/` 통일)
- `src/types.ts` — `FileItem`에 `path: string`, `sizeBytes: number` 필드 추가
- `src/mockData.ts` — 신규 필드(`path`, `sizeBytes`) 반영

### Fixed

- `AddressBar` — 경로가 없을 때 빈 화면 대신 "폴더를 선택하세요" 안내 표시
- `FileList` — 고유 키를 `name` → `path` 로 변경하여 동일 이름 파일 충돌 방지
- 크기 컬럼 정렬을 문자열 비교에서 `sizeBytes` 숫자 비교로 교체 (정확한 정렬)
