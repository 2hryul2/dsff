# DS FolderFit 변경 이력 — 2026-03-29

> **세션 범위**: 스마트 정리 UI 기능 고도화 (8개 기능)
> **빌드 결과**: `dist/DSFolderFit-portable.exe`

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `webapp/src/components/views/SmartOrganizeView.tsx` | **신규 생성 / 전면 재작성** |
| `webapp/electron/main.cjs` | IPC 핸들러 3개 추가 |
| `webapp/electron/preload.cjs` | contextBridge 함수 3개 추가 |
| `webapp/src/electron.d.ts` | 타입 선언 3개 추가 |
| `webapp/src/types.ts` | `OrganizeResult`에 `ops` 필드 추가 |
| `webapp/src/services/fsService.ts` | 누락 확장자 9개 추가 |
| `webapp/src/App.tsx` | `refreshKey` 상태 + onRefresh 갱신 로직 |
| `webapp/src/components/NavigationPane.tsx` | `refreshKey` prop + SubFolderTree 재마운트 |
| `webapp/src/components/DetailsPane.tsx` | 빈 폴더 정리 버튼 + 확인 모달 |
| `webapp/src/components/CommandBar.tsx` | (linter 자동 수정) |

---

## 기능별 상세

### 1. 빈 폴더 정리 기능

| 항목 | 내용 |
|------|------|
| **변경사항** | 관리폴더 하위에서 파일 없이 디렉토리만 존재하는 "빈 폴더"를 탐색하고, 확인 후 삭제 |
| **수정 파일** | `main.cjs`, `preload.cjs`, `electron.d.ts`, `DetailsPane.tsx` |
| **동작방식** | DetailsPane "🗑️ 빈폴더" 버튼 → `fs:findEmptyDirs` IPC (재귀 탐색, SKIP: 삭제대상/node_modules/.git 등) → 결과 없으면 알림, 있으면 목록 모달 → "삭제" 클릭 시 `fs:removeEmptyDirs` IPC (`rmSync recursive`) → 완료 알림 + 화면 갱신 |

### 2. 빈 폴더 삭제 후 네비게이션/경로 갱신

| 항목 | 내용 |
|------|------|
| **변경사항** | 빈 폴더 삭제 후 NavigationPane 서브폴더 트리 + 파일 목록이 갱신되지 않던 문제 수정 |
| **수정 파일** | `App.tsx`, `NavigationPane.tsx` |
| **동작방식** | `refreshKey` 카운터 도입. `onRefresh` 콜백에서 `fetchDir` + `setRefreshKey(k+1)` 호출. NavigationPane의 SubFolderTree에 `key={path-refreshKey}` 전달하여 변경 시 re-mount → 서브폴더 재로딩 |

### 3. 사용자 생성 파일 확장자 필터링 (USER_EXT)

| 항목 | 내용 |
|------|------|
| **변경사항** | 스마트 정리에서 사용자 생성 파일만 대상으로 필터링. 시스템/자동 생성 파일(.class, .jar, .map 등) 자동 제외 |
| **수정 파일** | `SmartOrganizeView.tsx`, `fsService.ts` |
| **동작방식** | `USER_EXT` Set (41개 확장자) 정의. `buildPlans()`에서 `USER_EXT`에 없는 파일은 `filter`로 제외. `EXT_CATEGORY`를 6개 카테고리로 재정의 (문서/이미지/코드/설정/압축/리소스). 탐색기 뷰에서는 모든 파일 표시, 스마트 정리에서만 필터 적용 |

**USER_EXT 확장자 테이블:**

| 구분 | 확장자 |
|------|--------|
| 업무 문서 | xlsx, pptx, ppt, pdf, docx, xls, doc, csv, xlsb, hwp, hwpx |
| 이미지·미디어 | png, jpg, jpeg, gif, svg, bmp, mp4 |
| 개발 소스 | ts, js, java, sh, bat, py, sql |
| 설정·프로젝트 | json, yaml, yml, md, html, css, env |
| 압축·배포 | zip, 7z, gz, vhdx, iso |
| 폰트·리소스 | ttf, otf |

