import { useState } from "react";
import type { RenamePlan } from "../../types";

interface Props {
  plans: RenamePlan[];
  loading?: boolean;
  onRefresh?: (format: string, dateSource: string) => void;
  onExecute?: (format: string, dateSource: string) => void;
  onCancel?: () => void;
}

const FORMAT_OPTIONS = [
  { value: "YYYYMMDD", label: "YYYYMMDD (예: 20260327)" },
  { value: "YYMMDD",   label: "YYMMDD (예: 260327)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (예: 2026-03-27)" },
];

const DATE_SOURCE_OPTIONS = [
  { value: "created",  label: "만든 날짜" },
  { value: "modified", label: "수정한 날짜" },
];

export default function RenameView({ plans, loading, onRefresh, onExecute, onCancel }: Props) {
  const [format, setFormat] = useState("YYYYMMDD");
  const [dateSource, setDateSource] = useState("created");
  const [localPlans, setLocalPlans] = useState<RenamePlan[]>(plans);

  // Sync when plans change from parent
  if (plans !== localPlans && plans.length !== localPlans.length) {
    setLocalPlans(plans);
  }

  const active = localPlans.filter((p) => !p.skip);
  const skipped = localPlans.filter((p) => p.skip);

  function toggleSkip(from: string) {
    setLocalPlans((prev) => prev.map((p) => p.from === from ? { ...p, skip: !p.skip } : p));
  }

  function handleFormatChange(newFormat: string) {
    setFormat(newFormat);
    onRefresh?.(newFormat, dateSource);
  }

  function handleDateSourceChange(newSource: string) {
    setDateSource(newSource);
    onRefresh?.(format, newSource);
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f8f8fa" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>이름 변경 미리보기</h2>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>날짜 접두사 자동 추가</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ padding: "7px 14px", background: "#f0f0f0", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
            onClick={() => onCancel?.()}
          >
            취소
          </button>
          <button
            disabled={active.length === 0 || loading}
            style={{ padding: "7px 20px", background: active.length === 0 ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: active.length === 0 ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}
            onClick={() => onExecute?.(format, dateSource)}
          >
            {loading ? "실행 중..." : `${active.length}개 파일 이름 변경`}
          </button>
        </div>
      </div>

      {/* Format options */}
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>날짜 형식:</span>
          <select
            value={format}
            onChange={(e) => handleFormatChange(e.target.value)}
            style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontFamily: "inherit" }}
          >
            {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>날짜 기준:</span>
          <select
            value={dateSource}
            onChange={(e) => handleDateSourceChange(e.target.value)}
            style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontFamily: "inherit" }}
          >
            {DATE_SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          적용 대상: <strong>{active.length}</strong>개 / 건너뜀: <strong>{skipped.length}</strong>개
        </div>
      </div>

      {/* Table */}
      {localPlans.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 24, textAlign: "center", color: "#9ca3af" }}>
          리네임할 파일이 없습니다.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 90px", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #e4e4e7", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>
            <span>원래 이름</span>
            <span>변경될 이름</span>
            <span style={{ textAlign: "center" }}>날짜</span>
            <span style={{ textAlign: "center" }}>작업</span>
          </div>

          {localPlans.map((plan, i) => (
            <div
              key={plan.from}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 90px 90px",
                padding: "8px 14px",
                borderBottom: i < localPlans.length - 1 ? "1px solid #f5f5f5" : "none",
                background: plan.skip ? "#f9fafb" : "transparent",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: plan.skip ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {plan.from}
              </span>
              <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {plan.skip ? (
                  <span style={{ color: "#9ca3af", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    건너뜀 {plan.skipReason && `— ${plan.skipReason}`}
                  </span>
                ) : (
                  <span style={{ color: "#16a34a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plan.to}</span>
                )}
              </span>
              <span style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>{plan.date || "—"}</span>
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => toggleSkip(plan.from)}
                  style={{
                    padding: "3px 10px", fontSize: 11, cursor: "pointer", borderRadius: 4,
                    border: "1px solid #d1d5db", background: plan.skip ? "#f0f7ff" : "#fff",
                    color: plan.skip ? "#2563eb" : "#6b7280", fontFamily: "inherit",
                  }}
                >
                  {plan.skip ? "포함" : "건너뜀"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
