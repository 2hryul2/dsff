import { useState } from "react";

export interface MenuItem {
  icon: string;
  label: string;
  action?: string;
  subItems?: MenuItem[];
}

interface Props {
  x: number;
  y: number;
  items: (MenuItem | null)[];
  onClose: () => void;
  onAction?: (action: string, data?: any) => void;
}

export default function ContextMenu({ x, y, items, onClose, onAction }: Props) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  // 위치 보정 (화면 밖으로 나가지 않도록)
  const menuWidth = 200;
  const adjX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjY = Math.min(y, window.innerHeight - items.length * 36 - 20);

  return (
    <div
      style={{
        position: "fixed", left: adjX, top: adjY, zIndex: 1000,
        background: "#fff", borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.10)",
        border: "1px solid #e0e0e0", padding: "4px 0", minWidth: 180,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} style={{ height: 1, background: "#f0f0f0", margin: "3px 8px" }} />
        ) : item.subItems ? (
          <SubMenu key={i} item={item} isHovered={hovIdx === i}
            onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}
            onAction={(action, data) => { onAction?.(action, data); onClose(); }}
          />
        ) : (
          <button
            key={i}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
            onClick={() => { onAction?.(item.action ?? item.label); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 14px", border: "none",
              background: hovIdx === i ? "#f0f7ff" : "transparent",
              cursor: "pointer", width: "100%", textAlign: "left",
              fontSize: 13, fontFamily: "inherit", color: "#1a1a1a",
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}

/* ── 서브메뉴 ── */
function SubMenu({
  item, isHovered, onMouseEnter, onMouseLeave, onAction,
}: {
  item: MenuItem; isHovered: boolean;
  onMouseEnter: () => void; onMouseLeave: () => void;
  onAction: (action: string, data?: any) => void;
}) {
  const [subHovIdx, setSubHovIdx] = useState<number | null>(null);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 14px",
        background: isHovered ? "#f0f7ff" : "transparent",
        cursor: "pointer", fontSize: 13, color: "#1a1a1a",
      }}>
        <span style={{ fontSize: 14 }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>▶</span>
      </div>

      {/* 서브메뉴 패널 */}
      {isHovered && item.subItems && item.subItems.length > 0 && (
        <div style={{
          position: "absolute", left: "100%", top: 0, zIndex: 1001,
          background: "#fff", borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
          border: "1px solid #e0e0e0", padding: "4px 0", minWidth: 160,
        }}>
          {item.subItems.map((sub, j) => (
            <button
              key={j}
              onMouseEnter={() => setSubHovIdx(j)}
              onMouseLeave={() => setSubHovIdx(null)}
              onClick={() => onAction(sub.action ?? sub.label, sub)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px", border: "none",
                background: subHovIdx === j ? "#f0f7ff" : "transparent",
                cursor: "pointer", width: "100%", textAlign: "left",
                fontSize: 12, fontFamily: "inherit", color: "#1a1a1a",
              }}
            >
              <span style={{ fontSize: 13 }}>{sub.icon}</span>
              <span>{sub.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
