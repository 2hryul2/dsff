import type { FileItem, ManagedFolder } from "../types";

interface Props {
  totalFiles: number;
  selectedFiles: FileItem[];
  activeFolder: ManagedFolder;
  watchActive: boolean;
  clipboardMode?: "copy" | "cut" | null;
  clipboardCount?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function StatusBar({ totalFiles, selectedFiles, activeFolder, watchActive, clipboardMode, clipboardCount }: Props) {
  const selCount = selectedFiles.length;
  const totalSize = selCount > 0 ? selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0) : 0;

  return (
    <div style={{
      position: "relative",
      background: "#f3f3f3", borderTop: "1px solid #e0e0e0",
      padding: "3px 14px", display: "flex", alignItems: "center",
      justifyContent: "space-between", fontSize: 11, color: "#666",
      userSelect: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{totalFiles}개 항목</span>
        {selCount === 1 && (
          <span>
            <strong style={{ color: "#1a1a1a" }}>{selectedFiles[0].name}</strong>
            {" "}선택됨 ({selectedFiles[0].size})
          </span>
        )}
        {selCount > 1 && (
          <span>
            <strong style={{ color: "#1a1a1a" }}>{selCount}개 선택됨</strong>
            {" "}({formatBytes(totalSize)})
          </span>
        )}
        {clipboardMode && clipboardCount && clipboardCount > 0 && (
          <span style={{ color: clipboardMode === "cut" ? "#d97706" : "#2563eb" }}>
            📋 {clipboardMode === "cut" ? "잘라내기" : "복사"} {clipboardCount}개
          </span>
        )}
      </div>
      {/* 중앙 — 소속 표시 */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", color: "#b0b0b0", fontSize: 10, letterSpacing: 0.5 }}>
        신한DS AX본부
      </div>
      {/* 우측 */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span>건강 점수: <strong style={{ color: activeFolder.score >= 80 ? "#16a34a" : activeFolder.score >= 50 ? "#d97706" : "#dc2626" }}>{activeFolder.score}</strong></span>
        {watchActive && (
          <span style={{ color: "#16a34a" }}>● 감시 중</span>
        )}
        <span style={{ color: "#c8c8c8", fontSize: 9, fontWeight: 300, letterSpacing: 0.3 }}>FolderFit powered by arti</span>
      </div>
    </div>
  );
}
