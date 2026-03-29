import { useState, useEffect, useRef } from "react";
import type { ManagedFolder, SmartOrganizeFilePlan } from "../../types";

/* ── 사용자 생성 파일 확장자 화이트리스트 ── */
const USER_EXT = new Set([
  /* 업무 문서 */   "xlsx","pptx","ppt","pdf","docx","xls","doc","csv","xlsb","hwp","hwpx",
  /* 이미지·미디어 */ "png","jpg","jpeg","gif","svg","bmp","mp4",
  /* 개발 소스 */   "ts","js","java","sh","bat","py","sql",
  /* 설정·프로젝트 */ "json","yaml","yml","md","html","css","env",
  /* 압축·배포 */   "zip","7z","gz","vhdx","iso",
  /* 폰트·리소스 */ "ttf","otf",
]);

/* ── 분류 규칙 (USER_EXT 기반) ── */
const EXT_CATEGORY: Record<string, string> = {};
for (const ext of ["pdf","docx","doc","xlsx","xls","pptx","ppt","csv","xlsb","hwp","hwpx"]) EXT_CATEGORY[ext] = "문서";
for (const ext of ["png","jpg","jpeg","gif","svg","bmp","mp4"]) EXT_CATEGORY[ext] = "이미지";
for (const ext of ["ts","js","java","sh","bat","py","sql"]) EXT_CATEGORY[ext] = "코드";
for (const ext of ["json","yaml","yml","md","html","css","env"]) EXT_CATEGORY[ext] = "설정";
for (const ext of ["zip","7z","gz","vhdx","iso"]) EXT_CATEGORY[ext] = "압축";
for (const ext of ["ttf","otf"]) EXT_CATEGORY[ext] = "리소스";

const PRJ_RE  = /^([A-Z]{2,6}[-_]\d{2,6})[_\-\s]/;
const VER_RE  = /[_\-\s][Vv](\d+[\d.]*)/;
const DATE_RE = /^(\d{4})(\d{2})\d{2}[_\-\s]/;

/* ── 기본 자동 분류 ── */
function autoClassify(name: string, ext: string): string {
  const prjM = name.match(PRJ_RE);
  if (prjM) return `프로젝트별\\${prjM[1]}`;
  const dateM = name.match(DATE_RE);
  if (dateM) return `${dateM[1]}년\\${dateM[1]}${dateM[2]}`;
  if (VER_RE.test(name)) return `버전관리\\${name.split(/[_\-]/)[0]}`;
  return EXT_CATEGORY[ext] ?? "기타";
}

function buildPlans(files: Array<{ name: string; path: string; size: number }>): SmartOrganizeFilePlan[] {
  return files
    .filter((f) => {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
      return USER_EXT.has(ext);
    })
    .map((f) => {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
      return { srcPath: f.path, fileName: f.name, ext, destFolder: autoClassify(f.name, ext), reason: "자동분류", skip: false };
    });
}

/* ── 템플릿 프로필 ── */
interface TemplateProfile {
  name: string;
  folders: string[];
  classify: (fileName: string, ext: string) => string;
}

const BASIC_PROFILES: TemplateProfile[] = [
  {
    name: "기본 분류",
    folders: ["문서", "이미지", "코드", "설정", "압축", "리소스", "기타", "삭제대상"],
    classify: autoClassify,
  },
  {
    name: "업무 문서형",
    folders: ["문서\\보고서", "문서\\기획안", "문서\\계약서", "이미지", "프로젝트별", "기타", "삭제대상"],
    classify: (name, ext) => {
      const lc = name.toLowerCase();
      if (/[A-Z]{2,6}[-_]\d{2,6}/.test(name) || /프로젝트|pjt/.test(lc)) return "프로젝트별";
      if (/계약|contract/.test(lc)) return "문서\\계약서";
      if (/기획|plan|proposal|제안/.test(lc)) return "문서\\기획안";
      if (EXT_CATEGORY[ext] === "이미지") return "이미지";
      if (["pdf","docx","doc","xlsx","xls","pptx","csv","xlsb","hwp","hwpx"].includes(ext)) return "문서\\보고서";
      return "기타";
    },
  },
  {
    name: "연도별",
    folders: ["2023년", "2024년", "2025년", "2026년", "기타", "삭제대상"],
    classify: (name) => {
      const m = name.match(/^(\d{4})/);
      if (m && +m[1] >= 2020 && +m[1] <= 2030) return `${m[1]}년`;
      return "기타";
    },
  },
];

