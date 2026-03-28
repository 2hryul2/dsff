import type { FileItem, ManagedFolder } from "../types";

interface Props {
  totalFiles: number;
  selected: FileItem | null;
  activeFolder: ManagedFolder;
  watchActive: boolean;
}

export default function StatusBar({ totalFiles, selected, activeFolder, watchActive }: Props) {
  return (
    <div style={{
      background: "#f3f3f3", borderTop: "1px solid #e0e0e0",
      padding: "3px 14px", display: "flex", alignItems: "center",
      justifyContent: "space-between", fontSize: 11, color: "#666",
      userSelect: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{totalFiles}개 항목</span>
        {selected && (
          <span>
            <strong style={{ color: "#1a1a1a" }}>{selected.name}</strong>
            {" "}선택됨 ({selected.size})
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span>건강 점수: <strong style={{ color: activeFolder.score >= 80 ? "#16a34a" : activeFolder.score >= 50 ? "#d97706" : "#dc2626" }}>{activeFolder.score}</strong></span>
        {watchActive && (
          <span style={{ color: "#16a34a" }}>● 감시 중</span>
        )}
        <span style={{ color: "#9ca3af" }}>DS FolderFit</span>
      </div>
    </div>
  );
}
