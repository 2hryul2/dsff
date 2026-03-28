import { useState } from "react";
import type { FileItem, ManagedFolder } from "../types";

interface Props {
  file: FileItem | null;
  folder: ManagedFolder;
  onClose: () => void;
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

function ActionBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick ?? (() => alert(`${label} 실행`))}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "8px 6px", border: "1px solid #e4e4e7", borderRadius: 6,
        background: hov ? "#f0f7ff" : "#fff", cursor: "pointer",
        fontSize: 10, color: "#374151", fontFamily: "inherit", flex: 1,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function DetailsPane({ file, folder, onClose }: Props) {
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
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", wordBreak: "break-all", lineHeight: 1.4 }}>
                {file.name}
              </div>
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
                <ActionBtn icon="✏️" label="이름 변경" />
                <ActionBtn icon="📋" label="복사" />
                <ActionBtn icon="🗑️" label="삭제" />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <ActionBtn icon="🔍" label="중복 검사" />
                <ActionBtn icon="📊" label="분석" />
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
                <ActionBtn icon="🗂️" label="정리" />
                <ActionBtn icon="📊" label="분석" />
                <ActionBtn icon="👁️" label="감시" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
