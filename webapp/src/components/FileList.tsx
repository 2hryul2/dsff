import { useState } from "react";
import type { FileItem } from "../types";

interface Props {
  files: FileItem[];
  selected: FileItem | null;
  sortCol: keyof FileItem;
  sortAsc: boolean;
  loading: boolean;
  onSort: (col: keyof FileItem) => void;
  onSelect: (f: FileItem) => void;
  onNavigate: (path: string) => void;
  onContextMenu: (f: FileItem, x: number, y: number) => void;
  onTooltip: (f: FileItem | null, x: number, y: number) => void;
}

const COLS: { key: keyof FileItem; label: string; width: number | string; align?: "right" }[] = [
  { key: "name",     label: "이름",       width: "auto" },
  { key: "modified", label: "수정한 날짜", width: 140 },
  { key: "type",     label: "형식",        width: 120 },
  { key: "size",     label: "크기",        width: 90, align: "right" },
];

export default function FileList({
  files, selected, sortCol, sortAsc, loading,
  onSort, onSelect, onNavigate, onContextMenu, onTooltip,
}: Props) {
  const [hovRow, setHovRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
        <span>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", userSelect: "none" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 }}>
            {COLS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                style={{
                  padding: "7px 10px",
                  textAlign: col.align ?? "left",
                  fontWeight: 500, color: "#555", fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap",
                  width: col.width === "auto" ? undefined : col.width,
                  borderRight: "1px solid #eeeeee",
                }}
              >
                {col.label}
                {sortCol === col.key && (
                  <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                    {sortAsc ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {files.map((f) => {
            const isSelected = selected?.path === f.path;
            const isHov = hovRow === f.path;
            return (
              <tr
                key={f.path}
                onClick={() => onSelect(f)}
                onDoubleClick={() => {
                  if (f.category === "folder") onNavigate(f.path);
                  else window.electronAPI?.openPath(f.path);
                }}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu(f, e.clientX, e.clientY); }}
                onMouseEnter={(e) => {
                  setHovRow(f.path);
                  if (f.created || f.accessed) onTooltip(f, e.clientX, e.clientY + 20);
                }}
                onMouseLeave={() => { setHovRow(null); onTooltip(null, 0, 0); }}
                style={{
                  background: isSelected ? "#dbeafe" : isHov ? "#f0f7ff" : "transparent",
                  cursor: f.category === "folder" ? "default" : "default",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <td style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isSelected ? "#1d4ed8" : "#1a1a1a" }}>
                    {f.name}
                  </span>
                </td>
                <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap" }}>{f.modified}</td>
                <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap" }}>{f.type}</td>
                <td style={{ padding: "5px 10px", color: "#555", textAlign: "right", whiteSpace: "nowrap" }}>{f.size}</td>
              </tr>
            );
          })}
          {files.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                파일이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
