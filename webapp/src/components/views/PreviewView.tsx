import { useState, useEffect, useRef } from "react";
import type { ManagedFolder, OrganizePlan, OrganizeMove } from "../../types";

export interface CustomMoveInfo {
  source: string;
  destFolder: string;   // 절대 경로
}

interface Props {
  data: OrganizePlan | null;
  organizeMode: string;
  folder: ManagedFolder;
  currentPath?: string;
  loading?: boolean;
  onModeChange?: (mode: string) => void;
  onExecute?: (mode: string, customMoves?: CustomMoveInfo[]) => void;
  onCancel?: () => void;
}

const MODE_LABELS: Record<string, string> = {
  "by-type":    "파일 유형별 정리",
  "by-date":    "날짜별 정리",
};

/* ── 트리 노드 ── */
interface TreeNode {
  folderName: string;
  originalFolder: string;
  files: { fileName: string; source: string }[];
}

function buildTreeFromMoves(
  moves: OrganizeMove[],
  excluded: Set<string>,
  folderRenames: Map<string, string>,
  fileOverrides: Map<string, string>,
): TreeNode[] {
  const map = new Map<string, { fileName: string; source: string }[]>();

  for (const m of moves) {
    if (excluded.has(m.source)) continue;
    let origFolder: string;
    if (fileOverrides.has(m.source)) {
      origFolder = fileOverrides.get(m.source)!;
    } else {
      const parts = m.dest.replace(/\\/g, "/").split("/");
      origFolder = parts.length >= 2 ? parts[parts.length - 2] : m.category;
    }
    if (!map.has(origFolder)) map.set(origFolder, []);
    map.get(origFolder)!.push({ fileName: m.fileName, source: m.source });
  }

  const nodes: TreeNode[] = [];
  for (const [origFolder, files] of map.entries()) {
    nodes.push({
      folderName: folderRenames.get(origFolder) ?? origFolder,
      originalFolder: origFolder,
      files,
    });
  }
  return nodes.sort((a, b) => a.folderName.localeCompare(b.folderName, "ko"));
}

function labelFromPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/$/, "").split("/").pop() ?? p;
}

/* ── 인라인 편집 ── */
function EditableFolderName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setValue(name); }, [name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    const t = value.trim();
    if (t && t !== name) onRename(t); else setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <input ref={inputRef} value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
        style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 3, padding: "1px 4px", outline: "none", background: "#eff6ff", width: Math.max(60, value.length * 8), fontFamily: "inherit" }}
      />
    );
  }
  return (
    <span onClick={() => setEditing(true)} title="클릭하여 폴더명 편집"
      style={{ cursor: "text", borderBottom: "1px dashed #93c5fd" }}>{name}</span>
  );
}