function getJobProfiles(): TemplateProfile[] {
  const yr = new Date().getFullYear();
  return [
    /* ── 👔 임원·관리자 (00_임원_관리자.md) ── */
    {
      name: "👔 임원·관리자",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함",
        "20_전략_기밀\\21_M&A검토", "20_전략_기밀\\22_신사업계획",
        "30_외부기관\\31_고객사", "30_외부기관\\32_협력사", "30_외부기관\\33_금융·법률",
        "40_인사_조직", "90_Archive", "삭제대상",
      ],
      classify: (name) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원회의|임원보고/.test(lc)) return "00_업무보고\\임원회의";
        if (/m&a|인수|ma검토/.test(lc)) return "20_전략_기밀\\21_M&A검토";
        if (/전략|기밀|신사업/.test(lc)) return "20_전략_기밀\\22_신사업계획";
        if (/고객/.test(lc)) return "30_외부기관\\31_고객사";
        if (/협력/.test(lc)) return "30_외부기관\\32_협력사";
        if (/금융|법률|세무|법무|감독원/.test(lc)) return "30_외부기관\\33_금융·법률";
        if (/인사|조직/.test(lc)) return "40_인사_조직";
        if (/archive|아카이브/.test(lc)) return "90_Archive";
        if (/주간보고|weekly|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "01_수신함";
      },
    },
    /* ── 💻 개발자 (01_기발자.md) ── */
    {
      name: "💻 개발자",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함",
        "10_PM기획\\11_착수", "10_PM기획\\12_일정·이슈", "10_PM기획\\13_고객사통신", "10_PM기획\\14_감리_감사대응",
        "20_설계개발\\21_요구사항", "20_설계개발\\22_아키텍처", "20_설계개발\\23_화면설계", "20_설계개발\\24_회의록",
        "30_QA\\31_테스트계획", "30_QA\\32_테스트케이스", "30_QA\\33_결함관리", "30_QA\\34_증적", "30_QA\\35_결과보고서",
        "40_종료\\41_최종산출물", "40_종료\\42_인수인계", "40_종료\\43_유지보수",
        "삭제대상",
      ],
      classify: (name, ext) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원/.test(lc)) return "00_업무보고\\임원회의";
        if (/tc[-_]|테스트케이스|testcase/.test(lc)) return "30_QA\\32_테스트케이스";
        if (/bug[-_]|결함|버그|defect/.test(lc)) return "30_QA\\33_결함관리";
        if (/증적|스크린샷|캡처|screenshot/.test(lc) || EXT_CATEGORY[ext] === "이미지") return "30_QA\\34_증적";
        if (/테스트계획|testplan|test.?plan/.test(lc)) return "30_QA\\31_테스트계획";
        if (/결과보고/.test(lc)) return "30_QA\\35_결과보고서";
        if (/iss[-_]|요구사항|요구명세/.test(lc)) return "20_설계개발\\21_요구사항";
        if (/아키텍처|architecture|db설계|api명세|api.?spec/.test(lc)) return "20_설계개발\\22_아키텍처";
        if (/화면설계|ui|ux|wireframe/.test(lc)) return "20_설계개발\\23_화면설계";
        if (/회의록|meeting|미팅/.test(lc)) return "20_설계개발\\24_회의록";
        if (/착수|kickoff/.test(lc)) return "10_PM기획\\11_착수";
        if (/일정|wbs|이슈|issue/.test(lc)) return "10_PM기획\\12_일정·이슈";
        if (/감리|감사/.test(lc)) return "10_PM기획\\14_감리_감사대응";
        if (/고객사통신|고객사/.test(lc)) return "10_PM기획\\13_고객사통신";
        if (/인수인계/.test(lc)) return "40_종료\\42_인수인계";
        if (/유지보수|maintenance/.test(lc)) return "40_종료\\43_유지보수";
        if (/최종산출물|납품/.test(lc)) return "40_종료\\41_최종산출물";
        if (EXT_CATEGORY[ext] === "코드") return "20_설계개발\\22_아키텍처";
        if (/주간보고|weekly|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "01_수신함";
      },
    },
    /* ── 🖥️ 인프라·운영 (02_인프라운영.md) ── */
    {
      name: "🖥️ 인프라·운영",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함", "20_구성관리",
        "30_장애대응", "30_장애대응\\31_증적",
        "40_점검결과", "50_매뉴얼", "삭제대상",
      ],
      classify: (name, ext) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원/.test(lc)) return "00_업무보고\\임원회의";
        if (/itsm|변경요청|변경관리|구성관리/.test(lc)) return "20_구성관리";
        if (/증적|스크린샷|캡처/.test(lc) || EXT_CATEGORY[ext] === "이미지") return "30_장애대응\\31_증적";
        if (/inc[-_]|장애|incident/.test(lc)) return "30_장애대응";
        if (/점검|보안|security|취약/.test(lc)) return "40_점검결과";
        if (/매뉴얼|manual|운영지침|가이드/.test(lc)) return "50_매뉴얼";
        if (/주간보고|weekly|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "01_수신함";
      },
    },
    /* ── 📊 영업·제안 (03_영업제안.md) ── */
    {
      name: "📊 영업·제안",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함",
        "20_수주활동",
        "20_수주활동\\21_제안서_작업", "20_수주활동\\22_제안서_발송본",
        "20_수주활동\\23_견적·원가", "20_수주활동\\24_PT자료",
        "30_참조자료", "90_Archive_실패", "삭제대상",
      ],
      classify: (name) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원/.test(lc)) return "00_업무보고\\임원회의";
        if (/rfp|제안서.*발송|발송본/.test(lc)) return "20_수주활동\\22_제안서_발송본";
        if (/제안서|proposal/.test(lc)) return "20_수주활동\\21_제안서_작업";
        if (/견적|원가|비용/.test(lc)) return "20_수주활동\\23_견적·원가";
        if (/pt|프레젠|발표/.test(lc)) return "20_수주활동\\24_PT자료";
        if (/pre[-_]|수주|입찰/.test(lc)) return "20_수주활동";
        if (/archive|실패|종료/.test(lc)) return "90_Archive_실패";
        if (/주간보고|weekly|영업|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "30_참조자료";
      },
    },
    /* ── 📋 구매·계약 (04_구매계약.md) ── */
    {
      name: "📋 구매·계약",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함", "20_구매",
        "30_계약서\\31_원본_서명본", "30_계약서\\32_사본_작업본",
        "90_Archive_완료", "삭제대상",
      ],
      classify: (name) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원/.test(lc)) return "00_업무보고\\임원회의";
        if (/서명완료|서명본|원본/.test(lc)) return "30_계약서\\31_원본_서명본";
        if (/계약|contract/.test(lc)) return "30_계약서\\32_사본_작업본";
        if (/견적|po[-_]|발주|품의|구매|비교검토/.test(lc)) return "20_구매";
        if (/archive|완료/.test(lc)) return "90_Archive_완료";
        if (/주간보고|weekly|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "01_수신함";
      },
    },
    /* ── 👥 HR (05_HR.md) ── */
    {
      name: "👥 HR",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함",
        `20_채용\\21_${yr}_공채\\이력서`, `20_채용\\21_${yr}_공채\\면접자료`,
        `20_채용\\22_${yr}_경력\\이력서`, `20_채용\\22_${yr}_경력\\면접자료`,
        "30_인사관리\\31_입사서류", "30_인사관리\\32_재직증명", "30_인사관리\\33_퇴직",
        "40_급여_연봉", "50_교육_훈련",
        "90_Archive\\91_3년보존", "90_Archive\\92_5년보존",
        "삭제대상",
      ],
      classify: (name) => {
        const lc = name.toLowerCase();
        if (/월간보고|monthly/.test(lc)) return "00_업무보고\\월간보고";
        if (/임원/.test(lc)) return "00_업무보고\\임원회의";
        if (/이력서|resume|cv/.test(lc)) return `20_채용\\21_${yr}_공채\\이력서`;
        if (/면접/.test(lc)) return `20_채용\\21_${yr}_공채\\면접자료`;
        if (/급여|연봉|salary|pay/.test(lc)) return "40_급여_연봉";
        if (/재직증명/.test(lc)) return "30_인사관리\\32_재직증명";
        if (/퇴직|retirement/.test(lc)) return "30_인사관리\\33_퇴직";
        if (/입사/.test(lc)) return "30_인사관리\\31_입사서류";
        if (/교육|훈련|training/.test(lc)) return "50_교육_훈련";
        if (/3년/.test(lc)) return "90_Archive\\91_3년보존";
        if (/5년/.test(lc)) return "90_Archive\\92_5년보존";
        if (/주간보고|weekly|인사|보고|report/.test(lc)) return "00_업무보고\\주간보고";
        return "01_수신함";
      },
    },
  ];
}

