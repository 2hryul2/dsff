import { useRef, useState, useCallback, useEffect } from "react";
import type { ActiveView, FileItem, ManagedFolder } from "../types";
import type { AiStructureNode } from "./views/SmartOrganizeView";

interface Props {
  file: FileItem | null;
  folder: ManagedFolder;
  onClose: () => void;
  onSetView: (view: ActiveView) => void;
  onToggleWatch: () => void;
  onRefresh: () => void;
  activeView?: ActiveView;
  aiStructure?: AiStructureNode[] | null;
  aiProfileName?: string | null;
  width?: number;
  onWidthChange?: (w: number) => void;
  onKeywordSave?: (folderName: string, keywords: string[]) => void;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 10 }}>
      <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#374151", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "8px 6px", border: "1px solid #e4e4e7", borderRadius: 6,
        background: disabled ? "#f3f4f6" : hov ? "#f0f7ff" : "#fff",
        cursor: disabled ? "default" : "pointer",
        fontSize: 10, color: disabled ? "#9ca3af" : "#374151", fontFamily: "inherit", flex: 1,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ── 키워드 팝업 컴포넌트 (드래그 가능 + 키워드 편집) ── */
function KeywordPopup({ keywords, folderName, anchorRect, onClose, onSave }: {
  keywords: string[]; folderName: string; anchorRect: DOMRect; onClose: () => void;
  onSave?: (folderName: string, keywords: string[]) => void;
}) {
  const initTop = Math.min(anchorRect.bottom + 4, window.innerHeight - 350);
  const initLeft = Math.max(8, Math.min(anchorRect.left - 60, window.innerWidth - 300));

  const [pos, setPos] = useState({ x: initLeft, y: initTop });
  const [editKws, setEditKws] = useState<string[]>([...keywords]);
  const [newKw, setNewKw] = useState("");
  const [dirty, setDirty] = useState(false);

  // 부모에서 keywords prop이 갱신되면 팝업 내부 state도 동기화
  useEffect(() => { setEditKws([...keywords]); }, [keywords.join(",")]);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos]);

  function removeKw(kw: string) {
    setEditKws((prev) => prev.filter((k) => k !== kw));
    setDirty(true);
  }

  function addKw() {
    const trimmed = newKw.trim().toLowerCase();
    if (!trimmed || editKws.includes(trimmed)) return;
    setEditKws((prev) => [...prev, trimmed]);
    setNewKw("");
    setDirty(true);
  }

  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave?.(folderName, editKws);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
      <div style={{
        position: "fixed", top: pos.y, left: pos.x, zIndex: 9999,
        width: 280, maxHeight: 380, overflow: "auto",
        background: "#fff", border: "1px solid #d1d5db", borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: 0,
        fontFamily: "'Segoe UI', 'Malgun Gothic', sans-serif",
      }}>
        {/* 드래그 가능한 헤더 */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", cursor: "move", background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0", borderRadius: "8px 8px 0 0",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>📁 {folderName}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: "#6d28d9", marginBottom: 6 }}>{editKws.length}개 키워드</div>

          {/* 키워드 태그 (삭제 가능) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {editKws.map((kw) => (
              <span key={kw} style={{
                fontSize: 11, color: "#334155", background: "#f1f5f9",
                borderRadius: 4, padding: "2px 6px", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                {kw}
                <span
                  onClick={() => removeKw(kw)}
                  style={{ cursor: "pointer", color: "#dc2626", fontSize: 12, fontWeight: 700, lineHeight: 1 }}
                  title="삭제"
                >×</span>
              </span>
            ))}
          </div>

          {/* 키워드 추가 입력 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <input
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addKw(); }}
              placeholder="키워드 추가..."
              style={{
                flex: 1, fontSize: 11, padding: "3px 6px", border: "1px solid #d1d5db",
                borderRadius: 4, outline: "none", fontFamily: "inherit",
              }}
            />
            <button
              onClick={addKw}
              disabled={!newKw.trim()}
              style={{
                fontSize: 11, padding: "3px 8px", border: "1px solid #d1d5db",
                borderRadius: 4, cursor: newKw.trim() ? "pointer" : "default",
                background: newKw.trim() ? "#ede9fe" : "#f9fafb",
                color: newKw.trim() ? "#6d28d9" : "#9ca3af",
                fontFamily: "inherit",
              }}
            >추가</button>
          </div>

          {/* 저장 버튼 */}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={!dirty && !saved}
              style={{
                width: "100%", fontSize: 11, padding: "5px 0", border: "none",
                borderRadius: 4, cursor: dirty ? "pointer" : "default",
                background: saved ? "#16a34a" : dirty ? "#7c3aed" : "#e5e7eb",
                color: saved ? "#fff" : dirty ? "#fff" : "#9ca3af",
                fontWeight: 600, fontFamily: "inherit",
                transition: "background 0.2s",
              }}
            >{saved ? "저장 완료 — 규칙 + 트리 업데이트됨" : "저장 (규칙 업데이트 + 재분류)"}</button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── AI추천 구조 트리 렌더링 ── */