export default function PreviewView({
  data, organizeMode, folder, currentPath, loading, onModeChange, onExecute, onCancel,
}: Props) {
  const [mode, setMode] = useState(organizeMode);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [folderRenames, setFolderRenames] = useState<Map<string, string>>(new Map());
  const [fileOverrides, setFileOverrides] = useState<Map<string, string>>(new Map());
  const [dragItem, setDragItem] = useState<{ source: string; fileName: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // 정리 후 화면에서 선택된 파일
  const [selectedAfter, setSelectedAfter] = useState<Set<string>>(new Set());

  useEffect(() => { setExcluded(new Set()); setFolderRenames(new Map()); setFileOverrides(new Map()); setSelectedAfter(new Set()); }, [data]);
  useEffect(() => { setMode(organizeMode); }, [organizeMode]);

  function handleModeChange(m: string) { setMode(m); onModeChange?.(m); }

  function toggleExclude(source: string) {
    setExcluded((p) => { const n = new Set(p); n.has(source) ? n.delete(source) : n.add(source); return n; });
  }

  function excludeSelected() {
    if (selectedAfter.size === 0) return;
    setExcluded((p) => { const n = new Set(p); for (const s of selectedAfter) n.add(s); return n; });
    setSelectedAfter(new Set());
  }

  function toggleSelectAfter(source: string) {
    setSelectedAfter((p) => { const n = new Set(p); n.has(source) ? n.delete(source) : n.add(source); return n; });
  }

  function handleFolderRename(orig: string, newName: string) {
    setFolderRenames((p) => { const n = new Map(p); n.set(orig, newName); return n; });
  }

  /* Drag & Drop */
  function onDragStart(source: string, fileName: string) { setDragItem({ source, fileName }); }
  function onDragOverFolder(e: React.DragEvent, fk: string) { e.preventDefault(); setDropTarget(fk); }
  function onDragLeaveFolder() { setDropTarget(null); }
  function onDropOnFolder(tgt: string) {
    if (dragItem) setFileOverrides((p) => { const n = new Map(p); n.set(dragItem.source, tgt); return n; });
    setDragItem(null); setDropTarget(null);
  }
  function onDragEnd() { setDragItem(null); setDropTarget(null); }

  const allMoves = data?.moves ?? [];
  const treeNodes = buildTreeFromMoves(allMoves, excluded, folderRenames, fileOverrides);
  const totalActiveFiles = treeNodes.reduce((s, n) => s + n.files.length, 0);

  const displayPath = currentPath || folder.path;
  const displayLabel = currentPath ? labelFromPath(currentPath) : folder.label;

  // 커스텀 매핑 존재 여부
  const hasCustom = folderRenames.size > 0 || fileOverrides.size > 0;

  function handleExecute() {
    if (hasCustom) {
      // 커스텀 이동: 수정된 폴더명 적용하여 이동 목록 생성
      const basePath = displayPath.replace(/\//g, "\\");
      const customMoves: CustomMoveInfo[] = [];
      for (const node of treeNodes) {
        const destFolder = basePath + "\\" + node.folderName;
        for (const f of node.files) {
          customMoves.push({ source: f.source, destFolder });
        }
      }
      onExecute?.(mode, customMoves);
    } else {
      onExecute?.(mode);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f8f8fa" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>정리 미리보기 — {displayLabel}</h2>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{displayPath}</div>
        </div>
      </div>

      {/* Options */}
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>정리 방식:</span>
          {Object.entries(MODE_LABELS).map(([k, v]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
              <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => handleModeChange(k)} style={{ cursor: "pointer" }} />
              {v}
            </label>
          ))}
        </div>
        {excluded.size > 0 && (
          <div style={{ fontSize: 11, color: "#d97706" }}>
            제외: <strong>{excluded.size}</strong>개
            <button onClick={() => setExcluded(new Set())} style={{ marginLeft: 6, fontSize: 10, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>모두 해제</button>
          </div>
        )}
        {hasCustom && (
          <div style={{ fontSize: 11, color: "#059669" }}>
            수동 변경: <strong>{folderRenames.size + fileOverrides.size}</strong>건
            <button onClick={() => { setFolderRenames(new Map()); setFileOverrides(new Map()); }} style={{ marginLeft: 6, fontSize: 10, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>초기화</button>
          </div>
        )}
      </div>

      {/* Before / After */}
      {allMoves.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 24, textAlign: "center", color: "#9ca3af" }}>
          정리할 파일이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {/* ── Before (현재 상태) ── */}
          <div style={{ flex: 1, background: "#fff", border: "1px solid #e4e4e7", borderRadius: "8px 0 0 8px", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", background: "#fef3c7", borderBottom: "1px solid #fde68a", fontSize: 12, fontWeight: 600, color: "#92400e" }}>
              현재 상태 ({allMoves.length}개)
            </div>
            <div style={{ padding: 12, fontSize: 12, maxHeight: 400, overflowY: "auto" }}>
              <div style={{ color: "#555", marginBottom: 6 }}>📁 {displayLabel}/</div>
              {allMoves.map((m) => {
                const isExcluded = excluded.has(m.source);
                return (
                  <div key={m.source} style={{
                    paddingLeft: 18, marginBottom: 2, display: "flex", alignItems: "center", gap: 5,
                    color: isExcluded ? "#c0c0c0" : "#374151",
                    textDecoration: isExcluded ? "line-through" : "none",
                  }}>
                    <span>{isExcluded ? "⬜" : "📄"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fileName}</span>
                    <button onClick={() => toggleExclude(m.source)} title={isExcluded ? "포함" : "제외"}
                      style={{ flexShrink: 0, padding: "1px 6px", fontSize: 10, background: isExcluded ? "#dbeafe" : "#fee2e2", color: isExcluded ? "#2563eb" : "#dc2626", border: `1px solid ${isExcluded ? "#bfdbfe" : "#fca5a5"}`, borderRadius: 3, cursor: "pointer", fontFamily: "inherit" }}>
                      {isExcluded ? "포함" : "제외"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ← Arrow: 클릭하면 정리 후에서 선택된 파일 제외 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 36, flexShrink: 0, background: "#f8f8fa" }}>
            <button
              onClick={excludeSelected}
              disabled={selectedAfter.size === 0}
              title={selectedAfter.size > 0 ? `${selectedAfter.size}개 파일 제외` : "정리 후 목록에서 파일을 선택하세요"}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, cursor: selectedAfter.size > 0 ? "pointer" : "default",
                background: selectedAfter.size > 0 ? "#fee2e2" : "#f0f0f0",
                color: selectedAfter.size > 0 ? "#dc2626" : "#c0c0c0",
                border: `1px solid ${selectedAfter.size > 0 ? "#fca5a5" : "#e4e4e7"}`,
                transition: "all 0.15s",
              }}
            >
              ←
            </button>
            {selectedAfter.size > 0 && (
              <div style={{ fontSize: 9, color: "#dc2626", marginTop: 2, textAlign: "center" }}>{selectedAfter.size}개<br/>제외</div>
            )}
          </div>

          {/* ── After (정리 후) ── */}
          <div style={{ flex: 1, background: "#fff", border: "1px solid #e4e4e7", borderRadius: "0 8px 8px 0", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", background: "#dcfce7", borderBottom: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#14532d" }}>
              정리 후 ({MODE_LABELS[mode] ?? mode}) — {totalActiveFiles}개
              {dragItem && <span style={{ marginLeft: 8, fontSize: 10, color: "#059669" }}>📎 폴더에 드롭</span>}
            </div>
            <div style={{ padding: 12, fontSize: 12, maxHeight: 400, overflowY: "auto" }}>
              <div style={{ color: "#555", marginBottom: 6 }}>📁 {displayLabel}/</div>

              {treeNodes.map((node) => (
                <div key={node.originalFolder} style={{ marginBottom: 6 }}
                  onDragOver={(e) => onDragOverFolder(e, node.originalFolder)}
                  onDragLeave={onDragLeaveFolder}
                  onDrop={() => onDropOnFolder(node.originalFolder)}
                >
                  <div style={{
                    paddingLeft: 18, marginBottom: 2, display: "flex", alignItems: "center", gap: 4,
                    color: "#1d4ed8", fontWeight: 600,
                    background: dropTarget === node.originalFolder ? "#dbeafe" : "transparent",
                    borderRadius: 4, transition: "background 0.15s",
                  }}>
                    <span>📁</span>
                    <EditableFolderName name={node.folderName} onRename={(n) => handleFolderRename(node.originalFolder, n)} />
                    <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>({node.files.length})</span>
                  </div>

                  {node.files.map((f) => {
                    const isSel = selectedAfter.has(f.source);
                    return (
                      <div key={f.source}
                        draggable
                        onDragStart={() => onDragStart(f.source, f.fileName)}
                        onDragEnd={onDragEnd}
                        onClick={() => toggleSelectAfter(f.source)}
                        style={{
                          paddingLeft: 36, color: "#374151", marginBottom: 1,
                          display: "flex", alignItems: "center", gap: 5,
                          cursor: "pointer", borderRadius: 3, userSelect: "none",
                          background: isSel ? "#fef3c7" : "transparent",
                          outline: isSel ? "1px solid #fde68a" : "none",
                        }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "#f9fafb"; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                      >
                        <input type="checkbox" checked={isSel} readOnly
                          style={{ width: 12, height: 12, cursor: "pointer", accentColor: "#d97706" }} />
                        <span style={{ cursor: "grab", fontSize: 10, color: "#9ca3af" }}>⠿</span>
                        <span>📄</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {totalActiveFiles === 0 && (
                <div style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>모든 파일이 제외되었습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execute button */}
      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={{ padding: "8px 20px", background: "#f0f0f0", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
          onClick={() => onCancel?.()}>취소</button>
        <button
          disabled={totalActiveFiles === 0 || loading}
          style={{ padding: "8px 20px", background: totalActiveFiles === 0 ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: totalActiveFiles === 0 ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}
          onClick={handleExecute}
        >
          {loading ? "실행 중..." : `${totalActiveFiles}개 파일 정리 실행`}
        </button>
      </div>
    </div>
  );
}