/* ── 트리 구조 ── */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  files: SmartOrganizeFilePlan[];
  isNew: boolean;
  isCustom?: boolean;
}

function makeNode(name: string, isNew = false, isCustom = false): TreeNode {
  return { name, children: new Map(), files: [], isNew, isCustom };
}

const CUSTOM_PLACEHOLDER = "사용자지정";

/* ── 인라인 편집 컴포넌트 ── */
function InlineEdit({ value, onChange, onCommit, onCancel }: {
  value: string; onChange: (v: string) => void; onCommit: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);
  return (
    <input ref={ref} value={value} autoFocus
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
      onClick={(e) => e.stopPropagation()}
      style={{ fontSize: 12, fontWeight: 600, border: "1px solid #2563eb", borderRadius: 3,
        padding: "0 4px", outline: "none", minWidth: 60, maxWidth: 200, fontFamily: "inherit" }}
    />
  );
}

function buildCurrentTree(plans: SmartOrganizeFilePlan[], root: string): TreeNode {
  const rootNode = makeNode(root.split(/[/\\]/).pop() ?? root);
  for (const p of plans) {
    const parentAbs = p.srcPath.replace(/[/\\][^/\\]+$/, "");
    const rel = parentAbs.startsWith(root) ? parentAbs.slice(root.length).replace(/^[/\\]/, "") : "";
    const parts = rel ? rel.split(/[/\\]/) : [];
    let cur = rootNode;
    for (const part of parts) {
      if (!cur.children.has(part)) cur.children.set(part, makeNode(part));
      cur = cur.children.get(part)!;
    }
    cur.files.push(p);
  }
  return rootNode;
}

function buildAfterTree(plans: SmartOrganizeFilePlan[], rootName: string, templateFolders?: string[]): TreeNode {
  const rootNode = makeNode(rootName);
  // 1. 템플릿 폴더 구조를 먼저 생성 (빈 폴더 포함)
  if (templateFolders) {
    for (const folderPath of templateFolders) {
      const parts = folderPath.split(/[/\\]/);
      let cur = rootNode;
      for (const part of parts) {
        if (!cur.children.has(part)) cur.children.set(part, makeNode(part, true));
        cur = cur.children.get(part)!;
      }
    }
  }
  // 2. 파일 배치
  for (const p of plans) {
    if (p.skip) continue;
    const parts = p.destFolder.split(/[/\\]/);
    let cur = rootNode;
    for (const part of parts) {
      if (!cur.children.has(part)) cur.children.set(part, makeNode(part, true));
      cur = cur.children.get(part)!;
    }
    cur.files.push(p);
  }
  return rootNode;
}