function AiTreeNode({ node, depth = 0, onKeywordSave }: { node: AiStructureNode; depth?: number; onKeywordSave?: (folderName: string, keywords: string[]) => void }) {
  const [open, setOpen] = useState(true);
  const [kwPopup, setKwPopup] = useState<DOMRect | null>(null);
  const hasChildren = node.children.length > 0;
  const indent = depth * 12;

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 6px", paddingLeft: 6 + indent,
          cursor: hasChildren ? "pointer" : "default",
          userSelect: "none", fontSize: 11, color: "#334155",
          borderRadius: 3,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f0f4ff"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {hasChildren
          ? <span style={{ fontSize: 8, color: "#9ca3af", width: 10, textAlign: "center" }}>{open ? "▼" : "▶"}</span>
          : <span style={{ width: 10 }} />
        }
        <span style={{ fontSize: 12 }}>📁</span>
        <span style={{ fontWeight: depth === 0 ? 600 : 400, color: depth === 0 ? "#1e293b" : "#475569" }}>
          {node.name}
        </span>
        {node.keywordCount !== undefined && node.keywords && node.keywords.length > 0 && (
          <span
            onClick={(e) => { e.stopPropagation(); setKwPopup(e.currentTarget.getBoundingClientRect()); }}
            style={{
              fontSize: 9, color: "#6d28d9", background: "#ede9fe",
              borderRadius: 3, padding: "0 4px", marginLeft: 2,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#ddd6fe"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#ede9fe"; }}
          >
            {node.keywordCount}
          </span>
        )}
        {node.keywordCount !== undefined && (!node.keywords || node.keywords.length === 0) && (
          <span style={{
            fontSize: 9, color: "#6d28d9", background: "#ede9fe",
            borderRadius: 3, padding: "0 4px", marginLeft: 2,
          }}>
            {node.keywordCount}
          </span>
        )}
      </div>

      {/* 키워드 팝업 */}
      {kwPopup && node.keywords && (
        <KeywordPopup
          keywords={node.keywords}
          folderName={node.name}
          anchorRect={kwPopup}
          onClose={() => setKwPopup(null)}
          onSave={onKeywordSave}
        />
      )}

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AiTreeNode key={child.name} node={child} depth={depth + 1} onKeywordSave={onKeywordSave} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailsPane({
  file, folder, onClose, onSetView, onToggleWatch, onRefresh,
  activeView, aiStructure, aiProfileName, width, onWidthChange, onKeywordSave,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [emptyDirScan, setEmptyDirScan] = useState<{ dirs: string[]; scanning: boolean } | null>(null);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const isSmartMode = activeView === "smart" && aiStructure && aiStructure.length > 0;
  const panelWidth = width ?? 220;

  // 리사이즈 핸들러
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startW: panelWidth };

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current || !onWidthChange) return;
      // 좌측으로 드래그하면 폭 증가 (패널이 우측에 있으므로)
      const delta = resizeRef.current.startX - ev.clientX;
      const newW = Math.max(200, Math.min(500, resizeRef.current.startW + delta));
      onWidthChange(newW);
    };

    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function startRename() {
    if (!file) return;
    setRenameVal(file.name);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  async function commitRename() {
    if (!file || !renameVal.trim() || renameVal === file.name) {
      setRenaming(false);
      return;
    }
    const res = await window.electronAPI?.renameFile(file.path, renameVal.trim());
    setRenaming(false);
    if (res?.ok) {
      onRefresh();
    } else {
      alert(`이름 변경 실패: ${res?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleCopy() {
    if (!file) return;
    const res = await window.electronAPI?.copyFile(file.path);
    if (res?.ok) {
      onRefresh();
    } else {
      alert(`복사 실패: ${res?.error ?? "알 수 없는 오류"}`);
    }
  }

  async function handleFindEmptyDirs() {
    if (!folder) return;
    setEmptyDirScan({ dirs: [], scanning: true });
    const res = await window.electronAPI?.findEmptyDirs(folder.path);
    if (!res?.ok) {
      setEmptyDirScan(null);
      alert(`오류: ${res?.error}`);
      return;
    }
    if (!res.data?.length) {
      setEmptyDirScan(null);
      alert("빈 폴더가 없습니다.");
      return;
    }
    setEmptyDirScan({ dirs: res.data, scanning: false });
  }

  async function handleRemoveEmptyDirs() {
    if (!emptyDirScan) return;
    const res = await window.electronAPI?.removeEmptyDirs(emptyDirScan.dirs);
    setEmptyDirScan(null);
    if (res?.ok) {
      const { removed, errors } = res.data!;
      alert(`${removed}개 빈 폴더 삭제 완료${errors.length ? `\n실패: ${errors.join(", ")}` : ""}`);
      onRefresh();
    } else {
      alert(`삭제 실패: ${res?.error}`);
    }
  }

  async function handleDelete() {
    if (!file) return;
    const res = await window.electronAPI?.moveToDeleteBin(file.path, folder.path);
    if (res?.ok) {
      onClose();
      onRefresh();
    } else {
      alert(`삭제 실패: ${res?.error ?? "알 수 없는 오류"}`);
    }
  }

  return (
    <div style={{ display: "flex", flexShrink: 0 }}>
      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          width: 4, cursor: "col-resize", background: "transparent",
          flexShrink: 0, zIndex: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#3b82f6"; }}
        onMouseLeave={(e) => { if (!resizeRef.current) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />
      <div style={{
        width: panelWidth, flexShrink: 0,
        borderLeft: "1px solid #e4e4e7", background: "#fafafa",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: isSmartMode ? "#6d28d9" : "#374151" }}>
            {isSmartMode ? "🤖 AI추천 구조" : "세부 정보"}
          </span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: isSmartMode ? "8px 4px" : "12px" }}>
          {isSmartMode ? (
            /* ── AI추천 구조 트리 ── */
            <>
              {aiProfileName && (
                <div style={{
                  padding: "6px 10px", marginBottom: 8, background: "#ede9fe",
                  borderRadius: 6, fontSize: 11, color: "#4c1d95", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>📌</span> {aiProfileName}
                </div>
              )}
              <div style={{ fontSize: 10, color: "#9ca3af", padding: "0 6px", marginBottom: 6 }}>
                직군별 추천 폴더 구조 · 숫자는 키워드 수
              </div>
              {aiStructure!.map((node) => (
                <AiTreeNode key={node.name} node={node} onKeywordSave={onKeywordSave} />
              ))}
            </>
          ) : file ? (
            <>
              {/* File icon + name */}
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 6 }}>{file.icon}</div>
                {renaming ? (
                  <input
                    ref={inputRef}
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    style={{
                      fontSize: 12, fontWeight: 600, color: "#1a1a1a", wordBreak: "break-all",
                      lineHeight: 1.4, width: "100%", border: "1px solid #3b82f6",
                      borderRadius: 4, padding: "2px 4px", outline: "none", textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", wordBreak: "break-all", lineHeight: 1.4 }}>
                    {file.name}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10 }}>
                <Row label="형식" value={file.type} />
                <Row label="크기" value={file.size} />
                <Row label="수정한 날짜" value={file.modified} />
                <Row label="만든 날짜" value={file.created} />
                <Row label="액세스한 날짜" value={file.accessed} />
                <Row label="분류" value={file.category} />
              </div>

              {/* Quick actions */}
              <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>빠른 작업</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <ActionBtn icon="✏️" label="이름 변경" onClick={startRename} />
                  <ActionBtn icon="📋" label="복사" onClick={handleCopy} />
                  <ActionBtn icon="🗑️" label="삭제" onClick={handleDelete} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <ActionBtn icon="🔍" label="중복 검사" onClick={() => onSetView("duplicates")} />
                  <ActionBtn icon="📊" label="분석" onClick={() => onSetView("analyze")} />
                </div>
              </div>
            </>
          ) : (
            /* No selection: show folder info */
            <>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 6 }}>📁</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{folder.label}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{folder.path}</div>
              </div>

              <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10 }}>
                <Row label="정리 프로필" value={folder.profile} />
                <Row label="감시 상태" value={folder.watching ? "● 감시 중" : "○ 감시 안 함"} />
              </div>

              {/* Health score */}
              <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>건강 점수</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${folder.score}%`, background: folder.score >= 80 ? "#16a34a" : folder.score >= 50 ? "#d97706" : "#dc2626", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: folder.score >= 80 ? "#16a34a" : folder.score >= 50 ? "#d97706" : "#dc2626" }}>
                    {folder.score}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>폴더 작업</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn icon="🗂️" label="정리" onClick={() => onSetView("preview")} />
                  <ActionBtn icon="📊" label="분석" onClick={() => onSetView("analyze")} />
                  <ActionBtn icon="👁️" label="감시" onClick={onToggleWatch} />
                  <ActionBtn icon="🗑️" label="빈폴더" onClick={handleFindEmptyDirs}
                    disabled={emptyDirScan?.scanning} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 빈 폴더 삭제 확인 모달 */}
        {emptyDirScan && !emptyDirScan.scanning && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}>
            <div style={{
              background: "#fff", borderRadius: 8, padding: 20, width: 380,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                ⚠️ 빈 폴더 삭제 확인
              </div>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 10 }}>
                아래 <b>{emptyDirScan.dirs.length}개</b> 폴더를 영구 삭제합니다. (복구 불가)
              </div>
              <ul style={{
                fontSize: 11, color: "#6b7280", maxHeight: 140, overflowY: "auto",
                background: "#f9fafb", border: "1px solid #e4e4e7", borderRadius: 4,
                padding: "6px 10px", marginBottom: 14, listStyle: "none",
              }}>
                {emptyDirScan.dirs.map((d) => (
                  <li key={d} style={{ padding: "1px 0" }}>
                    📁 {d.startsWith(folder.path) ? d.slice(folder.path.length + 1) : d}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => setEmptyDirScan(null)}
                  style={{
                    padding: "5px 14px", border: "1px solid #d1d5db", borderRadius: 5,
                    cursor: "pointer", background: "#fff", fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleRemoveEmptyDirs}
                  style={{
                    padding: "5px 14px", background: "#dc2626", color: "#fff",
                    border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