### 4. .ppt / .jpeg 확장자 추가

| 항목 | 내용 |
|------|------|
| **변경사항** | 사용자 생성 파일임에도 누락된 `.ppt`, `.jpeg`를 `USER_EXT`, `EXT_CATEGORY`, `EXT_ICON`에 추가 |
| **수정 파일** | `SmartOrganizeView.tsx` |
| **동작방식** | 3곳(USER_EXT Set, EXT_CATEGORY 분류 맵, EXT_ICON 아이콘 맵)에 일괄 추가 |

### 5. 직군별 템플릿 폴더 구조 — 레퍼런스 완전 반영

| 항목 | 내용 |
|------|------|
| **변경사항** | `src/reference/` 6개 MD 파일의 "## 폴더 구조"를 `getJobProfiles()` folders 배열에 정확히 반영 (숫자 접두사 포함) |
| **수정 파일** | `SmartOrganizeView.tsx` |
| **동작방식** | 6개 직군별 프로필의 `folders[]` 배열과 `classify()` 함수를 레퍼런스 기준으로 전면 재작성 |

**직군별 주요 폴더 변경:**

| 직군 | 추가/변경된 폴더 (숫자 접두사 반영) |
|------|------|
| 👔 임원·관리자 | `21_M&A검토`, `22_신사업계획`, `31_고객사`, `32_협력사`, `33_금융·법률` |
| 💻 개발자 | `11_착수` ~ `14_감리_감사대응`, `21_요구사항` ~ `24_회의록`, `31_테스트계획` ~ `35_결과보고서`, `41_최종산출물` ~ `43_유지보수` |
| 🖥️ 인프라·운영 | `30_장애대응`(루트) + `31_증적`(서브) 분리 |
| 📊 영업·제안 | `21_제안서_작업`, `22_제안서_발송본`, `23_견적·원가`, `24_PT자료` |
| 📋 구매·계약 | `31_원본_서명본`, `32_사본_작업본` |
| 👥 HR | `21_{yr}_공채`, `22_{yr}_경력`, `31_입사서류` ~ `33_퇴직`, `91_3년보존`, `92_5년보존` |

### 6. 드래그 & 드롭 / 인라인 편집 / 사용자지정 폴더

| 항목 | 내용 |
|------|------|
| **변경사항** | 스마트 정리 "정리 후 상태" 패널을 인터랙티브하게 개선 (3종 기능) |
| **수정 파일** | `SmartOrganizeView.tsx` |

**6-1. 드래그 & 드롭**

| 항목 | 내용 |
|------|------|
| **동작방식** | 정리 후 패널에서 파일을 드래그하여 다른 폴더에 드롭 → `destFolder` 즉시 변경. 드롭 대상 폴더에 파란 점선 하이라이트 (`#dbeafe` + `outline: 2px dashed #2563eb`). 파일 행에 `cursor: grab` 표시 |
| **상태** | `dragSrcPath`, `dropTarget` |
| **핸들러** | `handleDrop(targetFolder)` → `setPlans` 갱신 |

**6-2. 인라인 편집**

| 항목 | 내용 |
|------|------|
| **동작방식** | 현재 상태 패널: 파일명 더블클릭 → `InlineEdit` 컴포넌트 → Enter/Blur 확정, Escape 취소 → `plans[].fileName` 갱신. 정리 후 패널: 폴더명 더블클릭 → 이름 변경 → 하위 모든 파일의 `destFolder` 일괄 변경 |
| **상태** | `editing`, `editVal` |
| **핸들러** | `startEdit()`, `commitEdit()`, `cancelEdit()` |

**6-3. 사용자지정 폴더**

| 항목 | 내용 |
|------|------|
| **동작방식** | 정리 후 패널 최하단에 라벤더 배경(`#f5f3ff`) "사용자지정" 폴더 상시 표시. "사용자" 태그 배지(보라색). 이름 변경 시 `customFolders` 배열에 추가 → 새 "사용자지정" placeholder 자동 생성. 파일을 드래그하여 사용자지정 폴더에 드롭 가능. 템플릿 적용 시 초기화 |
| **상태** | `customFolders` |

