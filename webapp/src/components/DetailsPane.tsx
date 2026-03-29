import { useRef, useState } from "react";
import type { ActiveView, FileItem, ManagedFolder } from "../types";

interface Props {
  file: FileItem | null;
  folder: ManagedFolder;
  onClose: () => void;
  onSetView: (view: ActiveView) => void;
  onToggleWatch: () => void;
  onRefresh: () => void;
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

export default function DetailsPane({ file, folder, onClose, onSetView, onToggleWatch, onRefresh }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [emptyDirScan, setEmptyDirScan] = useState<{ dirs: string[]; scanning: boolean } | null>(null);

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
    <div style={{ width: 220, flexShrink: 0, borderLeft: "1px solid #e4e4e7", background: "#fafafa", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>세부 정보</span>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {file ? (
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
  );
}
