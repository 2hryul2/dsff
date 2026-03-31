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

/* ── 확장자 → 카테고리 매핑 ── */
const EXT_CATEGORY: Record<string, string> = {};
for (const ext of ["pdf","docx","doc","xlsx","xls","pptx","ppt","csv","xlsb","hwp","hwpx"]) EXT_CATEGORY[ext] = "문서";
for (const ext of ["png","jpg","jpeg","gif","svg","bmp","mp4"]) EXT_CATEGORY[ext] = "이미지";
for (const ext of ["ts","js","java","sh","bat","py","sql"]) EXT_CATEGORY[ext] = "코드";
for (const ext of ["json","yaml","yml","md","html","css","env"]) EXT_CATEGORY[ext] = "설정";
for (const ext of ["zip","7z","gz","vhdx","iso"]) EXT_CATEGORY[ext] = "압축";
for (const ext of ["ttf","otf"]) EXT_CATEGORY[ext] = "리소스";

/* ── 파일명 구조 패턴 (7종) ── */
const BIZ_CODE_RE   = /^(ITSM|INC|BUG|ISS|TC|PO|PRE)[-_](\d+)/i;
const PRJ_RE        = /^([A-Z]{2,6}[-_]\d{2,6})[_\-\s]/;
const DATE_LONG_RE  = /^(\d{4})(\d{2})\d{2}[_\-\s]/;
const DATE_SHORT_RE = /^(\d{2})(\d{2})\d{2}[_\-\s]/;
const DATE_DASH_RE  = /^(\d{4})-(\d{2})-\d{2}[_\-\s]/;
const VER_RE        = /[_\-\s][Vv](\d+[\d.]*)/;

/* ── 기본 자동 분류 (7단계 우선순위) ── */
function autoClassify(name: string, ext: string): string {
  // 1. 업무코드 (ITSM/INC/BUG/ISS/TC/PO/PRE)
  const bizM = name.match(BIZ_CODE_RE);
  if (bizM) return `업무코드\\${bizM[1].toUpperCase()}-${bizM[2]}`;
  // 2. 프로젝트 코드
  const prjM = name.match(PRJ_RE);
  if (prjM) return `프로젝트별\\${prjM[1]}`;
  // 3. 날짜 YYYYMMDD
  const dateM = name.match(DATE_LONG_RE);
  if (dateM) return `${dateM[1]}년\\${dateM[1]}${dateM[2]}`;
  // 4. 날짜 YYMMDD (20~30 범위)
  const shortM = name.match(DATE_SHORT_RE);
  if (shortM && +shortM[1] >= 20 && +shortM[1] <= 30) return `20${shortM[1]}년\\20${shortM[1]}${shortM[2]}`;
  // 5. 날짜 YYYY-MM-DD
  const dashM = name.match(DATE_DASH_RE);
  if (dashM) return `${dashM[1]}년\\${dashM[1]}${dashM[2]}`;
  // 6. 버전
  if (VER_RE.test(name)) return `버전관리\\${name.split(/[_\-]/)[0]}`;
  // 7. 확장자 카테고리
  return EXT_CATEGORY[ext] ?? "기타";
}

/* ── 데이터 주도형 규칙 엔진 ── */
interface ClassifyRule {
  pattern: string;       // 정규식 문자열 (파일명 매칭)
  folder: string;        // 대상 폴더 경로
  extMatch?: string;     // 확장자 카테고리 매칭 (선택)
}

