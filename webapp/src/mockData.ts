import type { FileItem, ManagedFolder, AnalysisData, DuplicateGroup, RenamePlan } from "./types";

export const MOCK_FILES: FileItem[] = [
  { name: "Images",    path: "C:/mock/Images",    type: "폴더",            modified: "2026-03-27", size: "",        sizeBytes: 0,          icon: "📁", category: "folder" },
  { name: "Documents", path: "C:/mock/Documents", type: "폴더",            modified: "2026-03-26", size: "",        sizeBytes: 0,          icon: "📁", category: "folder" },
  { name: "Videos",    path: "C:/mock/Videos",    type: "폴더",            modified: "2026-03-25", size: "",        sizeBytes: 0,          icon: "📁", category: "folder" },
  {
    name: "250415_신한디에스_AISP 케이블 추가 포설 건_S.xlsx", path: "C:/mock/250415.xlsx",
    type: "Excel 통합 문서", modified: "2025-04-15", created: "2025-04-15", accessed: "2026-03-27",
    size: "610 KB", sizeBytes: 624640, icon: "📊", category: "document",
  },
  {
    name: "quarterly_report.pdf", path: "C:/mock/quarterly_report.pdf",
    type: "PDF 파일", modified: "2026-03-01", created: "2026-03-01", accessed: "2026-03-27",
    size: "2.4 MB", sizeBytes: 2516582, icon: "📄", category: "document",
  },
  {
    name: "project_photo.jpg", path: "C:/mock/project_photo.jpg",
    type: "JPG 이미지", modified: "2026-03-25", created: "2026-03-20", accessed: "2026-03-26",
    size: "3.2 MB", sizeBytes: 3355443, icon: "🖼️", category: "image",
  },
  {
    name: "meeting_notes.docx", path: "C:/mock/meeting_notes.docx",
    type: "Word 문서", modified: "2026-03-26", created: "2026-03-26", accessed: "2026-03-27",
    size: "45 KB", sizeBytes: 46080, icon: "📝", category: "document",
  },
  {
    name: "presentation.pptx", path: "C:/mock/presentation.pptx",
    type: "PowerPoint 파일", modified: "2026-03-24", created: "2026-03-20", accessed: "2026-03-25",
    size: "8.5 MB", sizeBytes: 8912896, icon: "📊", category: "document",
  },
  {
    name: "backup_2026.zip", path: "C:/mock/backup_2026.zip",
    type: "ZIP 압축 파일", modified: "2026-03-22", created: "2026-03-22", accessed: "2026-03-23",
    size: "1.8 GB", sizeBytes: 1932735283, icon: "📦", category: "archive",
  },
  {
    name: "song_playlist.mp3", path: "C:/mock/song_playlist.mp3",
    type: "MP3 음악", modified: "2026-03-20", created: "2026-03-15", accessed: "2026-03-22",
    size: "4.1 MB", sizeBytes: 4299161, icon: "🎵", category: "audio",
  },
  {
    name: "demo_video.mp4", path: "C:/mock/demo_video.mp4",
    type: "MP4 동영상", modified: "2026-03-18", created: "2026-03-18", accessed: "2026-03-20",
    size: "245 MB", sizeBytes: 256901120, icon: "🎬", category: "video",
  },
  {
    name: "main.py", path: "C:/mock/main.py",
    type: "Python 파일", modified: "2026-03-27", created: "2026-03-10", accessed: "2026-03-27",
    size: "12 KB", sizeBytes: 12288, icon: "💻", category: "code",
  },
  {
    name: "screenshot_2026.png", path: "C:/mock/screenshot_2026.png",
    type: "PNG 이미지", modified: "2026-03-26", created: "2026-03-26", accessed: "2026-03-26",
    size: "1.1 MB", sizeBytes: 1153433, icon: "🖼️", category: "image",
  },
  {
    name: "setup_installer.exe", path: "C:/mock/setup_installer.exe",
    type: "EXE 파일", modified: "2026-03-15", created: "2026-03-15", accessed: "2026-03-15",
    size: "52 MB", sizeBytes: 54525952, icon: "⚙️", category: "other",
  },
];

export const MOCK_FOLDERS: ManagedFolder[] = [
  { label: "다운로드",  path: "C:\\Users\\sds\\Downloads",     score: 32,  watching: true,  profile: "by-date" },
  { label: "바탕화면",  path: "C:\\Users\\sds\\Desktop",       score: 78,  watching: false, profile: "by-type" },
  { label: "업무자료",  path: "D:\\업무자료\\2026",             score: 95,  watching: true,  profile: "by-subject" },
  { label: "프로젝트",  path: "C:\\Users\\sds\\Documents\\프로젝트", score: 61, watching: false, profile: "default" },
];

