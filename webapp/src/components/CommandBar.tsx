import { useState, useEffect } from "react";
import type { ActiveView } from "../types";

interface Props {
  activeView: ActiveView;
  watchActive: boolean;
  onSetView: (v: ActiveView) => void;
  onToggleWatch: () => void;
  onUndo: () => void;
  onFileSearch: (query: string) => void;
  searchBusy?: boolean;
  resetKey?: number;
}

function CmdBtn({
  icon, label, active, badge, onClick,
}: {
  icon: string; label: string; active?: boolean;
  badge?: React.ReactNode; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 10px", border: "none",
        background: active ? "#dbeafe" : hov ? "#ebebeb" : "transparent",
        cursor: "pointer", borderRadius: 4, fontSize: 12,
        fontFamily: "inherit", color: active ? "#1d4ed8" : "#333",
        whiteSpace: "nowrap",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
      {badge}
    </button>
  );
}

export default function CommandBar({ activeView, watchActive, onSetView, onToggleWatch, onUndo, onFileSearch, searchBusy, resetKey = 0 }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  // 탭 전환 시 검색 입력 초기화
  useEffect(() => {
    setSearchOpen(false);
    setSearchVal("");
  }, [resetKey]);

  const showSearch = activeView === "explorer" || activeView === "smart";

  function submitSearch() {
    const q = searchVal.trim();
    if (q) onFileSearch(q);
  }

  return (
    <div
      style={{
        background: "#fafafa", padding: "3px 10px",
        display: "flex", alignItems: "center", gap: 1,
        borderBottom: "1px solid #e8e8e8", flexWrap: "wrap",
      }}
    >
      <CmdBtn icon="⭐" label="폴더 즐겨찾기" active={activeView === "explorer"} onClick={() => onSetView("explorer")} />
      <CmdBtn icon="✨" label="스마트 정리" active={activeView === "smart"}      onClick={() => onSetView(activeView === "smart"      ? "explorer" : "smart")} />
      <CmdBtn icon="📊" label="분석"       active={activeView === "analyze"}    onClick={() => onSetView(activeView === "analyze"    ? "explorer" : "analyze")} />
      <CmdBtn icon="✏️"  label="리네임"    active={activeView === "rename"}     onClick={() => onSetView(activeView === "rename"     ? "explorer" : "rename")} />
      <CmdBtn icon="🔍" label="중복검사"   active={activeView === "duplicates"} onClick={() => onSetView(activeView === "duplicates" ? "explorer" : "duplicates")} />

      <div style={{ width: 1, height: 22, background: "#ddd", margin: "0 4px" }} />

      <CmdBtn
        icon="👁️" label="감시" active={watchActive}
        badge={
          <span style={{ fontSize: 10, color: watchActive ? "#16a34a" : "#999", marginLeft: 2 }}>
            {watchActive ? "● ON" : "○ OFF"}
          </span>
        }
        onClick={onToggleWatch}
      />
      <CmdBtn icon="↩️" label="되돌리기" onClick={onUndo} />

      {/* 파일 검색 — 폴더 즐겨찾기/스마트 정리 탭에서만 표시 */}
      {showSearch && (
        <>
        <div style={{ width: 1, height: 22, background: "#ddd", margin: "0 4px" }} />

        <CmdBtn
          icon="🔎" label="파일 검색"
          active={searchOpen}
          onClick={() => { setSearchOpen((p) => !p); if (searchOpen) { setSearchVal(""); } }}
        />
        </>
      )}

      {/* 파일 검색 입력 (확장 영역) */}
      {showSearch && searchOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#fff", borderRadius: 4, padding: "3px 8px",
            border: "1px solid #2563eb", gap: 4, width: 220,
          }}>
            <input
              autoFocus
              placeholder="파일명 입력 후 Enter (하위폴더 포함)"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
                if (e.key === "Escape") { setSearchOpen(false); setSearchVal(""); }
              }}
              style={{
                border: "none", background: "transparent", outline: "none",
                fontSize: 12, width: "100%", fontFamily: "inherit",
              }}
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 0, fontSize: 12 }}
              >✕</button>
            )}
          </div>
          <button
            onClick={submitSearch}
            disabled={!searchVal.trim() || searchBusy}
            style={{
              padding: "4px 10px", border: "none", borderRadius: 4,
              background: searchVal.trim() ? "#2563eb" : "#e5e7eb",
              color: searchVal.trim() ? "#fff" : "#9ca3af",
              cursor: searchVal.trim() ? "pointer" : "default",
              fontSize: 12, fontFamily: "inherit", fontWeight: 600,
            }}
          >
            {searchBusy ? "검색 중..." : "검색"}
          </button>
        </div>
      )}
    </div>
  );
}
