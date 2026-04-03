import { useState, useEffect } from "react";
import { pathSegments } from "../services/fsService";
import type { ActiveView } from "../types";

interface Props {
  currentPath: string;
  managedPaths: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onNavigate: (path: string) => void;
  onSearch: (q: string) => void;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  activeView?: ActiveView;
  resetKey?: number;
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
  currentPath, managedPaths, canGoBack, canGoForward, canGoUp,
  onBack, onForward, onUp, onNavigate, onSearch,
  zoom = 100, onZoomIn, onZoomOut,
  activeView = "explorer", resetKey = 0,
}: Props) {
  const [searchVal, setSearchVal] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal] = useState(currentPath);

  useEffect(() => {
    setEditVal(currentPath);
  }, [currentPath]);

  // 탭 전환 시 필터 입력 초기화
  useEffect(() => {
    setSearchVal("");
  }, [resetKey]);

  const showFilter = activeView === "explorer" || activeView === "smart";

  const crumbs = currentPath ? pathSegments(currentPath) : [];

  function commitEdit() {
    setEditMode(false);
    const trimmed = editVal.trim();
    // 빈 값, 현재 경로와 동일, 또는 유효한 절대 경로가 아닌 경우 무시
    if (!trimmed || trimmed === currentPath) {
      setEditVal(currentPath);
      return;
    }
    // 최소한 드라이브 문자(C:\)나 UNC 경로(\\)로 시작하는지 확인
    const isAbsolute = /^[A-Za-z]:\\/.test(trimmed) || trimmed.startsWith("\\\\");
    if (!isAbsolute) {
      setEditVal(currentPath);
      return;
    }
    onNavigate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setEditMode(false); setEditVal(currentPath); }
  }

  // 관리폴더 경로와 매칭하여 세그먼트별 컬러 결정
  // currentPath 정규화 (\ 기준)
  const normCurrent = currentPath.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  // 관리폴더 중 현재 경로에 매칭되는 가장 긴 경로 찾기
  const matchedManaged = managedPaths
    .map((p) => p.replace(/\//g, "\\").replace(/\\+$/, ""))
    .filter((p) => normCurrent.startsWith(p.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0] ?? "";
  const managedDepth = matchedManaged ? matchedManaged.split("\\").length : 0;

  const visible = crumbs.length > 4 ? crumbs.slice(crumbs.length - 4) : crumbs;
  const hasHidden = crumbs.length > 4;
  const hiddenCount = crumbs.length - visible.length;

  return (
    <div style={{
      background: "#fff", padding: "5px 10px",
      display: "flex", alignItems: "center", gap: 6,
      borderBottom: "1px solid #e8e8e8", flexShrink: 0,
    }}>
      {/* Navigation buttons */}
      <NavBtn label="←" title="뒤로 (Alt+←)"   disabled={!canGoBack}    onClick={onBack} />
      <NavBtn label="→" title="앞으로 (Alt+→)" disabled={!canGoForward} onClick={onForward} />
      <NavBtn label="↑" title="위로 (Backspace)"   disabled={!canGoUp}      onClick={onUp} />

      {/* Breadcrumb / path input */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center",
          background: editMode ? "#fff" : "#f5f5f5",
          borderRadius: 4, padding: "4px 10px",
          border: editMode ? "2px solid #0078d4" : "1px solid #ddd",
          gap: 4, fontSize: 13, cursor: "text", minWidth: 0, overflow: "hidden",
        }}
        onClick={() => { setEditMode(true); setEditVal(currentPath); }}
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
                {visible.map((seg, i) => {
                  // 실제 crumbs 인덱스 (숨겨진 세그먼트 감안)
                  const realIdx = hiddenCount + i;
                  // 관리폴더 경로에 속하는 세그먼트인지 판별 (1-based depth)
                  const isManaged = managedDepth > 0 && (realIdx + 1) <= managedDepth;
                  const isLast = i === visible.length - 1;

                  return (
                    <span key={seg.path} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {(i > 0 || hasHidden) && (
                        <span style={{ color: "#bbb", fontSize: 11 }}>›</span>
                      )}
                      <span
                        onClick={(e) => { e.stopPropagation(); onNavigate(seg.path); }}
                        style={{
                          cursor: "pointer", padding: "1px 4px", borderRadius: 3,
                          maxWidth: isLast ? 280 : 100,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          fontWeight: isLast ? 600 : isManaged ? 500 : 400,
                          color: isManaged ? "#2563eb" : isLast ? "#1a1a1a" : "#555",
                          background: isManaged && isLast ? "#eff6ff" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLSpanElement).style.background = isManaged ? "#dbeafe" : "#e8e8e8";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLSpanElement).style.background =
                            isManaged && isLast ? "#eff6ff" : "transparent";
                        }}
                      >
                        {seg.label}
                      </span>
                    </span>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Filter (이름 필터) — 폴더 즐겨찾기/스마트 정리 탭에서만 표시 */}
      {showFilter && (
        <div
          style={{
            display: "flex", alignItems: "center",
            background: searchVal ? "#fffbeb" : "#f5f5f5",
            borderRadius: 4, padding: "4px 10px",
            border: searchVal ? "1px solid #f59e0b" : "1px solid #ddd",
            width: 200, gap: 6, flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={searchVal ? "#d97706" : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <input
            placeholder="파일 이름 필터"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); onSearch(e.target.value); }}
            onKeyDown={(e) => { e.stopPropagation(); }}
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
      )}

      {/* Zoom buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <button
          title="글자 축소"
          disabled={zoom <= 80}
          onClick={onZoomOut}
          style={{
            width: 28, height: 26, border: "1px solid #ddd", borderRadius: 4,
            background: zoom <= 80 ? "#f5f5f5" : "#fff", cursor: zoom <= 80 ? "default" : "pointer",
            fontSize: 11, fontWeight: 600, color: zoom <= 80 ? "#ccc" : "#555",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
          }}
        >−</button>
        <span style={{ fontSize: 10, color: "#999", minWidth: 30, textAlign: "center" }}>{zoom}%</span>
        <button
          title="글자 확대"
          disabled={zoom >= 150}
          onClick={onZoomIn}
          style={{
            width: 28, height: 26, border: "1px solid #ddd", borderRadius: 4,
            background: zoom >= 150 ? "#f5f5f5" : "#fff", cursor: zoom >= 150 ? "default" : "pointer",
            fontSize: 11, fontWeight: 600, color: zoom >= 150 ? "#ccc" : "#555",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
          }}
        >+</button>
      </div>
    </div>
  );
}