export const MOCK_ANALYSIS: AnalysisData = {
  totalFiles: 1247, totalSize: "28.3 GB",
  duplicates: 89,   wastedSize: "2.1 GB",
  largeFiles: 12,   largeSize: "9.8 GB",
  oldFiles: 342,    score: 32,
  categories: [
    { name: "이미지",   count: 523, size: "8.2 GB",  pct: 42, color: "#60a5fa" },
    { name: "문서",     count: 349, size: "2.1 GB",  pct: 28, color: "#34d399" },
    { name: "동영상",   count: 45,  size: "15.8 GB", pct: 18, color: "#f472b6" },
    { name: "압축파일", count: 87,  size: "1.9 GB",  pct:  7, color: "#fbbf24" },
    { name: "기타",     count: 243, size: "0.3 GB",  pct:  5, color: "#a78bfa" },
  ],
  ageDistribution: [
    { label: "최근 7일",    count: 156, pct: 13 },
    { label: "이번 달",     count: 289, pct: 23 },
    { label: "올해",        count: 460, pct: 37 },
    { label: "1년 이상",    count: 342, pct: 27 },
  ],
  sizeDistribution: [
    { label: "소형 (<1MB)",      count: 843, pct: 68 },
    { label: "중형 (1–100MB)",   count: 356, pct: 29 },
    { label: "대형 (100MB+)",    count:  48, pct:  3 },
  ],
};

export const MOCK_DUPLICATES: DuplicateGroup[] = [
  {
    id: 1, name: "report_final.pdf", totalSize: "45.6 MB", wastedSize: "30.4 MB",
    copies: [
      { path: "Downloads/report_final.pdf",     date: "2026-03-01", size: "15.2 MB", original: true,  checked: false },
      { path: "Downloads/report_final(1).pdf",  date: "2026-03-15", size: "15.2 MB", original: false, checked: true  },
      { path: "Downloads/report_final(2).pdf",  date: "2026-03-20", size: "15.2 MB", original: false, checked: true  },
    ],
  },
  {
    id: 2, name: "photo_beach.jpg", totalSize: "16.8 MB", wastedSize: "8.4 MB",
    copies: [
      { path: "Downloads/photo_beach.jpg",      date: "2026-02-14", size: "8.4 MB", original: true,  checked: false },
      { path: "Downloads/photo_beach(1).jpg",   date: "2026-02-14", size: "8.4 MB", original: false, checked: true  },
    ],
  },
  {
    id: 3, name: "setup_installer.exe", totalSize: "104 MB", wastedSize: "52 MB",
    copies: [
      { path: "Downloads/setup_installer.exe",          date: "2026-01-10", size: "52 MB", original: true,  checked: false },
      { path: "Downloads/setup_installer_backup.exe",   date: "2026-02-05", size: "52 MB", original: false, checked: true  },
    ],
  },
  {
    id: 4, name: "meeting_notes.docx", totalSize: "90 KB", wastedSize: "45 KB",
    copies: [
      { path: "Downloads/meeting_notes.docx",    date: "2026-03-26", size: "45 KB", original: true,  checked: false },
      { path: "Documents/meeting_notes.docx",    date: "2026-03-26", size: "45 KB", original: false, checked: true  },
    ],
  },
];

export const MOCK_RENAME_PLANS: RenamePlan[] = [
  { from: "신한디에스_AISP 케이블 추가 포설 건_S.xlsx", to: "250415_신한디에스_AISP 케이블 추가 포설 건_S.xlsx", date: "2025-04-15", skip: false },
  { from: "quarterly_report.pdf",     to: "260301_quarterly_report.pdf",     date: "2026-03-01", skip: false },
  { from: "project_photo.jpg",        to: "260320_project_photo.jpg",        date: "2026-03-20", skip: false },
  { from: "meeting_notes.docx",       to: "260326_meeting_notes.docx",       date: "2026-03-26", skip: false },
  { from: "presentation.pptx",        to: "260320_presentation.pptx",        date: "2026-03-20", skip: false },
  { from: "250327_main.py",           to: null,                              date: "",           skip: true, skipReason: "이미 날짜 접두사 있음" },
  { from: "backup_2026.zip",          to: "260322_backup_2026.zip",          date: "2026-03-22", skip: false },
  { from: "demo_video.mp4",           to: "260318_demo_video.mp4",           date: "2026-03-18", skip: false },
];