### 7. 빈 폴더 생성 + 폴더 이름 정렬

| 항목 | 내용 |
|------|------|
| **변경사항** | 템플릿 적용 시 파일이 없는 폴더도 "정리 후 상태"에 표시. 폴더를 이름순 정렬하여 번호 접두사 순서대로 표시 |
| **수정 파일** | `SmartOrganizeView.tsx` |
| **동작방식** | `buildAfterTree`에 `templateFolders` 파라미터 추가 — 파일 배치 전에 모든 템플릿 폴더를 트리에 선행 생성. `sortTreeChildren()` 재귀 함수로 모든 노드의 children을 `localeCompare("ko")` 기준 정렬. `activeTemplateFolders` 상태에 템플릿 적용 시 folders 배열 저장 |

### 8. 템플릿 클릭 시 폴더 미생성 + 실행 로그 + 되돌리기

| 항목 | 내용 |
|------|------|
| **변경사항** | 템플릿 버튼 클릭은 미리보기만 (실제 폴더 미생성). 정리 실행 시 폴더 생성 + 파일 이동. 실행 후 상세 로그 표시 + 되돌리기(↩) 기능 |
| **수정 파일** | `SmartOrganizeView.tsx`, `main.cjs`, `preload.cjs`, `electron.d.ts`, `types.ts` |

**동작방식 — 실행 흐름:**

```
템플릿 버튼 클릭
  → plans[] 재분류만 (createFolders 호출 안 함)
  → 토스트: "미리보기 적용 — N개 파일 재분류 (폴더 생성은 정리 실행 시)"

"N개 정리 실행" 버튼 클릭
  → 1) createFolders (템플릿 + 사용자지정 폴더 일괄 생성)
  → 2) organizeCustom (파일 이동, ops 배열 반환)
  → 완료 화면: 실행 로그 + 되돌리기 버튼 + 안내 배너
```

**동작방식 — 되돌리기:**

```
"↩ 되돌리기" 버튼 클릭
  → fs:undoMoves IPC (ops 역순으로 fs.renameSync(dest → source))
  → 완료 토스트: "N개 파일 원래 위치로 복구 완료"
  → done 화면 닫힘 + onRefresh()
```

**실행 로그 형식:**

```
📁 폴더 22개 생성 완료
✅ 주간보고_250603.xlsx → 00_업무보고\주간보고\주간보고_250603.xlsx
✅ DB설계서.xlsx → 20_설계개발\22_아키텍처\DB설계서.xlsx
❌ 손상파일.doc: EPERM: operation not permitted
```

**되돌리기 안내 배너 (하단 노란색):**

> 💡 **되돌리기 안내:** 이동된 파일을 원래 위치로 복구하려면 상단의 **↩ 되돌리기** 버튼을 클릭하세요. 이 화면을 닫으면 복구할 수 없으니, 결과를 확인 후 진행하세요.

---

## 추가된 IPC 핸들러

| 핸들러 | 위치 | 용도 |
|--------|------|------|
| `fs:findEmptyDirs` | main.cjs | 빈 폴더 재귀 탐색 (hasFiles + walk 알고리즘) |
| `fs:removeEmptyDirs` | main.cjs | 빈 폴더 삭제 (`rmSync recursive force`) |
| `fs:undoMoves` | main.cjs | 파일 이동 되돌리기 (ops 역순 `renameSync`) |

---

## fsService.ts 추가 확장자

| 확장자 | 카테고리 | 타입 설명 |
|--------|----------|-----------|
| hwpx | document | 한글 문서(OOXML) |
| csv | document | CSV 파일 |
| xlsb | document | Excel 바이너리 통합 문서 |
| vhdx | archive | 가상 디스크 이미지 |
| iso | archive | 디스크 이미지 |
| sql | code | SQL 파일 |
| env | code | 환경 설정 파일 |
| ttf | other | TrueType 폰트 |
| otf | other | OpenType 폰트 |

---

## 테스트 체크리스트

