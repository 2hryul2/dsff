import { useState, useEffect, useRef, useCallback } from "react";
import type { FileItem } from "../types";

interface Props {
  files: FileItem[];
  selectedFiles: FileItem[];
  sortCol: keyof FileItem;
  sortAsc: boolean;
  loading: boolean;
  renamingFile: FileItem | null;
  onSort: (col: keyof FileItem) => void;
  onSelect: (f: FileItem, e: React.MouseEvent) => void;
  onSelectAll: () => void;
  onNavigate: (path: string) => void;
  onContextMenu: (f: FileItem | null, x: number, y: number) => void;
  onTooltip: (f: FileItem | null, x: number, y: number) => void;
  onRenameCommit: (file: FileItem, newName: string) => void;
  onRenameCancel: () => void;
}

const COLS: { key: keyof FileItem; label: string; width: number | string; align?: "right" }[] = [
  { key: "name",     label: "이름",       width: "auto" },
  { key: "modified", label: "수정한 날짜", width: 140 },
  { key: "type",     label: "형식",        width: 120 },
  { key: "size",     label: "크기",        width: 90, align: "right" },
];

export default function FileList({
  files, selectedFiles, sortCol, sortAsc, loading, renamingFile,
  onSort, onSelect, onSelectAll, onNavigate, onContextMenu, onTooltip,
  onRenameCommit, onRenameCancel,
}: Props) {
  const [hovRow, setHovRow] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // 인라인 이름 편집 시작 시 input에 포커스
  useEffect(() => {
    if (renamingFile) {
      setRenameValue(renamingFile.name);
      setTimeout(() => {
        const input = renameRef.current;
        if (input) {
          input.focus();
          // 확장자 앞까지만 선택
          const dotIdx = renamingFile.name.lastIndexOf(".");
          if (dotIdx > 0 && renamingFile.category !== "folder") {
            input.setSelectionRange(0, dotIdx);
          } else {
            input.select();
          }
        }
      }, 0);
    }
  }, [renamingFile]);

  const selectedPaths = new Set(selectedFiles.map((f) => f.path));

  // 키보드 핸들러 (테이블 포커스 시)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (renamingFile) return; // 이름 편집 중에는 무시

    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSelectAll();
      return;
    }

    // ↑↓ 방향키 파일 이동
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (files.length === 0) return;
      const lastSelected = selectedFiles[selectedFiles.length - 1];
      const currentIdx = lastSelected ? files.findIndex((f) => f.path === lastSelected.path) : -1;
      let nextIdx: number;
      if (e.key === "ArrowDown") {
        nextIdx = currentIdx < files.length - 1 ? currentIdx + 1 : currentIdx;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : 0;
      }
      // shift+방향키 = 범위 확장, 단독 = 단일 선택
      onSelect(files[nextIdx], e as unknown as React.MouseEvent);
    }

    // Enter = 열기
    if (e.key === "Enter" && selectedFiles.length === 1) {
      e.preventDefault();
      const f = selectedFiles[0];
      if (f.category === "folder") onNavigate(f.path);
      else window.electronAPI?.openPath(f.path);
    }
  }, [files, selectedFiles, renamingFile, onSelect, onSelectAll, onNavigate]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
        <span>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ flex: 1, overflow: "auto", userSelect: "none", outline: "none" }}
      onContextMenu={(e) => {
        // 빈 영역 우클릭 (테이블 행이 아닌 빈 공간)
        const target = e.target as HTMLElement;
        if (target === tableRef.current || target.tagName === "TABLE" || target.tagName === "TBODY"
            || target.closest("td[data-empty]")) {
          e.preventDefault();
          onContextMenu(null, e.clientX, e.clientY);
        }
      }}
    >
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
            const isSelected = selectedPaths.has(f.path);
            const isHov = hovRow === f.path;
            const isRenaming = renamingFile?.path === f.path;
            return (
              <tr
                key={f.path}
                onClick={(e) => onSelect(f, e)}
                onDoubleClick={() => {
                  if (renamingFile) return;
                  if (f.category === "folder") onNavigate(f.path);
                  else window.electronAPI?.openPath(f.path);
                }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(f, e.clientX, e.clientY); }}
                onMouseEnter={(e) => {
                  setHovRow(f.path);
                  if (f.created || f.accessed) onTooltip(f, e.clientX, e.clientY + 20);
                }}
                onMouseLeave={() => { setHovRow(null); onTooltip(null, 0, 0); }}
                style={{
                  background: isSelected ? "#dbeafe" : isHov ? "#f0f7ff" : "transparent",
                  cursor: "default",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <td style={{ padding: "5px 10px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            if (renameValue.trim() && renameValue !== renamingFile.name) {
                              onRenameCommit(renamingFile, renameValue.trim());
                            } else {
                              onRenameCancel();
                            }
                          }
                          if (e.key === "Escape") { e.stopPropagation(); onRenameCancel(); }
                        }}
                        onBlur={() => {
                          if (renameValue.trim() && renameValue !== renamingFile.name) {
                            onRenameCommit(renamingFile, renameValue.trim());
                          } else {
                            onRenameCancel();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1, fontSize: 13, fontFamily: "inherit",
                          border: "1px solid #2563eb", borderRadius: 3,
                          padding: "1px 4px", outline: "none", minWidth: 60,
                        }}
                      />
                    ) : (
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isSelected ? "#1d4ed8" : "#1a1a1a" }}>
                        {f.name}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap" }}>{f.modified}</td>
                <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap" }}>{f.type}</td>
                <td style={{ padding: "5px 10px", color: "#555", textAlign: "right", whiteSpace: "nowrap" }}>{f.size}</td>
              </tr>
            );
          })}
          {files.length === 0 && (
            <tr>
              <td data-empty colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                파일이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
