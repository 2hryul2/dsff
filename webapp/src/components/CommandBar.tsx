import { useState } from "react";
import type { ActiveView } from "../types";

interface Props {
  activeView: ActiveView;
  watchActive: boolean;
  onSetView: (v: ActiveView) => void;
  onOrganizeMode: (mode: string) => void;
  onToggleWatch: () => void;
  onUndo: () => void;
}

const ORGANIZE_MODES = [
  { icon: "📁", label: "타입별 정리",        mode: "by-type" },
  { icon: "📅", label: "날짜별 정리",        mode: "by-date" },
  null,
  { icon: "⚙️", label: "커스텀 규칙으로 정리…", mode: "custom" },
];

function CmdBtn({
  icon, label, active, hasMenu, badge, onClick,
}: {
  icon: string; label: string; active?: boolean;
  hasMenu?: boolean; badge?: React.ReactNode; onClick: () => void;
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
      {hasMenu && <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>}
      {badge}
    </button>
  );
}

export default function CommandBar({ activeView, watchActive, onSetView, onOrganizeMode, onToggleWatch, onUndo }: Props) {
  const [organizeOpen, setOrganizeOpen] = useState(false);

  return (
    <div
      style={{
        background: "#fafafa", padding: "3px 10px",
        display: "flex", alignItems: "center", gap: 1,
        borderBottom: "1px solid #e8e8e8", flexWrap: "wrap",
      }}
      onClick={() => setOrganizeOpen(false)}
    >
      {/* 정리 (with dropdown) */}
      <div style={{ position: "relative" }}>
        <CmdBtn
          icon="🗂️" label="정리" hasMenu
          active={activeView === "preview"}
          onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); setOrganizeOpen((p) => !p); }}
        />
        {organizeOpen && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0,
              background: "#fff", borderRadius: 8,
              boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
              border: "1px solid #e0e0e0", padding: "4px 0",
              zIndex: 200, minWidth: 190,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {ORGANIZE_MODES.map((m, i) =>
              m === null ? (
                <div key={i} style={{ height: 1, background: "#eee", margin: "4px 10px" }} />
              ) : (
                <button
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "7px 14px", border: "none", background: "transparent",
                    cursor: "pointer", width: "100%", fontSize: 12,
                    fontFamily: "inherit", textAlign: "left", color: "#333",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f7ff")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                  onClick={() => { onOrganizeMode(m.mode); onSetView("preview"); setOrganizeOpen(false); }}
                >
                  <span style={{ fontSize: 15 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <CmdBtn icon="📊" label="분석"    active={activeView === "analyze"}    onClick={() => onSetView(activeView === "analyze"    ? "explorer" : "analyze")} />
      <CmdBtn icon="✏️"  label="리네임"  active={activeView === "rename"}     onClick={() => onSetView(activeView === "rename"     ? "explorer" : "rename")} />
      <CmdBtn icon="🔍" label="중복검사" active={activeView === "duplicates"} onClick={() => onSetView(activeView === "duplicates" ? "explorer" : "duplicates")} />

      {/* Separator */}
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
    </div>
  );
}
