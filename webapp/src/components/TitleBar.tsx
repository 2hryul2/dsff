import { useState, useEffect } from "react";

const S = {
  bar: {
    background: "linear-gradient(135deg, #f8f8fa 0%, #eef1f5 100%)",
    padding: "8px 0 8px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid #e0e0e0",
    userSelect: "none" as const,
    WebkitAppRegion: "drag" as const,
  } as React.CSSProperties,
  left: { display: "flex", alignItems: "center", gap: 8 },
  appIcon: { fontSize: 16 },
  appName: { fontWeight: 600, fontSize: 13, color: "#1a1a1a" },
  winBtns: { display: "flex", WebkitAppRegion: "no-drag" as const } as React.CSSProperties,
};

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI?.onWindowState((state) => {
      setIsMaximized(state === "maximized");
    });
  }, []);

  const winBtns = [
    { label: "─",  title: "최소화",  action: () => window.electronAPI?.minimize(), isClose: false },
    { label: isMaximized ? "❐" : "□", title: isMaximized ? "이전 크기로" : "최대화", action: () => window.electronAPI?.maximize(), isClose: false },
    { label: "✕",  title: "닫기",    action: () => window.electronAPI?.close(),    isClose: true },
  ];

  return (
    <div style={S.bar}>
      <div style={S.left}>
        <span style={S.appIcon}>📂</span>
        <span style={S.appName}>DS FolderFit</span>
      </div>
      <div style={S.winBtns}>
        {winBtns.map((b) => (
          <button
            key={b.title}
            title={b.title}
            onClick={b.action}
            style={{
              width: 46, height: 32, border: "none", background: "transparent",
              cursor: "pointer", fontSize: 12, color: "#666",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                b.isClose ? "#e81123" : "#e5e5e5";
              if (b.isClose) (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#666";
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
