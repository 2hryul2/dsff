import { useState, useEffect } from "react";
import { pathSegments } from "../services/fsService";

interface Props {
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onNavigate: (path: string) => void;
  onSearch: (q: string) => void;
}

function NavBtn({ label, title, disabled, onClick }: {
  label: string; title: string; disabled: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, border: "none",
        background: hov && !disabled ? "#f0f0f0" : "transparent",
        cursor: disabled ? "default" : "pointer",
        fontSize: 13, borderRadius: 4, color: disabled ? "#ccc" : "#555",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

export default function AddressBar({
  currentPath, canGoBack, canGoForward, canGoUp,
  onBack, onForward, onUp, onNavigate, onSearch,
}: Props) {
  const [searchVal, setSearchVal] = useState("");
  const [focused, setFocused] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal] = useState(currentPath);

  // Sync editVal when path changes from outside
  useEffect(() => {
    setEditVal(currentPath);
  }, [currentPath]);

  const crumbs = currentPath ? pathSegments(currentPath) : [];

  function commitEdit() {
    setEditMode(false);
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== currentPath) onNavigate(trimmed);
    else setEditVal(currentPath);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setEditMode(false); setEditVal(currentPath); }
  }

  // Display max last 4 segments to avoid overflow
  const visible = crumbs.length > 4 ? crumbs.slice(crumbs.length - 4) : crumbs;
  const hasHidden = crumbs.length > 4;

  return (
    <div style={{
      background: "#fff", padding: "5px 10px",
      display: "flex", alignItems: "center", gap: 6,
      borderBottom: "1px solid #e8e8e8", flexShrink: 0,
    }}>
      {/* Navigation buttons */}
      <NavBtn label="←" title="뒤로"   disabled={!canGoBack}    onClick={onBack} />
      <NavBtn label="→" title="앞으로" disabled={!canGoForward} onClick={onForward} />
      <NavBtn label="↑" title="위로"   disabled={!canGoUp}      onClick={onUp} />

      {/* Breadcrumb / path input */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center",
          background: focused || editMode ? "#fff" : "#f5f5f5",
          borderRadius: 4, padding: "4px 10px",
          border: focused || editMode ? "2px solid #0078d4" : "1px solid #ddd",
          gap: 4, fontSize: 13, cursor: "text", minWidth: 0, overflow: "hidden",
        }}
        onClick={() => { setEditMode(true); setEditVal(currentPath); setFocused(true); }}
      >
        {editMode ? (
          <input
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            style={{
              flex: 1, border: "none", background: "transparent",
              outline: "none", fontSize: 13, fontFamily: "inherit",
            }}
          />
        ) : (
          <>
            <span style={{ flexShrink: 0 }}>📁</span>
            {!currentPath ? (
              <span style={{ color: "#9ca3af", fontSize: 12 }}>폴더를 선택하세요</span>
            ) : (
              <>
                {hasHidden && (
                  <span style={{ color: "#999", fontSize: 11 }}>...&nbsp;</span>
                )}
                {visible.map((seg, i) => (
                  <span key={seg.path} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {(i > 0 || hasHidden) && (
                      <span style={{ color: "#bbb", fontSize: 11 }}>›</span>
                    )}
                    <span
                      onClick={(e) => { e.stopPropagation(); onNavigate(seg.path); }}
                      style={{
                        cursor: "pointer", padding: "1px 4px", borderRadius: 3,
                        maxWidth: i === visible.length - 1 ? 280 : 100,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        fontWeight: i === visible.length - 1 ? 500 : 400,
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLSpanElement).style.background = "#e8e8e8")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLSpanElement).style.background = "transparent")}
                    >
                      {seg.label}
                    </span>
                  </span>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex", alignItems: "center",
          background: "#f5f5f5", borderRadius: 4, padding: "4px 10px",
          border: "1px solid #ddd", width: 200, gap: 6, flexShrink: 0,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span style={{ color: "#999", fontSize: 12 }}>🔍</span>
        <input
          placeholder="검색"
          value={searchVal}
          onChange={(e) => { setSearchVal(e.target.value); onSearch(e.target.value); }}
          style={{
            border: "none", background: "transparent", outline: "none",
            fontSize: 12, width: "100%", fontFamily: "inherit",
          }}
        />
        {searchVal && (
          <button
            onClick={() => { setSearchVal(""); onSearch(""); }}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 0, fontSize: 12 }}
          >✕</button>
        )}
      </div>
    </div>
  );
}
