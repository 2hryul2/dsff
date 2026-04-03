import type { FileItem } from "../types";

/* ── Raw entry returned by Electron main process ── */
export interface RawEntry {
  name: string;
  isDir: boolean;
  size: number;
  modified: string | null;
  created: string | null;
  accessed: string | null;
}

/* ── Extension → category / icon / label ── */
type Category = FileItem["category"];

interface ExtInfo { category: Category; icon: string; type: string }

const EXT: Record<string, ExtInfo> = {
  /* Documents */
  pdf:  { category: "document", icon: "📄", type: "PDF 파일" },
  doc:  { category: "document", icon: "📝", type: "Word 문서" },
  docx: { category: "document", icon: "📝", type: "Word 문서" },
  xls:  { category: "document", icon: "📊", type: "Excel 통합 문서" },
  xlsx: { category: "document", icon: "📊", type: "Excel 통합 문서" },
  ppt:  { category: "document", icon: "📊", type: "PowerPoint 파일" },
  pptx: { category: "document", icon: "📊", type: "PowerPoint 파일" },
  txt:  { category: "document", icon: "📄", type: "텍스트 파일" },
  md:   { category: "document", icon: "📄", type: "Markdown 파일" },
  hwp:  { category: "document", icon: "📝", type: "한글 문서" },
  hwpx: { category: "document", icon: "📝", type: "한글 문서(OOXML)" },
  csv:  { category: "document", icon: "📊", type: "CSV 파일" },
  xlsb: { category: "document", icon: "📊", type: "Excel 바이너리 통합 문서" },
  /* Images */
  jpg:  { category: "image", icon: "🖼️", type: "JPG 이미지" },
  jpeg: { category: "image", icon: "🖼️", type: "JPEG 이미지" },
  png:  { category: "image", icon: "🖼️", type: "PNG 이미지" },
  gif:  { category: "image", icon: "🖼️", type: "GIF 이미지" },
  bmp:  { category: "image", icon: "🖼️", type: "BMP 이미지" },
  webp: { category: "image", icon: "🖼️", type: "WebP 이미지" },
  svg:  { category: "image", icon: "🖼️", type: "SVG 이미지" },
  /* Video */
  mp4:  { category: "video", icon: "🎬", type: "MP4 동영상" },
  avi:  { category: "video", icon: "🎬", type: "AVI 동영상" },
  mkv:  { category: "video", icon: "🎬", type: "MKV 동영상" },
  mov:  { category: "video", icon: "🎬", type: "MOV 동영상" },
  wmv:  { category: "video", icon: "🎬", type: "WMV 동영상" },
  /* Audio */
  mp3:  { category: "audio", icon: "🎵", type: "MP3 음악" },
  wav:  { category: "audio", icon: "🎵", type: "WAV 음악" },
  flac: { category: "audio", icon: "🎵", type: "FLAC 음악" },
  aac:  { category: "audio", icon: "🎵", type: "AAC 음악" },
  /* Archives */
  zip:  { category: "archive", icon: "📦", type: "ZIP 압축 파일" },
  rar:  { category: "archive", icon: "📦", type: "RAR 압축 파일" },
  "7z": { category: "archive", icon: "📦", type: "7Z 압축 파일" },
  tar:  { category: "archive", icon: "📦", type: "TAR 아카이브" },
  gz:   { category: "archive", icon: "📦", type: "GZ 압축 파일" },
  vhdx: { category: "archive", icon: "💿", type: "가상 디스크 이미지" },
  iso:  { category: "archive", icon: "💿", type: "디스크 이미지" },
  /* Code */
  js:   { category: "code", icon: "💻", type: "JavaScript 파일" },
  ts:   { category: "code", icon: "💻", type: "TypeScript 파일" },
  jsx:  { category: "code", icon: "💻", type: "JSX 파일" },
  tsx:  { category: "code", icon: "💻", type: "TSX 파일" },
  py:   { category: "code", icon: "💻", type: "Python 파일" },
  cs:   { category: "code", icon: "💻", type: "C# 파일" },
  cpp:  { category: "code", icon: "💻", type: "C++ 파일" },
  c:    { category: "code", icon: "💻", type: "C 파일" },
  java: { category: "code", icon: "💻", type: "Java 파일" },
  json: { category: "code", icon: "💻", type: "JSON 파일" },
  xml:  { category: "code", icon: "💻", type: "XML 파일" },
  html: { category: "code", icon: "💻", type: "HTML 파일" },
  css:  { category: "code", icon: "💻", type: "CSS 파일" },
  yaml: { category: "code", icon: "💻", type: "YAML 파일" },
  yml:  { category: "code", icon: "💻", type: "YAML 파일" },
  toml: { category: "code", icon: "💻", type: "TOML 파일" },
  sh:   { category: "code", icon: "💻", type: "Shell 스크립트" },
  bat:  { category: "code", icon: "💻", type: "배치 파일" },
  ps1:  { category: "code", icon: "💻", type: "PowerShell 스크립트" },
  sql:  { category: "code", icon: "💻", type: "SQL 파일" },
  env:  { category: "code", icon: "⚙️", type: "환경 설정 파일" },
  /* Email */
  eml:  { category: "email", icon: "📧", type: "이메일 파일" },
  msg:  { category: "email", icon: "📧", type: "Outlook 이메일" },
  /* Fonts */
  ttf:  { category: "other", icon: "🔤", type: "TrueType 폰트" },
  otf:  { category: "other", icon: "🔤", type: "OpenType 폰트" },
};

