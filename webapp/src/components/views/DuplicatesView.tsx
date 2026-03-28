import { useState } from "react";
import type { DuplicateGroup, DuplicateCopy } from "../../types";

interface Props {
  groups: DuplicateGroup[];
  loading?: boolean;
  onProcess?: (action: string) => void;
}

function CopyRow({ copy, onChange }: { copy: DuplicateCopy; onChange: (checked: boolean) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 12px 5px 32px", background: hov ? "#f9fafb" : "transparent", fontSize: 12 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <input
        type="checkbox"
        checked={copy.checked}
        disabled={copy.original}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: copy.original ? "default" : "pointer" }}
      />
      <span style={{ flex: 1, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {copy.path}
      </span>
      {copy.original && <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 10, padding: "1px 7px", flexShrink: 0 }}>원본</span>}
      <span style={{ color: "#9ca3af", flexShrink: 0 }}>{copy.date}</span>
      <span style={{ color: "#6b7280", flexShrink: 0, minWidth: 60, textAlign: "right" }}>{copy.size}</span>
    </div>
  );
}

export default function DuplicatesView({ groups, loading, onProcess }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set(groups.map((g) => g.id)));
  const [localGroups, setLocalGroups] = useState(groups);

  // Sync when groups change from parent
  if (groups !== localGroups && groups.length !== localGroups.length) {
    setLocalGroups(groups);
    setExpanded(new Set(groups.map((g) => g.id)));
  }

  const totalWasted = localGroups.reduce((s, g) => {
    const mb = parseFloat(g.wastedSize);
    return s + (isNaN(mb) ? 0 : mb);
  }, 0);

  function toggleGroup(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCopy(groupId: number, copyIdx: number, checked: boolean) {
    setLocalGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, copies: g.copies.map((c, i) => i === copyIdx ? { ...c, checked } : c) }
        : g
    ));
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f8f8fa" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>중복 파일 검사</h2>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{localGroups.length}개 그룹 발견</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={loading}
            style={{ padding: "7px 14px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: loading ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}
            onClick={() => onProcess?.("trash")}
          >
            🗑️ 선택 삭제
          </button>
          <button
            disabled={loading}
            style={{ padding: "7px 14px", background: "#f0f7ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, cursor: loading ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}
            onClick={() => onProcess?.("move")}
          >
            📁 선택 이동
          </button>
        </div>
      </div>

      {localGroups.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 24, textAlign: "center", color: "#16a34a" }}>
          중복 파일이 없습니다.
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 24 }}>🔄</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{localGroups.length}개 그룹의 중복 파일 발견</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                예상 절약 용량: <strong style={{ color: "#dc2626" }}>{totalWasted.toFixed(1)} MB</strong>
              </div>
            </div>
          </div>

          {/* Groups */}
          {localGroups.map((group) => {
            const isOpen = expanded.has(group.id);
            const checkedCount = group.copies.filter((c) => c.checked).length;
            return (
              <div key={group.id} style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
                {/* Group header */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: isOpen ? "#fafafa" : "#fff" }}
                >
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{isOpen ? "▼" : "▶"}</span>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{group.name}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{group.copies.length}개 사본</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>총 {group.totalSize}</span>
                  <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>낭비 {group.wastedSize}</span>
                  {checkedCount > 0 && (
                    <span style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "1px 7px" }}>
                      {checkedCount}개 선택
                    </span>
                  )}
                </div>

                {/* Copies */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f0f0f0" }}>
                    {/* Column headers */}
                    <div style={{ display: "flex", padding: "4px 12px 4px 32px", fontSize: 10, color: "#9ca3af", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ width: 20 }} />
                      <span style={{ flex: 1 }}>경로</span>
                      <span style={{ width: 80, textAlign: "center" }}>수정 날짜</span>
                      <span style={{ width: 60, textAlign: "right" }}>크기</span>
                    </div>
                    {group.copies.map((copy, i) => (
                      <CopyRow key={i} copy={copy} onChange={(checked) => toggleCopy(group.id, i, checked)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