function classifyByRules(rules: ClassifyRule[], name: string, ext: string, fallback: string): string {
  const lc = name.toLowerCase();
  for (const r of rules) {
    if (r.pattern && new RegExp(r.pattern, "i").test(lc)) return r.folder;
    if (r.extMatch && EXT_CATEGORY[ext] === r.extMatch) return r.folder;
  }
  return fallback;
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

/* ── 업무 문서형 규칙 테이블 ── */
const DOC_RULES: ClassifyRule[] = [
  { pattern: "[A-Z]{2,6}[-_]\\d{2,6}|프로젝트|pjt", folder: "프로젝트별" },
  { pattern: "계약|contract|협약|mou", folder: "문서\\계약서" },
  { pattern: "기획|plan|proposal|제안|요구사항", folder: "문서\\기획안" },
  { pattern: "", folder: "이미지", extMatch: "이미지" },
  { pattern: "", folder: "문서\\보고서", extMatch: "문서" },
];

const BASIC_PROFILES: TemplateProfile[] = [
  {
    name: "기본 분류",
    folders: ["문서", "이미지", "코드", "설정", "압축", "리소스", "기타", "삭제대상"],
    classify: autoClassify,
  },
  {
    name: "업무 문서형",
    folders: ["문서\\보고서", "문서\\기획안", "문서\\계약서", "이미지", "프로젝트별", "기타", "삭제대상"],
    classify: (name, ext) => classifyByRules(DOC_RULES, name, ext, "기타"),
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

/* ══════════════════════════════════════════════════════════════
   직군별 규칙 테이블 (데이터 주도형 — 총 432+ 규칙)
   ══════════════════════════════════════════════════════════════ */

const RULES_EXECUTIVE: ClassifyRule[] = [
  /* ── 00_업무보고 ── */
  { pattern: "월간보고|monthly|분기보고|quarterly|반기|상반기|하반기", folder: "00_업무보고\\월간보고" },
  { pattern: "실적|매출|revenue|performance|경영실적|영업이익|당기순이익", folder: "00_업무보고\\월간보고" },
  { pattern: "kpi|핵심지표|대시보드|dashboard|경영지표|bsc", folder: "00_업무보고\\월간보고" },
  { pattern: "사업현황|사업실적|분기실적|연간실적|사업성과", folder: "00_업무보고\\월간보고" },
  { pattern: "임원회의|임원보고|회의자료|agenda|안건|이사회|경영회의", folder: "00_업무보고\\임원회의" },
  { pattern: "경영진|ceo|cto|cfo|coo|ciso|부사장|전무|상무|본부장", folder: "00_업무보고\\임원회의" },
  { pattern: "전략회의|경영전략|이사회안건|의결안건|보고안건", folder: "00_업무보고\\임원회의" },
  { pattern: "워크숍|workshop|세미나|seminar|포럼|forum|컨퍼런스", folder: "00_업무보고\\임원회의" },
  /* ── 20_전략_기밀 ── */
  { pattern: "m&a|인수|ma검토|합병|인수합병|기업인수|피인수|매각", folder: "20_전략_기밀\\21_M&A검토" },
  { pattern: "실사|due.?diligence|가치평가|valuation|시너지", folder: "20_전략_기밀\\21_M&A검토" },
  { pattern: "전략|기밀|신사업|예산|budget|투자|roi|사업비", folder: "20_전략_기밀\\22_신사업계획" },
  { pattern: "투자심의|리스크|risk|사업보고서|지분|주주|배당", folder: "20_전략_기밀\\22_신사업계획" },
  { pattern: "사업계획서|중장기|3개년|5개년|로드맵|roadmap", folder: "20_전략_기밀\\22_신사업계획" },
  { pattern: "시장분석|market.?analysis|경쟁분석|swot|벤치마크", folder: "20_전략_기밀\\22_신사업계획" },
  { pattern: "자회사|계열사|지주회사|그룹사|관계사|출자", folder: "20_전략_기밀\\22_신사업계획" },
  { pattern: "특허|patent|지적재산|ip|기술이전|라이센싱", folder: "20_전략_기밀\\22_신사업계획" },
  /* ── 30_외부기관 ── */
  { pattern: "고객사|고객|client|거래처|발주처|원청", folder: "30_외부기관\\31_고객사" },
  { pattern: "납기|delivery|sla|서비스수준|고객만족|cs", folder: "30_외부기관\\31_고객사" },
  { pattern: "협력사|협력업체|파트너|vendor|하청|외주|아웃소싱", folder: "30_외부기관\\32_협력사" },
  { pattern: "공급업체|supplier|벤더평가|업체관리", folder: "30_외부기관\\32_협력사" },
  { pattern: "금융|법률|세무|법무|감독원|감사보고|내부감사|외부감사", folder: "30_외부기관\\33_금융·법률" },
  { pattern: "컴플라이언스|compliance|규제|정부|관공서|공공기관", folder: "30_외부기관\\33_금융·법률" },
  { pattern: "금감원|공정위|국세청|관세청|노동부|고용부", folder: "30_외부기관\\33_금융·법률" },
  { pattern: "소송|lawsuit|분쟁|중재|조정|자문|법률의견", folder: "30_외부기관\\33_금융·법률" },
  /* ── 40_인사_조직 ── */
  { pattern: "인사|조직|규정|정관|규칙|지침|위임전결|결재규정", folder: "40_인사_조직" },
  { pattern: "조직개편|조직변경|부서신설|부서통합|직제|정원", folder: "40_인사_조직" },
  { pattern: "이사회규정|윤리규정|행동강령|내규|사규", folder: "40_인사_조직" },
  { pattern: "복무|근무규정|취업규칙|복무규정|인사규정", folder: "40_인사_조직" },
  /* ── 기타 ── */
  { pattern: "archive|아카이브|보관|정리|종결", folder: "90_Archive" },
  { pattern: "공문|공지|notice|회람|시달|고시|통보|안내문", folder: "01_수신함" },
  { pattern: "메모|memo|참고|fyi|전달사항|공유", folder: "01_수신함" },
  { pattern: "주간보고|weekly|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
  { pattern: "업무일지|업무보고|주보|팀보고|부서보고", folder: "00_업무보고\\주간보고" },
];

const RULES_DEVELOPER: ClassifyRule[] = [
  /* ── 00_업무보고 ── */
  { pattern: "월간보고|monthly|분기보고|quarterly|반기보고", folder: "00_업무보고\\월간보고" },
  { pattern: "임원|경영진|cto|본부장", folder: "00_업무보고\\임원회의" },
  /* ── 30_QA ── */
  { pattern: "tc[-_]|테스트케이스|testcase|test.?case", folder: "30_QA\\32_테스트케이스" },
  { pattern: "테스트시나리오|test.?scenario|테스트항목|검증항목", folder: "30_QA\\32_테스트케이스" },
  { pattern: "자동화테스트|automation.?test|셀레니움|selenium|junit|pytest", folder: "30_QA\\32_테스트케이스" },
  { pattern: "회귀테스트|regression|smoke.?test|sanity", folder: "30_QA\\32_테스트케이스" },
  { pattern: "bug[-_]|결함|버그|defect|오류|error.?report", folder: "30_QA\\33_결함관리" },
  { pattern: "결함목록|bug.?list|defect.?list|이슈목록|issue.?list", folder: "30_QA\\33_결함관리" },
  { pattern: "결함추적|bug.?tracking|결함통계|결함분석", folder: "30_QA\\33_결함관리" },
  { pattern: "증적|스크린샷|캡처|screenshot|화면캡처|evidence", folder: "30_QA\\34_증적" },
  { pattern: "", folder: "30_QA\\34_증적", extMatch: "이미지" },
  { pattern: "보안취약점|시큐어코딩|secure.?coding|owasp|xss|injection", folder: "30_QA\\34_증적" },
  { pattern: "정적분석|sonar|lint|코드품질|code.?quality", folder: "30_QA\\34_증적" },
  { pattern: "취약점점검|모의해킹|penetration|pentest", folder: "30_QA\\34_증적" },
  { pattern: "테스트계획|testplan|test.?plan|단위테스트|unittest|unit.?test", folder: "30_QA\\31_테스트계획" },
  { pattern: "통합테스트|integration.?test|성능테스트|부하테스트|load.?test", folder: "30_QA\\31_테스트계획" },
  { pattern: "스트레스테스트|stress.?test|인수테스트|uat|사용자테스트", folder: "30_QA\\31_테스트계획" },
  { pattern: "테스트전략|test.?strategy|테스트환경|test.?env", folder: "30_QA\\31_테스트계획" },
  { pattern: "결과보고|테스트결과|test.?result|qa보고", folder: "30_QA\\35_결과보고서" },
  { pattern: "품질보고|quality.?report|품질분석|커버리지|coverage", folder: "30_QA\\35_결과보고서" },
  /* ── 20_설계개발 ── */
  { pattern: "iss[-_]|요구사항|요구명세|프로세스정의|업무흐름|bpmn", folder: "20_설계개발\\21_요구사항" },
  { pattern: "기능명세|functional.?spec|비기능|non.?functional|srs", folder: "20_설계개발\\21_요구사항" },
  { pattern: "유스케이스|use.?case|사용자스토리|user.?story|요구분석", folder: "20_설계개발\\21_요구사항" },
  { pattern: "트레이서빌리티|traceability|추적표|rtm", folder: "20_설계개발\\21_요구사항" },
  { pattern: "아키텍처|architecture|db설계|api명세|api.?spec|api설계", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "erd|스키마|schema|ddl|dml|테이블설계|테이블명세", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "시퀀스|sequence|flowchart|다이어그램|클래스설계|class.?diagram", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "인터페이스|interface|연동명세|연동설계|연동규격", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "마이그레이션|migration|이행|데이터전환|이행계획|이행절차", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "형상관리|svn|git|baseline|형상변경|코딩표준|개발표준|naming.?convention", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "시스템구성도|네트워크구성|인프라설계|배포구성|deploy.?diagram", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "기술스택|tech.?stack|프레임워크|framework|라이브러리선정", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "모듈설계|컴포넌트설계|component|마이크로서비스|microservice", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "보안설계|인증설계|auth|암호화|encryption|접근제어|rbac", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "성능설계|캐싱|caching|큐|queue|메시징|kafka|rabbitmq", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "배치설계|batch|스케줄러|scheduler|etl|데이터파이프라인", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "로그설계|logging|모니터링설계|알림설계|apm", folder: "20_설계개발\\22_아키텍처" },
  { pattern: "화면설계|ui|ux|wireframe|화면정의|스토리보드|mockup|prototype", folder: "20_설계개발\\23_화면설계" },
  { pattern: "디자인가이드|design.?guide|스타일가이드|style.?guide|gui", folder: "20_설계개발\\23_화면설계" },
  { pattern: "접근성|accessibility|wcag|반응형|responsive", folder: "20_설계개발\\23_화면설계" },
  { pattern: "회의록|meeting|미팅|코드리뷰|review|리뷰|검수회의", folder: "20_설계개발\\24_회의록" },
  { pattern: "기술검토|아키텍처리뷰|설계리뷰|design.?review", folder: "20_설계개발\\24_회의록" },
  { pattern: "데일리|daily.?scrum|스탠드업|standup|회의메모", folder: "20_설계개발\\24_회의록" },
  { pattern: "회고|retrospective|retro|lessons.?learned|피드백", folder: "20_설계개발\\24_회의록" },
  /* ── 10_PM기획 ── */
  { pattern: "착수|kickoff|단가|공수|맨먼스|m\\.m|man.?month", folder: "10_PM기획\\11_착수" },
  { pattern: "착수보고|프로젝트헌장|project.?charter|sow|범위정의", folder: "10_PM기획\\11_착수" },
  { pattern: "투입계획|인력배치|resource.?plan|역할분담|raci", folder: "10_PM기획\\11_착수" },
  { pattern: "원가산정|비용산정|estimation|견적산출", folder: "10_PM기획\\11_착수" },
  { pattern: "일정|wbs|이슈|issue|변경요청|cr[-_]|change.?request", folder: "10_PM기획\\12_일정·이슈" },
  { pattern: "스프린트|sprint|백로그|backlog|칸반|kanban|지라|jira", folder: "10_PM기획\\12_일정·이슈" },
  { pattern: "마일스톤|milestone|진척률|진행률|progress|간트|gantt", folder: "10_PM기획\\12_일정·이슈" },
  { pattern: "리스크관리|risk.?management|이슈관리|이슈대장", folder: "10_PM기획\\12_일정·이슈" },
  { pattern: "의사결정|decision.?log|변경이력|변경대장", folder: "10_PM기획\\12_일정·이슈" },
  { pattern: "감리|감사|감리대응|감리체크|감리지적|시정조치", folder: "10_PM기획\\14_감리_감사대응" },
  { pattern: "준수확인|법적요건|법정감사|내부통제", folder: "10_PM기획\\14_감리_감사대응" },
  { pattern: "고객사통신|고객사|고객요청|요청사항|협의사항|질의응답", folder: "10_PM기획\\13_고객사통신" },
  { pattern: "고객승인|고객검토|고객확인|고객피드백", folder: "10_PM기획\\13_고객사통신" },
  /* ── 40_종료 ── */
  { pattern: "인수인계|handover|hand.?over|업무이관|담당이관", folder: "40_종료\\42_인수인계" },
  { pattern: "유지보수|maintenance|운영이관|운영계획|sla", folder: "40_종료\\43_유지보수" },
  { pattern: "하자보수|하자기간|warranty|보증기간", folder: "40_종료\\43_유지보수" },
  { pattern: "최종산출물|납품|릴리즈|release|배포|deploy|빌드", folder: "40_종료\\41_최종산출물" },
  { pattern: "산출물목록|checklist|체크리스트|산출물현황|산출물일람", folder: "40_종료\\41_최종산출물" },
  { pattern: "사용자매뉴얼|user.?manual|운영자매뉴얼|admin.?manual|설치매뉴얼", folder: "40_종료\\41_최종산출물" },
  { pattern: "완료보고|종료보고|close.?out|프로젝트종료", folder: "40_종료\\41_최종산출물" },
  { pattern: "교육자료|사용자교육|운영자교육|전수교육", folder: "40_종료\\41_최종산출물" },
  /* ── 폴백 ── */
  { pattern: "", folder: "20_설계개발\\22_아키텍처", extMatch: "코드" },
  { pattern: "주간보고|weekly|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
  { pattern: "업무일지|업무보고|주보|팀보고", folder: "00_업무보고\\주간보고" },
];

const RULES_INFRA: ClassifyRule[] = [
  /* ── 00_업무보고 ── */
  { pattern: "월간보고|monthly|분기보고|quarterly|반기보고", folder: "00_업무보고\\월간보고" },
  { pattern: "운영보고|운영월보|운영실적|운영현황보고", folder: "00_업무보고\\월간보고" },
  { pattern: "임원|경영진|cto|ciso|본부장", folder: "00_업무보고\\임원회의" },
  /* ── 20_구성관리 ── */
  { pattern: "itsm|변경요청|변경관리|구성관리|cmdb", folder: "20_구성관리" },
  { pattern: "백업|backup|복구|recovery|리스토어|restore|백업정책", folder: "20_구성관리" },
  { pattern: "네트워크|network|방화벽|firewall|acl|vlan|라우팅|스위칭", folder: "20_구성관리" },
  { pattern: "패치|patch|업데이트|update|hotfix|보안패치|os패치", folder: "20_구성관리" },
  { pattern: "dr|재해복구|disaster|bcp|업무연속성|rpo|rto", folder: "20_구성관리" },
  { pattern: "서버증설|증설|scale|확장|이중화|ha|고가용|클러스터", folder: "20_구성관리" },
  { pattern: "인증서|ssl|tls|cert|certificate|인증서갱신|인증서만료", folder: "20_구성관리" },
  { pattern: "자산|asset|인벤토리|inventory|라이선스|license|sw자산", folder: "20_구성관리" },
  { pattern: "이관|전환|cutover|마이그레이션|migration|시스템이관", folder: "20_구성관리" },
  { pattern: "작업계획서|작업요청|작업결과|작업보고|정기작업", folder: "20_구성관리" },
  { pattern: "vm|가상화|vmware|hyper-v|docker|컨테이너|k8s|kubernetes", folder: "20_구성관리" },
  { pattern: "dns|도메인|로드밸런서|lb|프록시|proxy|cdn|waf", folder: "20_구성관리" },
  { pattern: "스토리지|nas|san|오브젝트스토리지|s3|디스크증설", folder: "20_구성관리" },
  { pattern: "데이터베이스|db|oracle|mysql|mssql|postgresql|redis|mongodb", folder: "20_구성관리" },
  { pattern: "미들웨어|was|tomcat|jboss|weblogic|nginx|apache|iis", folder: "20_구성관리" },
  { pattern: "배포|deploy|ci|cd|jenkins|gitlab|pipeline|빌드서버", folder: "20_구성관리" },
  { pattern: "형상관리|git|svn|nexus|artifactory|레지스트리|registry", folder: "20_구성관리" },
  { pattern: "계정관리|ad|ldap|sso|접근권한|권한신청|권한회수", folder: "20_구성관리" },
  /* ── 30_장애대응 ── */
  { pattern: "증적|스크린샷|캡처|로그분석|로그|syslog|이벤트로그", folder: "30_장애대응\\31_증적" },
  { pattern: "덤프|dump|thread.?dump|heap.?dump|코어덤프|core.?dump", folder: "30_장애대응\\31_증적" },
  { pattern: "타임라인|timeline|경위서|조치내역|장애경위", folder: "30_장애대응\\31_증적" },
  { pattern: "", folder: "30_장애대응\\31_증적", extMatch: "이미지" },
  { pattern: "inc[-_]|장애|incident|장애보고|장애조치|rca|root.?cause", folder: "30_장애대응" },
  { pattern: "장애원인|장애분석|사후분석|postmortem|post.?mortem", folder: "30_장애대응" },
  { pattern: "서비스중단|다운타임|downtime|긴급복구|긴급조치", folder: "30_장애대응" },
  { pattern: "재발방지|개선대책|예방조치|corrective.?action", folder: "30_장애대응" },
  /* ── 40_점검결과 ── */
  { pattern: "점검|보안|security|취약|취약점|vulnerability", folder: "40_점검결과" },
  { pattern: "모니터링|monitoring|alert|알림|임계치|threshold", folder: "40_점검결과" },
  { pattern: "sla|용량|capacity|디스크|storage|cpu|메모리|memory", folder: "40_점검결과" },
  { pattern: "보안감사|ccm|isms|iso27001|pci.?dss|gdpr|개인정보", folder: "40_점검결과" },
  { pattern: "운영현황|가동률|uptime|가용성|availability", folder: "40_점검결과" },
  { pattern: "정기점검|일일점검|주간점검|월간점검|연간점검", folder: "40_점검결과" },
  { pattern: "성능측정|성능분석|performance|응답시간|tps|latency", folder: "40_점검결과" },
  { pattern: "네트워크점검|방화벽점검|서버점검|db점검|백업점검", folder: "40_점검결과" },
  { pattern: "침해사고|침입탐지|ids|ips|보안이벤트|siem", folder: "40_점검결과" },
  { pattern: "악성코드|malware|랜섬웨어|ransomware|바이러스|virus", folder: "40_점검결과" },
  /* ── 50_매뉴얼 ── */
  { pattern: "매뉴얼|manual|운영지침|가이드|guide|handbook", folder: "50_매뉴얼" },
  { pattern: "표준절차|sop|standard.?operating|운영절차|작업절차", folder: "50_매뉴얼" },
  { pattern: "설치가이드|install.?guide|구축가이드|setup.?guide", folder: "50_매뉴얼" },
  { pattern: "장애대응절차|에스컬레이션|escalation|비상연락", folder: "50_매뉴얼" },
  { pattern: "faq|문의응답|트러블슈팅|troubleshoot|known.?issue", folder: "50_매뉴얼" },
  /* ── 폴백 ── */
  { pattern: "주간보고|weekly|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
  { pattern: "업무일지|업무보고|주보|팀보고|운영일지", folder: "00_업무보고\\주간보고" },
];

const RULES_SALES: ClassifyRule[] = [
  /* ── 00_업무보고 ── */
  { pattern: "월간보고|monthly|분기보고|quarterly|반기보고", folder: "00_업무보고\\월간보고" },
  { pattern: "영업실적|파이프라인|pipeline|영업현황|매출현황", folder: "00_업무보고\\월간보고" },
  { pattern: "임원|경영진|영업본부장", folder: "00_업무보고\\임원회의" },
  /* ── 20_수주활동 ── */
  { pattern: "rfp|제안서.*발송|발송본|제출본|최종제출", folder: "20_수주활동\\22_제안서_발송본" },
  { pattern: "발송확인|접수확인|접수번호|제출확인", folder: "20_수주활동\\22_제안서_발송본" },
  { pattern: "제안서|proposal|제안요약|executive.?summary|요약본", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "bmc|사업계획|사업제안|사업기획|수행계획|수행방안|방법론|methodology", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "기술평가|기술검토|기술제안|레퍼런스|reference|구축사례|수행실적", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "제안전략|win.?strategy|차별화|핵심메시지|경쟁분석", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "요구사항분석|rfp분석|제안범위|scope|규격서|사양서", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "인력투입계획|투입인력|이력서|resume|cv|기술인력", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "프로젝트관리방안|품질관리방안|보안관리방안", folder: "20_수주활동\\21_제안서_작업" },
  { pattern: "견적|원가|비용|nda|비밀유지|기밀유지|비밀보호", folder: "20_수주활동\\23_견적·원가" },
  { pattern: "파트너|컨소시엄|공동수행|하도급|계약조건|약관|terms|sow", folder: "20_수주활동\\23_견적·원가" },
  { pattern: "가격제안|price|pricing|단가|원가분석|cost.?analysis", folder: "20_수주활동\\23_견적·원가" },
  { pattern: "이윤|마진|margin|수익률|수익분석", folder: "20_수주활동\\23_견적·원가" },
  { pattern: "계약조건|payment.?terms|지급조건|납기조건", folder: "20_수주활동\\23_견적·원가" },
  { pattern: "pt|프레젠|발표|데모|demo|poc|시연|프로토타입", folder: "20_수주활동\\24_PT자료" },
  { pattern: "기술발표|기술pt|브리핑|briefing|설명회|사전설명", folder: "20_수주활동\\24_PT자료" },
  { pattern: "질의답변|q&a|질의서|응답서|기술질의", folder: "20_수주활동\\24_PT자료" },
  { pattern: "pre[-_]|수주|입찰|공고|입찰공고|나라장터|g2b", folder: "20_수주활동" },
  { pattern: "사전규격|사전규격검토|기술규격|규격공고", folder: "20_수주활동" },
  /* ── 기타 ── */
  { pattern: "archive|실패|종료|패인분석|실패원인", folder: "90_Archive_실패" },
  { pattern: "수주실패|탈락|미선정|차순위|패찰", folder: "90_Archive_실패" },
  { pattern: "고객요구|고객니즈|voc|고객분석|시장조사|market", folder: "30_참조자료" },
  { pattern: "업계동향|트렌드|trend|벤치마크|benchmark|경쟁사", folder: "30_참조자료" },
  { pattern: "기술동향|기술자료|백서|whitepaper|솔루션소개", folder: "30_참조자료" },
  { pattern: "주간보고|weekly|영업|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
  { pattern: "영업일지|영업활동|고객미팅|방문보고|상담일지", folder: "00_업무보고\\주간보고" },
];

const RULES_PROCUREMENT: ClassifyRule[] = [
  /* ── 00_업무보고 ── */
  { pattern: "월간보고|monthly|분기보고|quarterly|반기보고", folder: "00_업무보고\\월간보고" },
  { pattern: "구매현황|구매실적|계약현황|계약실적", folder: "00_업무보고\\월간보고" },
  { pattern: "임원|경영진|본부장", folder: "00_업무보고\\임원회의" },
  /* ── 30_계약서 ── */
  { pattern: "서명완료|서명본|원본|양해각서|mou|업무협약|기본합의", folder: "30_계약서\\31_원본_서명본" },
  { pattern: "날인|인감|공증|공증서|법인인감|원본스캔", folder: "30_계약서\\31_원본_서명본" },
  { pattern: "최종계약|체결완료|계약체결|서명날인", folder: "30_계약서\\31_원본_서명본" },
  { pattern: "계약|contract|보증|warranty|하자|하자보증|유지보수계약", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "변경계약|추가계약|연장|갱신|renewal|계약변경", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "보험|insurance|이행보증|계약보증|보증보험|보증금", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "위수탁|위임계약|도급계약|용역계약|파견계약|외주계약", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "비밀유지|nda|기밀유지|정보보호|비밀유지각서", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "라이선스|license|sw계약|사용권|구독|subscription", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "계약초안|draft|검토본|수정본|회신본|협의본", folder: "30_계약서\\32_사본_작업본" },
  { pattern: "약관|general.?terms|특약|특수조건|부속합의", folder: "30_계약서\\32_사본_작업본" },
  /* ── 20_구매 ── */
  { pattern: "견적|po[-_]|발주|품의|구매|비교검토", folder: "20_구매" },
  { pattern: "납품|검수|검수서|검수조서|인수시험|인수검사", folder: "20_구매" },
  { pattern: "세금계산서|invoice|tax|영수증|지출|지출결의", folder: "20_구매" },
  { pattern: "입찰공고|입찰서|투찰|낙찰|입찰참가|자격심사", folder: "20_구매" },
  { pattern: "비교견적|업체선정|평가표|심사표|적격심사|기술심사", folder: "20_구매" },
  { pattern: "대금청구|지급요청|payment|정산|선급금|중도금|잔금", folder: "20_구매" },
  { pattern: "수의계약|긴급구매|소액구매|단가계약|연간계약", folder: "20_구매" },
  { pattern: "사양서|spec|스펙|기술사양|하드웨어|소프트웨어|hw|sw", folder: "20_구매" },
  { pattern: "벤더|vendor|업체목록|업체평가|거래처|공급업체", folder: "20_구매" },
  { pattern: "재고|inventory|자재|물품|비품|소모품", folder: "20_구매" },
  /* ── 기타 ── */
  { pattern: "archive|완료|종결|만료|계약종료", folder: "90_Archive_완료" },
  { pattern: "주간보고|weekly|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
  { pattern: "업무일지|구매일지|계약일지", folder: "00_업무보고\\주간보고" },
];

function getHrRules(yr: number): ClassifyRule[] {
  return [
    /* ── 00_업무보고 ── */
    { pattern: "월간보고|monthly|분기보고|quarterly|반기보고", folder: "00_업무보고\\월간보고" },
    { pattern: "인력현황보고|인사현황|채용현황|이직률|turnover", folder: "00_업무보고\\월간보고" },
    { pattern: "임원|경영진|인사본부장", folder: "00_업무보고\\임원회의" },
    /* ── 20_채용 ── */
    { pattern: "이력서|resume|cv|경력기술서|자기소개서|포트폴리오", folder: `20_채용\\21_${yr}_공채\\이력서` },
    { pattern: "지원서|입사지원|apply|application|지원양식", folder: `20_채용\\21_${yr}_공채\\이력서` },
    { pattern: "채용공고|jd|job.?description|모집요강|채용안내", folder: `20_채용\\21_${yr}_공채\\이력서` },
    { pattern: "헤드헌팅|headhunt|서치펌|인재추천|추천서", folder: `20_채용\\21_${yr}_공채\\이력서` },
    { pattern: "면접|interview|면접평가|면접질문|면접결과", folder: `20_채용\\21_${yr}_공채\\면접자료` },
    { pattern: "코딩테스트|coding.?test|기술면접|실기시험|필기시험", folder: `20_채용\\21_${yr}_공채\\면접자료` },
    { pattern: "평가기준|채점표|면접관|합격|불합격|최종합격", folder: `20_채용\\21_${yr}_공채\\면접자료` },
    { pattern: "처우협의|연봉협상|offer|오퍼|입사조건|처우조건", folder: `20_채용\\21_${yr}_공채\\면접자료` },
    /* ── 30_인사관리 ── */
    { pattern: "재직증명|근로계약|고용계약|연봉계약|계약갱신", folder: "30_인사관리\\32_재직증명" },
    { pattern: "경력증명|재직기간|근속년수|증명서발급|증명요청", folder: "30_인사관리\\32_재직증명" },
    { pattern: "퇴직|retirement|퇴직금|퇴직연금|퇴직정산|퇴직처리", folder: "30_인사관리\\33_퇴직" },
    { pattern: "퇴직면담|exit.?interview|퇴직사유|퇴직신고|퇴직증명", folder: "30_인사관리\\33_퇴직" },
    { pattern: "해고|해임|권고사직|구조조정|명예퇴직|희망퇴직", folder: "30_인사관리\\33_퇴직" },
    { pattern: "입사|인사발령|발령|전보|승진|승격|보직변경", folder: "30_인사관리\\31_입사서류" },
    { pattern: "연차|휴가|leave|병가|출산휴가|육아휴직|경조사", folder: "30_인사관리\\31_입사서류" },
    { pattern: "조직도|인력현황|정원|to|인력계획|인력수급", folder: "30_인사관리\\31_입사서류" },
    { pattern: "복리후생|복지|welfare|포상|징계|상벌|표창", folder: "30_인사관리\\31_입사서류" },
    { pattern: "출퇴근|근태|attendance|야근|초과근무|시간외|당직", folder: "30_인사관리\\31_입사서류" },
    { pattern: "인사카드|인사기록|인사대장|인사파일|개인정보", folder: "30_인사관리\\31_입사서류" },
    { pattern: "복장|dress.?code|사원증|명함|좌석배치|사물함", folder: "30_인사관리\\31_입사서류" },
    { pattern: "전입|전출|파견|출향|복귀|순환보직|job.?rotation", folder: "30_인사관리\\31_입사서류" },
    /* ── 40_급여_연봉 ── */
    { pattern: "급여|연봉|salary|pay|평가|인사고과|kpi|mbo|성과평가|역량평가", folder: "40_급여_연봉" },
    { pattern: "4대보험|사회보험|건강보험|국민연금|고용보험|산재보험", folder: "40_급여_연봉" },
    { pattern: "원천징수|연말정산|세금|소득세|갑근세|간이세액", folder: "40_급여_연봉" },
    { pattern: "성과급|인센티브|incentive|보너스|bonus|상여|상여금", folder: "40_급여_연봉" },
    { pattern: "연봉테이블|임금체계|호봉|급여기준|보상체계", folder: "40_급여_연봉" },
    { pattern: "다면평가|360|피어리뷰|peer.?review|상호평가", folder: "40_급여_연봉" },
    { pattern: "목표설정|okr|목표관리|업적평가|역량모델", folder: "40_급여_연봉" },
    /* ── 50_교육_훈련 ── */
    { pattern: "교육|훈련|training|자격증|수료증|certificate|이수", folder: "50_교육_훈련" },
    { pattern: "신입연수|obt|ot|온보딩|onboarding|입문교육", folder: "50_교육_훈련" },
    { pattern: "리더십|leadership|관리자교육|승진자교육|직급교육", folder: "50_교육_훈련" },
    { pattern: "직무교육|전문교육|기술교육|법정교육|의무교육", folder: "50_교육_훈련" },
    { pattern: "e러닝|e-learning|온라인교육|사이버교육|hrd", folder: "50_교육_훈련" },
    { pattern: "교육계획|교육일정|교육예산|교육평가|만족도", folder: "50_교육_훈련" },
    { pattern: "멘토링|mentoring|코칭|coaching|1on1|면담", folder: "50_교육_훈련" },
    { pattern: "어학|영어|토익|toeic|토플|opic|외국어", folder: "50_교육_훈련" },
    /* ── 보존 ── */
    { pattern: "3년|3년보존|채용서류보존", folder: "90_Archive\\91_3년보존" },
    { pattern: "5년|5년보존|급여대장보존|근로계약보존", folder: "90_Archive\\92_5년보존" },
    /* ── 폴백 ── */
    { pattern: "주간보고|weekly|인사|보고|report|일일보고|daily", folder: "00_업무보고\\주간보고" },
    { pattern: "업무일지|인사일지|hr일지|팀보고", folder: "00_업무보고\\주간보고" },
  ];
}

function getJobProfiles(): TemplateProfile[] {
  const yr = new Date().getFullYear();
  return [
    {
      name: "👔 임원·관리자",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함",
        "20_전략_기밀\\21_M&A검토", "20_전략_기밀\\22_신사업계획",
        "30_외부기관\\31_고객사", "30_외부기관\\32_협력사", "30_외부기관\\33_금융·법률",
        "40_인사_조직", "90_Archive", "삭제대상",
      ],
      classify: (name, ext) => classifyByRules(RULES_EXECUTIVE, name, ext, "01_수신함"),
    },
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
      classify: (name, ext) => classifyByRules(RULES_DEVELOPER, name, ext, "01_수신함"),
    },
    {
      name: "🖥️ 인프라·운영",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함", "20_구성관리",
        "30_장애대응", "30_장애대응\\31_증적",
        "40_점검결과", "50_매뉴얼", "삭제대상",
      ],
      classify: (name, ext) => classifyByRules(RULES_INFRA, name, ext, "01_수신함"),
    },
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
      classify: (name, ext) => classifyByRules(RULES_SALES, name, ext, "30_참조자료"),
    },
    {
      name: "📋 구매·계약",
      folders: [
        "00_업무보고\\주간보고", "00_업무보고\\월간보고", "00_업무보고\\임원회의",
        "01_수신함", "20_구매",
        "30_계약서\\31_원본_서명본", "30_계약서\\32_사본_작업본",
        "90_Archive_완료", "삭제대상",
      ],
      classify: (name, ext) => classifyByRules(RULES_PROCUREMENT, name, ext, "01_수신함"),
    },
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
      classify: (name, ext) => classifyByRules(getHrRules(yr), name, ext, "01_수신함"),
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