/* ── 트리 children을 이름순 정렬 (재귀) ── */
function sortTreeChildren(node: TreeNode): void {
  if (node.children.size > 1) {
    const sorted = Array.from(node.children.entries())
      .sort(([a], [b]) => a.localeCompare(b, "ko"));
    node.children.clear();
    for (const [k, v] of sorted) node.children.set(k, v);
  }
  for (const child of node.children.values()) sortTreeChildren(child);
}

function collectSrcPaths(node: TreeNode): string[] {
  const paths: string[] = node.files.map((p) => p.srcPath);
  for (const child of node.children.values()) paths.push(...collectSrcPaths(child));
  return paths;
}

/* ── 폴더 체크박스 (indeterminate 지원) ── */
function FolderCheckbox({ node, planIndex, plans, onToggle }: {
  node: TreeNode; planIndex: Map<string, number>;
  plans: SmartOrganizeFilePlan[]; onToggle: (srcPaths: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const paths = collectSrcPaths(node);
  if (paths.length === 0) return null;
  const activeCount = paths.filter((p) => { const idx = planIndex.get(p); return idx !== undefined && !plans[idx].skip; }).length;
  const checked = activeCount === paths.length;
  const indeterminate = activeCount > 0 && activeCount < paths.length;
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked}
      onChange={() => onToggle(paths)} onClick={(e) => e.stopPropagation()}
      style={{ flexShrink: 0, cursor: "pointer" }} />
  );
}

/* ── 트리 렌더 컴포넌트 ── */
const EXT_ICON: Record<string, string> = {
  pdf:"📄", docx:"📝", doc:"📝", xlsx:"📊", xls:"📊", csv:"📊", xlsb:"📊",
  pptx:"📋", ppt:"📋", hwp:"📄", hwpx:"📄", md:"📄",
  jpg:"🖼️", jpeg:"🖼️", png:"🖼️", gif:"🖼️", svg:"🖼️", bmp:"🖼️", mp4:"🎬",
  zip:"📦", "7z":"📦", gz:"📦", vhdx:"💿", iso:"💿",
  ts:"💻", js:"💻", java:"💻", py:"💻", sql:"💻", sh:"💻", bat:"💻",
  json:"⚙️", yaml:"⚙️", yml:"⚙️", html:"🌐", css:"🎨", env:"⚙️",
  ttf:"🔤", otf:"🔤",
};
function fileIcon(ext: string) { return EXT_ICON[ext] ?? "📄"; }