/* ── Formatters ── */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${Y}.${M}.${D} ${h}:${m}`;
  } catch {
    return "";
  }
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024)                    return `${bytes} B`;
  if (bytes < 1024 * 1024)             return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/* ── Join path segments (handles both / and \) ── */
export function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.replace(/[/\\]+$/, "") + sep + name;
}

/* ── Get parent directory ── */
export function parentDir(p: string): string {
  const norm = p.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = norm.lastIndexOf("/");
  if (lastSlash <= 0) return p;           // already at root (e.g. "C:/")
  const parent = norm.slice(0, lastSlash);
  // Keep trailing slash for drive roots like "C:"
  return parent.endsWith(":") ? parent + "/" : parent;
}

/* ── Split path into breadcrumb segments ── */
export function pathSegments(p: string): { label: string; path: string }[] {
  const norm = p.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = norm.split("/").filter(Boolean);
  const result: { label: string; path: string }[] = [];
  let accumulated = "";
  for (const part of parts) {
    accumulated = accumulated ? accumulated + "/" + part : part;
    // Restore drive root slash: "C:" → "C:/"
    const resolved = accumulated.endsWith(":") ? accumulated + "/" : accumulated;
    result.push({ label: part, path: resolved });
  }
  return result;
}

/* ── Convert raw Electron entry → FileItem ── */
export function mapToFileItem(raw: RawEntry, dirPath: string): FileItem {
  const fullPath = joinPath(dirPath, raw.name);

  if (raw.isDir) {
    return {
      name:      raw.name,
      path:      fullPath,
      type:      "폴더",
      modified:  formatDate(raw.modified),
      created:   formatDate(raw.created) || undefined,
      accessed:  formatDate(raw.accessed) || undefined,
      size:      "",
      sizeBytes: 0,
      icon:      "📁",
      category:  "folder",
    };
  }

  const dotIdx = raw.name.lastIndexOf(".");
  const ext = dotIdx >= 0 ? raw.name.slice(dotIdx + 1).toLowerCase() : "";
  const info: ExtInfo = EXT[ext] ?? {
    category: "other",
    icon: "📄",
    type: ext ? `${ext.toUpperCase()} 파일` : "파일",
  };

  return {
    name:      raw.name,
    path:      fullPath,
    type:      info.type,
    modified:  formatDate(raw.modified),
    created:   formatDate(raw.created) || undefined,
    accessed:  formatDate(raw.accessed) || undefined,
    size:      formatSize(raw.size),
    sizeBytes: raw.size,
    icon:      info.icon,
    category:  info.category,
  };
}

/* ── Load a directory via IPC and return FileItem[] ── */
export async function loadDirectory(dirPath: string): Promise<FileItem[]> {
  const api = window.electronAPI;
  if (!api?.readDir) return [];

  const result = await api.readDir(dirPath);

  // Error returned as object
  if (!Array.isArray(result)) return [];

  const items: FileItem[] = (result as RawEntry[]).map((r) =>
    mapToFileItem(r, dirPath)
  );

  // Folders first, then alphabetical
  return items.sort((a, b) => {
    if (a.category === "folder" && b.category !== "folder") return -1;
    if (a.category !== "folder" && b.category === "folder") return 1;
    return a.name.localeCompare(b.name, "ko");
  });
}
