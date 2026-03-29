import { useState, useEffect, useCallback, useRef } from "react";
import type { ManagedFolder } from "../types";

interface Props {
  folders: ManagedFolder[];
  active: ManagedFolder | null;
  width: number;
  refreshKey?: number;
  onSelect: (f: ManagedFolder) => void;
  onAddFolder: () => void;
  onRemoveFolder?: (f: ManagedFolder) => void;
  onRenameFolder?: (f: ManagedFolder, newLabel: string) => void;
  onNavigate?: (path: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const bg    = score >= 80 ? "#dcfce7" : score >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 10, padding: "1px 6px", flexShrink: 0 }}>
      {score}
    </span>
  );
}

function formatAnalyzedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const M = d.getMonth() + 1;
    const D = d.getDate();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${M}월 ${D}일 ${h}:${m}`;
  } catch {
    return null;
  }
}

/* ── 서브폴더 트리 노드 ── */
interface SubDir { name: string; path: string; }

function SubFolderTree({
  parentPath, depth, currentPath, onNavigate,
}: {
  parentPath: string; depth: number; currentPath?: string; onNavigate?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [children, setChildren] = useState<SubDir[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadChildren = useCallback(async () => {
    if (loaded) return;
    try {
      const entries = await window.electronAPI?.readDir(parentPath);
      if (Array.isArray(entries)) {
        const dirs = entries
          .filter((e: any) => e.isDir && !e.name.startsWith(".") && !e.name.startsWith("_") && e.name !== "node_modules" && e.name !== "__pycache__")
          .map((e: any) => ({
            name: e.name,
            path: parentPath.replace(/\//g, "\\") + "\\" + e.name,
          }))
          .sort((a: SubDir, b: SubDir) => a.name.localeCompare(b.name, "ko"));
        setChildren(dirs);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [parentPath, loaded]);

  useEffect(() => {
    if (depth === 0) loadChildren();
  }, [depth, loadChildren]);

  function toggleExpand(dirPath: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(dirPath) ? next.delete(dirPath) : next.add(dirPath);
      return next;
    });
  }

  if (!children || children.length === 0) return null;

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {children.map((dir) => {
        const isExpanded = expanded.has(dir.path);
        const isActive = currentPath === dir.path;
        return (
          <div key={dir.path}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 6px", paddingLeft: 8 + depth * 4,
                cursor: "pointer", fontSize: 12, borderRadius: 3,
                color: isActive ? "#1d4ed8" : "#374151",
                background: isActive ? "#dbeafe" : "transparent",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f0f0f0"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              onClick={() => onNavigate?.(dir.path)}
            >
              <span
                onClick={(e) => { e.stopPropagation(); toggleExpand(dir.path); }}
                style={{ fontSize: 8, color: "#9ca3af", width: 12, textAlign: "center", cursor: "pointer", userSelect: "none" }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
              <span style={{ fontSize: 13 }}>📁</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dir.name}</span>
            </div>
            {isExpanded && depth < 3 && (
              <LazySubFolderTree
                parentPath={dir.path}
                depth={depth + 1}
                currentPath={currentPath}
                onNavigate={onNavigate}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 지연 로드 서브폴더 트리 ── */
function LazySubFolderTree({
  parentPath, depth, currentPath, onNavigate,
}: {
  parentPath: string; depth: number; currentPath?: string; onNavigate?: (path: string) => void;
}) {
  const [children, setChildren] = useState<SubDir[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await window.electronAPI?.readDir(parentPath);
        if (cancelled) return;
        if (Array.isArray(entries)) {
          const dirs = entries
            .filter((e: any) => e.isDir && !e.name.startsWith(".") && !e.name.startsWith("_") && e.name !== "node_modules" && e.name !== "__pycache__")
            .map((e: any) => ({
              name: e.name,
              path: parentPath.replace(/\//g, "\\") + "\\" + e.name,
            }))
            .sort((a: SubDir, b: SubDir) => a.name.localeCompare(b.name, "ko"));
          setChildren(dirs);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [parentPath]);

  function toggleExpand(dirPath: string) {
    setExpanded((p) => { const n = new Set(p); n.has(dirPath) ? n.delete(dirPath) : n.add(dirPath); return n; });
  }

  if (!children || children.length === 0) return null;

  return (
    <div style={{ paddingLeft: 12 }}>
      {children.map((dir) => {
        const isExpanded = expanded.has(dir.path);
        const isActive = currentPath === dir.path;
        return (
          <div key={dir.path}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 6px", paddingLeft: 8 + depth * 4,
                cursor: "pointer", fontSize: 12, borderRadius: 3,
                color: isActive ? "#1d4ed8" : "#374151",
                background: isActive ? "#dbeafe" : "transparent",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f0f0f0"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              onClick={() => onNavigate?.(dir.path)}
            >
              {depth < 3 ? (
                <span
                  onClick={(e) => { e.stopPropagation(); toggleExpand(dir.path); }}
                  style={{ fontSize: 8, color: "#9ca3af", width: 12, textAlign: "center", cursor: "pointer", userSelect: "none" }}
                >{isExpanded ? "▼" : "▶"}</span>
              ) : <span style={{ width: 12 }} />}
              <span style={{ fontSize: 13 }}>📁</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dir.name}</span>
            </div>
            {isExpanded && depth < 3 && (
              <LazySubFolderTree parentPath={dir.path} depth={depth + 1} currentPath={currentPath} onNavigate={onNavigate} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NavigationPane({ folders, active, width, refreshKey, onSelect, onAddFolder, onRemoveFolder, onRenameFolder, onNavigate }: Props) {
  const [hov, setHov] = useState<string | null>(null);
  const [addHov, setAddHov] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) setExpandedFolders((p) => { const n = new Set(p); n.add(active.path); return n; });
  }, [active]);

  function toggleFolderExpand(path: string) {
    setExpandedFolders((p) => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; });
  }

  function startEdit(f: ManagedFolder) {
    setEditingPath(f.path);
    setEditVal(f.label);
    setTimeout(() => { inputRef.current?.select(); }, 30);
  }

  function commitEdit(f: ManagedFolder) {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== f.label) {
      onRenameFolder?.(f, trimmed);
    }
    setEditingPath(null);
  }

  return (
    <div style={{ width, flexShrink: 0, background: "#f8f8fa", borderRight: "1px solid #e4e4e7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px 4px", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        관리 폴더
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {folders.length === 0 && (
          <div style={{ padding: "16px 12px", fontSize: 12, color: "#9ca3af", textAlign: "center", lineHeight: 1.6 }}>
            폴더를 추가해서<br />관리를 시작하세요
          </div>
        )}
        {folders.map((f) => {
          const isActive = active?.path === f.path;
          const isHov = hov === f.path;
          const isExpanded = expandedFolders.has(f.path);
          const isEditing = editingPath === f.path;
          const analyzedAt = formatAnalyzedAt(f.analyzedAt);
          return (
            <div key={f.path}>
              <div
                onClick={() => { if (!isEditing) onSelect(f); }}
                onMouseEnter={() => setHov(f.path)}
                onMouseLeave={() => setHov(null)}
                style={{
                  position: "relative", display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "7px 12px", cursor: "pointer",
                  background: isActive ? "#dbeafe" : isHov ? "#ebebeb" : "transparent",
                  borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                }}
              >
                <span onClick={(e) => { e.stopPropagation(); toggleFolderExpand(f.path); }}
                  style={{ fontSize: 8, color: "#9ca3af", width: 10, cursor: "pointer", userSelect: "none", flexShrink: 0, marginTop: 4 }}>
                  {isExpanded ? "▼" : "▶"}
                </span>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📁</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* B1: 라벨 — 더블클릭 시 인라인 편집 */}
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editVal}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(f)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(f);
                        if (e.key === "Escape") setEditingPath(null);
                      }}
                      style={{
                        width: "100%", fontSize: 13, fontWeight: 600, color: "#1d4ed8",
                        border: "1px solid #3b82f6", borderRadius: 3, padding: "1px 4px",
                        outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <div
                      onDoubleClick={(e) => { e.stopPropagation(); startEdit(f); }}
                      title="더블클릭하여 이름 변경"
                      style={{ fontWeight: isActive ? 600 : 400, fontSize: 13, color: isActive ? "#1d4ed8" : "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >{f.label}</div>
                  )}
                  <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.path}</div>
                  {/* B3: 메타데이터 */}
                  {analyzedAt && (
                    <div style={{ fontSize: 9, color: "#a3a3a3", marginTop: 1 }}>
                      마지막 분석: {analyzedAt}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                  <ScoreBadge score={f.score} />
                  {f.watching && <span style={{ fontSize: 9, color: "#16a34a" }}>● 감시중</span>}
                  {/* 제거 버튼 — 호버 시 표시 */}
                  {isHov && onRemoveFolder && (
                    <button onClick={(e) => { e.stopPropagation(); onRemoveFolder(f); }} title="폴더 등록 해제"
                      style={{ width: 18, height: 18, padding: 0, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#dc2626", lineHeight: 1 }}>×</button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div style={{ paddingLeft: 16 }}>
                  <SubFolderTree key={`${f.path}-${refreshKey ?? 0}`} parentPath={f.path} depth={0} currentPath={undefined} onNavigate={onNavigate} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e4e4e7" }}>
        <button onMouseEnter={() => setAddHov(true)} onMouseLeave={() => setAddHov(false)} onClick={onAddFolder}
          style={{ width: "100%", padding: "6px 0", background: addHov ? "#ebebeb" : "transparent", border: "1px dashed #d1d5db", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
          <span>＋</span><span>폴더 추가</span>
        </button>
      </div>
    </div>
  );
}