### 빈 폴더 정리
- [ ] 관리폴더 선택 → 세부 정보 패널 → "🗑️ 빈폴더" 버튼 표시 확인
- [ ] 빈 폴더 없는 경로 → "빈 폴더가 없습니다." 알림
- [ ] 빈 폴더 여러 개 만든 후 → 버튼 클릭 → 목록 포함 확인 모달 표시
- [ ] 모달 "취소" → 삭제 안 됨
- [ ] 모달 "삭제" → N개 삭제 완료 알림 + 네비게이션 트리 갱신

### 네비게이션 갱신
- [ ] 빈 폴더 삭제 후 네비게이션 서브폴더 트리 즉시 갱신
- [ ] 스마트 정리 실행 후 파일 목록 갱신

### 확장자 필터링
- [ ] 스마트 정리 분석 시 .class, .jar, .map 등 시스템 파일 제외 확인
- [ ] .xlsx, .pdf, .ts, .json 등 사용자 파일만 plans에 포함
- [ ] .ppt, .jpeg 파일이 정상적으로 분류됨
- [ ] 탐색기 뷰에서는 모든 파일 표시 (필터 미적용)

### 직군별 템플릿
- [ ] 👔 임원·관리자 → `21_M&A검토`, `33_금융·법률` 등 폴더 표시
- [ ] 💻 개발자 → `11_착수` ~ `43_유지보수` 전체 폴더 표시
- [ ] 🖥️ 인프라·운영 → `30_장애대응`, `31_증적` 분리 표시
- [ ] 📊 영업·제안 → `21_제안서_작업` ~ `24_PT자료` 표시
- [ ] 📋 구매·계약 → `31_원본_서명본`, `32_사본_작업본` 표시
- [ ] 👥 HR → `21_2026_공채`, `91_3년보존` 등 동적 연도 포함

### 드래그 & 드롭
- [ ] 정리 후 패널에서 파일 드래그 → 다른 폴더에 드롭 → destFolder 변경
- [ ] 드롭 대상 폴더에 파란 점선 하이라이트 표시
- [ ] 현재 상태 패널에서는 드래그 불가

### 인라인 편집
- [ ] 현재 상태: 파일명 더블클릭 → 인라인 편집 → Enter 확정
- [ ] 현재 상태: 편집 중 Escape → 취소
- [ ] 정리 후: 폴더명 더블클릭 → 이름 변경 → 하위 파일 destFolder 일괄 갱신
- [ ] 루트 폴더명(depth=0)은 편집 불가

### 사용자지정 폴더
- [ ] 정리 후 패널 최하단에 라벤더 배경 "사용자지정" 폴더 표시
- [ ] "사용자지정" 더블클릭 → 이름 변경 → 새 "사용자지정" 자동 생성
- [ ] 사용자지정 폴더로 파일 드래그&드롭 동작
- [ ] 템플릿 적용 시 사용자지정 폴더 초기화

### 빈 폴더 생성 + 정렬
- [ ] 템플릿 적용 시 파일 없는 폴더도 "정리 후 상태"에 표시
- [ ] 폴더가 이름순 정렬 (00_업무보고 → 01_수신함 → 10_PM기획 순)
- [ ] 사용자지정 폴더는 정렬 후 최하단 배치

### 템플릿 미리보기 + 실행 로그 + 되돌리기
- [ ] 템플릿 버튼 클릭 → 디스크에 폴더 생성 안 됨 (미리보기만)
- [ ] 토스트: "미리보기 적용 — N개 파일 재분류 (폴더 생성은 정리 실행 시)"
- [ ] "N개 정리 실행" → 폴더 생성 + 파일 이동 순차 실행
- [ ] 완료 화면: 실행 로그 (모노스페이스, 파일별 이동 내역)
- [ ] 완료 화면: "↩ 되돌리기" 황색 버튼 표시
- [ ] "↩ 되돌리기" 클릭 → 파일 원래 위치 복원 + 토스트
- [ ] 하단 노란 배너: 되돌리기 안내 문구 표시
- [ ] "닫기" 후 되돌리기 불가 (ops 상태 소멸)

---

**작성일**: 2026-03-29
**빌드**: `dist/DSFolderFit-portable.exe`