function TreePane({
  node, depth = 0, mode, folderPath = "", onToggleSkip, onToggleFolderSkip, planIndex, plans,
  // drag & drop
  onDragStart, onDragEnd, onDropOnFolder, onSetDropTarget, dragSrcPath, dropTarget,
  // inline edit
  editing, editVal, onStartEdit, onEditChange, onCommitEdit, onCancelEdit,
}: {
  node: TreeNode; depth?: number; mode: "current" | "after"; folderPath?: string;
  onToggleSkip?: (idx: number) => void;
  onToggleFolderSkip?: (srcPaths: string[]) => void;
  planIndex?: Map<string, number>; plans?: SmartOrganizeFilePlan[];
  // drag & drop
  onDragStart?: (srcPath: string) => void;
  onDragEnd?: () => void;
  onDropOnFolder?: (folderPath: string) => void;
  onSetDropTarget?: (folderPath: string) => void;
  dragSrcPath?: string | null;
  dropTarget?: string | null;
  // inline edit
  editing?: { type: "file"; srcPath: string } | { type: "folder"; path: string } | null;
  editVal?: string;
  onStartEdit?: (target: { type: "file"; srcPath: string } | { type: "folder"; path: string }, name: string) => void;
  onEditChange?: (v: string) => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.size > 0 || node.files.length > 0;
  const indent = depth * 14;

  const allSkipped = mode === "current" && plans && planIndex
    ? (() => {
        const paths = collectSrcPaths(node);
        return paths.length > 0 && paths.every((p) => {
          const idx = planIndex.get(p);
          return idx !== undefined && plans[idx].skip;
        });
      })()
    : false;

  const isDropHere = mode === "after" && dropTarget === folderPath && depth > 0;
  const isEditingThisFolder = editing?.type === "folder" && editing.path === folderPath;
  const isCustom = node.isCustom;

  return (
    <div>
      {/* ── 폴더 행 ── */}
      <div onClick={() => hasChildren && setOpen((v) => !v)}
        onDragOver={mode === "after" && depth > 0 ? (e) => { e.preventDefault(); e.stopPropagation(); onSetDropTarget?.(folderPath); } : undefined}
        onDragEnter={mode === "after" && depth > 0 ? (e) => { e.preventDefault(); e.stopPropagation(); onSetDropTarget?.(folderPath); } : undefined}
        onDrop={mode === "after" && depth > 0 && onDropOnFolder ? (e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(folderPath); } : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", paddingLeft: 8 + indent,
          cursor: hasChildren ? "pointer" : "default",
          userSelect: "none", opacity: allSkipped ? 0.4 : 1,
          background: isDropHere ? "#dbeafe" : (isCustom && depth > 0 ? "#f5f3ff" : "transparent"),
          outline: isDropHere ? "2px dashed #2563eb" : "none",
          borderRadius: isDropHere ? 4 : 0,
        }}
        onMouseEnter={(e) => { if (!isDropHere) (e.currentTarget as HTMLElement).style.background = isCustom && depth > 0 ? "#ede9fe" : "#f3f4f6"; }}
        onMouseLeave={(e) => { if (!isDropHere) (e.currentTarget as HTMLElement).style.background = isCustom && depth > 0 ? "#f5f3ff" : "transparent"; }}
      >
        {hasChildren ? <span style={{ fontSize: 9, color: "#9ca3af", width: 10 }}>{open ? "▼" : "▶"}</span> : <span style={{ width: 10 }} />}
        {mode === "current" && onToggleFolderSkip && planIndex && plans && (
          <FolderCheckbox node={node} planIndex={planIndex} plans={plans} onToggle={onToggleFolderSkip} />
        )}
        <span style={{ fontSize: 14 }}>📁</span>

        {/* 폴더명: 편집 중이면 InlineEdit */}
        {isEditingThisFolder && onEditChange && onCommitEdit && onCancelEdit ? (
          <InlineEdit value={editVal ?? ""} onChange={onEditChange} onCommit={onCommitEdit} onCancel={onCancelEdit} />
        ) : (
          <span
            onDoubleClick={mode === "after" && depth > 0 && onStartEdit ? (e) => {
              e.stopPropagation(); onStartEdit({ type: "folder", path: folderPath }, node.name);
            } : undefined}
            style={{
              fontSize: 12, fontWeight: 600,
              color: allSkipped ? "#9ca3af" : (isCustom && depth > 0 ? "#6d28d9" : (mode === "after" && node.isNew && depth > 0 ? "#2563eb" : "#1a1a1a")),
              textDecoration: allSkipped ? "line-through" : "none",
              cursor: mode === "after" && depth > 0 ? "text" : undefined,
            }}>
            {node.name}
          </span>
        )}

        {/* 태그 */}
        {isCustom && depth > 0 && (
          <span style={{ fontSize: 9, color: "#7c3aed", background: "#ede9fe", borderRadius: 3, padding: "1px 4px" }}>사용자</span>
        )}
        {mode === "after" && node.isNew && depth > 0 && !isCustom && (
          <span style={{ fontSize: 9, color: "#2563eb", background: "#dbeafe", borderRadius: 3, padding: "1px 4px" }}>새 폴더</span>
        )}
        {node.files.length > 0 && (
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 2 }}>({node.files.length})</span>
        )}
      </div>

      {/* ── 자식 노드 + 파일 ── */}
      {open && (
        <>
          {Array.from(node.children.values()).map((child) => {
            const childPath = folderPath ? `${folderPath}\\${child.name}` : child.name;
            return (
              <TreePane key={child.name} node={child} depth={depth + 1} mode={mode} folderPath={childPath}
                onToggleSkip={onToggleSkip} onToggleFolderSkip={onToggleFolderSkip}
                planIndex={planIndex} plans={plans}
                onDragStart={onDragStart} onDragEnd={onDragEnd} onDropOnFolder={onDropOnFolder} onSetDropTarget={onSetDropTarget}
                dragSrcPath={dragSrcPath} dropTarget={dropTarget}
                editing={editing} editVal={editVal}
                onStartEdit={onStartEdit} onEditChange={onEditChange} onCommitEdit={onCommitEdit} onCancelEdit={onCancelEdit}
              />
            );
          })}
          {node.files.map((p) => {
            const idx = planIndex?.get(p.srcPath) ?? -1;
            const isEditingThisFile = editing?.type === "file" && editing.srcPath === p.srcPath;
            const isDragging = dragSrcPath === p.srcPath;
            return (
              <div key={p.srcPath}
                draggable={mode === "after"}
                onDragStart={mode === "after" && onDragStart ? (e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(p.srcPath); } : undefined}
                onDragEnd={mode === "after" && onDragEnd ? () => onDragEnd() : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "2px 8px",
                  paddingLeft: 8 + indent + 14, opacity: isDragging ? 0.3 : (p.skip ? 0.35 : 1),
                  cursor: mode === "after" ? "grab" : "default",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {mode === "current" && onToggleSkip && idx >= 0 && (
                  <input type="checkbox" checked={!p.skip} onChange={() => onToggleSkip(idx)}
                    style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()} />
                )}
                <span style={{ fontSize: 13, flexShrink: 0 }}>{fileIcon(p.ext)}</span>

                {/* 파일명: 편집 중이면 InlineEdit */}
                {isEditingThisFile && onEditChange && onCommitEdit && onCancelEdit ? (
                  <InlineEdit value={editVal ?? ""} onChange={onEditChange} onCommit={onCommitEdit} onCancel={onCancelEdit} />
                ) : (
                  <span
                    onDoubleClick={mode === "current" && onStartEdit ? (e) => {
                      e.stopPropagation(); onStartEdit({ type: "file", srcPath: p.srcPath }, p.fileName);
                    } : undefined}
                    style={{
                      fontSize: 11, color: "#374151", flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      textDecoration: p.skip ? "line-through" : "none",
                      cursor: mode === "current" ? "text" : "grab",
                    }} title={p.srcPath}>
                    {p.fileName}
                  </span>
                )}

                {mode === "current" && !p.skip && (
                  <span style={{ fontSize: 9, color: "#6b7280", flexShrink: 0, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={p.destFolder}>
                    → {p.destFolder.split(/[/\\]/).pop()}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
interface Props {
  folder: ManagedFolder;
  onCancel: () => void;
  onRefresh: () => void;
}

export default function SmartOrganizeView({ folder, onCancel, onRefresh }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SmartOrganizeFilePlan[]>([]);
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState<{
    moved: number; skipped: number; failed: number;
    errors: string[]; logs: string[];
    ops: Array<{ source: string; dest: string }>;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null);
  // drag & drop
  const [dragSrcPath, setDragSrcPath] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // inline edit
  const [editing, setEditing] = useState<{ type: "file"; srcPath: string } | { type: "folder"; path: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  // custom folders
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  // active template folders (빈 폴더 포함 표시)
  const [activeTemplateFolders, setActiveTemplateFolders] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setActiveProfileName(null);
    window.electronAPI?.readDirRecursive(folder.path).then((res) => {
      if (res?.ok && res.data) setPlans(buildPlans(res.data));
      else setError(res?.error ?? "파일 목록 불러오기 실패");
    }).finally(() => setLoading(false));
  }, [folder.path]);

  function toggleSkip(idx: number) {
    setPlans((prev) => prev.map((p, i) => i === idx ? { ...p, skip: !p.skip } : p));
  }

  function toggleFolderSkip(srcPaths: string[]) {
    const pathSet = new Set(srcPaths);
    setPlans((prev) => {
      const planMap = new Map(prev.map((p) => [p.srcPath, p]));
      const allActive = srcPaths.every((p) => { const plan = planMap.get(p); return plan && !plan.skip; });
      return prev.map((p) => pathSet.has(p.srcPath) ? { ...p, skip: allActive } : p);
    });
  }

  /* ── 드래그 & 드롭: 정리 후 패널에서 파일을 다른 폴더로 이동 ── */
  function handleDrop(targetFolder: string) {
    if (!dragSrcPath) return;
    setPlans((prev) => prev.map((p) =>
      p.srcPath === dragSrcPath ? { ...p, destFolder: targetFolder, reason: "수동 이동" } : p
    ));
    setDragSrcPath(null);
    setDropTarget(null);
  }

  /* ── 인라인 편집: 파일명 / 폴더명 ── */
  function startEdit(target: { type: "file"; srcPath: string } | { type: "folder"; path: string }, name: string) {
    setEditing(target);
    setEditVal(name);
  }
  function commitEdit() {
    if (!editing) return;
    const val = editVal.trim();
    if (!val) { setEditing(null); return; }

    if (editing.type === "file") {
      setPlans((prev) => prev.map((p) =>
        p.srcPath === editing.srcPath ? { ...p, fileName: val } : p
      ));
    } else {
      // 폴더명 변경: "사용자지정" placeholder → customFolders에 추가
      const oldPath = editing.path;
      if (oldPath === CUSTOM_PLACEHOLDER && val !== CUSTOM_PLACEHOLDER) {
        setCustomFolders((prev) => [...prev, val]);
        setEditing(null);
        return;
      }
      // 일반 폴더명 변경: destFolder 경로 일괄 갱신
      const parts = oldPath.split("\\");
      parts[parts.length - 1] = val;
      const newPath = parts.join("\\");
      if (newPath === oldPath) { setEditing(null); return; }
      setPlans((prev) => prev.map((p) => {
        if (p.destFolder === oldPath) return { ...p, destFolder: newPath, reason: "수동 편집" };
        if (p.destFolder.startsWith(oldPath + "\\")) return { ...p, destFolder: newPath + p.destFolder.slice(oldPath.length), reason: "수동 편집" };
        return p;
      }));
      // customFolders도 갱신
      setCustomFolders((prev) => prev.map((cf) => cf === oldPath ? newPath : cf));
    }
    setEditing(null);
  }
  function cancelEdit() { setEditing(null); }

  function applyTemplate(profile: TemplateProfile) {
    setCustomFolders([]);
    setActiveTemplateFolders(profile.folders);
    // 파일 재분류 (skip 상태는 유지, 실제 폴더 생성은 정리 실행 시)
    setPlans((prev) => prev.map((p) => ({
      ...p,
      destFolder: profile.classify(p.fileName, p.ext),
      reason: `${profile.name} 템플릿`,
    })));
    setActiveProfileName(profile.name);
    const count = plans.filter((p) => !p.skip).length;
    setToast({ msg: `"${profile.name}" 미리보기 적용 — ${count}개 파일 재분류 (폴더 생성은 정리 실행 시)`, ok: true });
    setTimeout(() => setToast(null), 3500);
  }

  async function execute() {
    const toMove = plans.filter((p) => !p.skip);
    if (toMove.length === 0) {
      setToast({ msg: "이동할 파일이 없습니다.", ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setExecuting(true);
    const logs: string[] = [];

    // 1. 폴더 구조 생성 (템플릿 + 사용자지정)
    const allFolders = [...activeTemplateFolders, ...customFolders];
    if (allFolders.length > 0) {
      const fRes = await window.electronAPI?.createFolders(folder.path, allFolders);
      if (fRes?.ok) {
        logs.push(`📁 폴더 ${allFolders.length}개 생성 완료`);
      } else {
        logs.push(`⚠️ 폴더 생성 실패: ${fRes?.error}`);
      }
    }

    // 2. 파일 이동
    const moves = toMove.map((p) => ({
      source: p.srcPath,
      destFolder: `${folder.path}\\${p.destFolder}`,
    }));
    const res = await window.electronAPI?.organizeCustom?.(moves);
    const result = res?.data;
    const ops: Array<{ source: string; dest: string }> = result?.ops ?? [];

    // 이동 로그 생성
    for (const op of ops) {
      const srcName = op.source.split(/[/\\]/).pop();
      const destRel = op.dest.startsWith(folder.path) ? op.dest.slice(folder.path.length + 1) : op.dest;
      logs.push(`✅ ${srcName} → ${destRel}`);
    }
    if (result?.failed) {
      for (const e of (result.errors ?? [])) logs.push(`❌ ${e}`);
    }

    setDone({
      moved: result?.moved ?? 0,
      skipped: plans.filter((p) => p.skip).length,
      failed: result?.failed ?? (res?.ok ? 0 : toMove.length),
      errors: result?.errors ?? (res?.error ? [res.error] : []),
      logs, ops,
    });
    setExecuting(false);
    onRefresh();
  }

  async function handleUndo() {
    if (!done || done.ops.length === 0) return;
    setUndoing(true);
    const res = await window.electronAPI?.undoMoves?.(done.ops);
    setUndoing(false);
    if (res?.ok) {
      const { restored } = res.data!;
      setToast({ msg: `✅ ${restored}개 파일 원래 위치로 복구 완료`, ok: true });
      setDone(null);
      onRefresh();
    } else {
      setToast({ msg: `⚠️ 복구 실패: ${res?.error}`, ok: false });
    }
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Loading / Error / Done ── */
  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af" }}>
      <div style={{ fontSize: 32 }}>🔍</div>
      <div style={{ fontSize: 13 }}>파일 분석 중...</div>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#dc2626" }}>
      <span>{error}</span>
      <button onClick={onCancel} style={{ padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", background: "#fff", fontFamily: "inherit" }}>닫기</button>
    </div>
  );

  if (done) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 28 }}>{done.failed > 0 ? "⚠️" : "✅"}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>정리 완료</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            이동: {done.moved}개 · 건너뜀: {done.skipped}개{done.failed > 0 ? ` · 실패: ${done.failed}개` : ""}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {done.ops.length > 0 && (
            <button onClick={handleUndo} disabled={undoing}
              style={{
                padding: "5px 14px", background: "#f59e0b", color: "#fff", border: "none",
                borderRadius: 5, cursor: undoing ? "not-allowed" : "pointer", fontSize: 12,
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                opacity: undoing ? 0.6 : 1,
              }}>
              <span>↩</span> {undoing ? "복구 중..." : "되돌리기"}
            </button>
          )}
          <button onClick={onCancel}
            style={{ padding: "5px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            닫기
          </button>
        </div>
      </div>

      {/* 실행 로그 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>실행 로그</div>
        <div style={{ background: "#f9fafb", border: "1px solid #e4e4e7", borderRadius: 6, padding: "8px 12px", fontFamily: "Consolas, monospace", fontSize: 11, lineHeight: 1.7 }}>
          {done.logs.map((log, i) => (
            <div key={i} style={{ color: log.startsWith("❌") ? "#dc2626" : log.startsWith("⚠️") ? "#d97706" : "#374151" }}>
              {log}
            </div>
          ))}
          {done.logs.length === 0 && <div style={{ color: "#9ca3af" }}>실행된 작업이 없습니다.</div>}
        </div>
      </div>

      {/* 되돌리기 안내 */}
      {done.ops.length > 0 && (
        <div style={{ padding: "8px 20px", borderTop: "1px solid #e4e4e7", background: "#fffbeb", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
            💡 <b>되돌리기 안내:</b> 이동된 파일을 원래 위치로 복구하려면 상단의 <b style={{ color: "#d97706" }}>↩ 되돌리기</b> 버튼을 클릭하세요.
            이 화면을 닫으면 복구할 수 없으니, 결과를 확인 후 진행하세요.
          </div>
        </div>
      )}
    </div>
  );

  const active = plans.filter((p) => !p.skip).length;
  const rootName = folder.path.split(/[/\\]/).pop() ?? folder.label;
  const planIndex = new Map<string, number>(plans.map((p, i) => [p.srcPath, i]));
  const currentTree = buildCurrentTree(plans, folder.path);
  const afterTree = buildAfterTree(plans, rootName, activeTemplateFolders.length > 0 ? activeTemplateFolders : undefined);
  // 이름순 정렬 (재귀)
  sortTreeChildren(afterTree);
  // 사용자지정 폴더 + placeholder 후처리 (정렬 후 추가하여 하단 배치)
  for (const cf of customFolders) {
    if (!afterTree.children.has(cf)) afterTree.children.set(cf, makeNode(cf, true, true));
  }
  // placeholder는 항상 마지막에 추가
  if (!afterTree.children.has(CUSTOM_PLACEHOLDER)) {
    afterTree.children.set(CUSTOM_PLACEHOLDER, makeNode(CUSTOM_PLACEHOLDER, true, true));
  } else {
    const existing = afterTree.children.get(CUSTOM_PLACEHOLDER)!;
    afterTree.children.delete(CUSTOM_PLACEHOLDER);
    afterTree.children.set(CUSTOM_PLACEHOLDER, existing);
  }

  function templateBtn(profile: TemplateProfile, isJob: boolean) {
    const isActive = activeProfileName === profile.name;
    const base = isJob
      ? { border: "1px solid #c4b5fd", background: "#faf5ff", color: "#6d28d9" }
      : { border: "1px solid #d1d5db", background: "#fff", color: "#374151" };
    const active_ = isJob
      ? { border: "1px solid #7c3aed", background: "#ede9fe", color: "#4c1d95", fontWeight: 700 }
      : { border: "1px solid #2563eb", background: "#dbeafe", color: "#1e40af", fontWeight: 700 };
    return (
      <button key={profile.name} onClick={() => applyTemplate(profile)}
        style={{ padding: "2px 9px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
          ...(isActive ? active_ : base) }}>
        {profile.name}
        {isActive && <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>}
      </button>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>✨ 스마트 정리</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{folder.label}</span>
          {activeProfileName && (
            <span style={{ fontSize: 10, color: "#6d28d9", background: "#ede9fe", borderRadius: 3, padding: "1px 6px" }}>
              {activeProfileName}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#9ca3af" }}>총 {plans.length}개 · 이동 {active}개 · 건너뜀 {plans.length - active}개</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onCancel} disabled={executing}
            style={{ padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 4, cursor: executing ? "not-allowed" : "pointer", background: "#fff", fontSize: 12, fontFamily: "inherit", opacity: executing ? 0.4 : 1 }}>
            취소
          </button>
          <button onClick={execute} disabled={executing || active === 0}
            style={{ padding: "4px 14px", background: active === 0 ? "#e5e7eb" : "#2563eb", color: active === 0 ? "#9ca3af" : "#fff", border: "none", borderRadius: 4, cursor: active === 0 ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}>
            {executing ? "이동 중..." : `${active}개 정리 실행`}
          </button>
        </div>
      </div>

      {/* ── 템플릿 바 ── */}
      <div style={{ padding: "5px 16px", borderBottom: "1px solid #e4e4e7", background: "#f9fafb", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, flexShrink: 0, minWidth: 44 }}>기본:</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {BASIC_PROFILES.map((p) => templateBtn(p, false))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, flexShrink: 0, minWidth: 44 }}>직군별:</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {getJobProfiles().map((p) => templateBtn(p, true))}
          </div>
        </div>
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div style={{ padding: "3px 16px", fontSize: 11, flexShrink: 0,
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#991b1b",
          borderBottom: `1px solid ${toast.ok ? "#bbf7d0" : "#fecaca"}` }}>
          {toast.ok ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      {/* ── Before / After 패널 ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* 왼쪽: 현재 상태 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #e4e4e7" }}>
          <div style={{ padding: "6px 12px", background: "#fef3c7", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 13 }}>📂</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>현재 상태</span>
            <span style={{ fontSize: 10, color: "#b45309", marginLeft: 4 }}>체크 해제 시 이동 제외</span>
            <span style={{ fontSize: 9, color: "#6b7280", marginLeft: "auto" }}>파일명 더블클릭으로 편집</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            <TreePane node={currentTree} mode="current" onToggleSkip={toggleSkip}
              onToggleFolderSkip={toggleFolderSkip} planIndex={planIndex} plans={plans}
              editing={editing} editVal={editVal}
              onStartEdit={startEdit} onEditChange={setEditVal} onCommitEdit={commitEdit} onCancelEdit={cancelEdit} />
          </div>
        </div>

        {/* 화살표 */}
        <div style={{ width: 32, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f9fafb", color: "#9ca3af", fontSize: 18 }}>
          <span>→</span>
        </div>

        {/* 오른쪽: 정리 후 상태 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "6px 12px", background: "#dcfce7", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 13 }}>✅</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>정리 후 상태</span>
            {activeProfileName
              ? <span style={{ fontSize: 10, color: "#15803d", marginLeft: 4 }}>📌 {activeProfileName} 기준</span>
              : <span style={{ fontSize: 10, color: "#15803d", marginLeft: 4 }}>파란색 = 새 폴더</span>
            }
            <span style={{ fontSize: 9, color: "#6b7280", marginLeft: "auto" }}>드래그로 이동 · 더블클릭 편집</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            <TreePane node={afterTree} mode="after"
              onDragStart={(sp) => setDragSrcPath(sp)}
              onDragEnd={() => { setDragSrcPath(null); setDropTarget(null); }}
              onDropOnFolder={handleDrop} onSetDropTarget={setDropTarget}
              dragSrcPath={dragSrcPath} dropTarget={dropTarget}
              editing={editing} editVal={editVal}
              onStartEdit={startEdit} onEditChange={setEditVal} onCommitEdit={commitEdit} onCancelEdit={cancelEdit}
              planIndex={planIndex} plans={plans} />
          </div>
        </div>

      </div>
    </div>
  );
}
