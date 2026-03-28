import type { FileItem } from "../types";

interface Props {
  file: FileItem;
  x: number;
  y: number;
}

export default function DateTooltip({ file, x, y }: Props) {
  const rows: [string, string | undefined][] = [
    ["수정", file.modified],
    ["만든 날짜", file.created],
    ["액세스", file.accessed],
  ];
  const visible = rows.filter(([, v]) => v);
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed", left: x + 12, top: y,
        zIndex: 900, pointerEvents: "none",
        background: "rgba(30,30,30,0.92)", color: "#fff",
        borderRadius: 6, padding: "6px 10px", fontSize: 11,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        lineHeight: 1.7,
      }}
    >
      {visible.map(([label, val]) => (
        <div key={label} style={{ display: "flex", gap: 8 }}>
          <span style={{ color: "#9ca3af", minWidth: 68 }}>{label}</span>
          <span>{val}</span>
        </div>
      ))}
    </div>
  );
}
