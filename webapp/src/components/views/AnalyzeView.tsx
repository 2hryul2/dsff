import type { AnalysisData, ManagedFolder, Recommendation } from "../../types";

interface Props {
  data: AnalysisData;
  folder: ManagedFolder;
  onRefresh?: () => void;
  onAction?: (action: string) => void;
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "14px 16px", flex: "1 1 160px", minWidth: 140 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "#1a1a1a" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function BarRow({ label, pct, count, color }: { label: string; pct: number; count: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#374151" }}>{label}</span>
        <span style={{ color: "#9ca3af" }}>{count}개 ({pct}%)</span>
      </div>
      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

const SCORE_COLOR = (s: number) => s >= 80 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";
const SCORE_LABEL = (s: number) => s >= 80 ? "양호" : s >= 50 ? "보통" : "정리 필요";

export default function AnalyzeView({ data, folder, onRefresh, onAction }: Props) {
  const recommendations: Recommendation[] = data.recommendations ?? [];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f8f8fa" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>폴더 분석 — {folder.label}</h2>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{folder.path}</div>
        </div>
        <button
          style={{ padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
          onClick={() => onRefresh?.()}
        >
          분석 새로고침
        </button>
      </div>

      {/* Health Score */}
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: SCORE_COLOR(data.score) }}>{data.score}</div>
          <div style={{ fontSize: 12, color: SCORE_COLOR(data.score), fontWeight: 600 }}>{SCORE_LABEL(data.score)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>건강 점수</div>
          <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${data.score}%`, background: `linear-gradient(90deg, ${SCORE_COLOR(data.score)}, ${SCORE_COLOR(data.score)}aa)`, borderRadius: 6, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>파일 정리 상태, 중복, 크기, 날짜 기반 종합 점수</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <StatCard icon="📄" label="전체 파일" value={data.totalFiles.toLocaleString()} sub={data.totalSize} />
        <StatCard icon="🔄" label="중복 파일" value={data.duplicates} sub={`${data.wastedSize} 낭비`} color="#dc2626" />
        <StatCard icon="📦" label="대형 파일" value={data.largeFiles} sub={data.largeSize} color="#d97706" />
        <StatCard icon="🕰️" label="오래된 파일" value={data.oldFiles} sub="1년 이상" color="#9ca3af" />
      </div>

      {/* Two-column layout: categories + distributions */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        {/* Category breakdown */}
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16, flex: "2 1 300px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>파일 형식 분류</div>
          {data.categories.map((c) => (
            <BarRow key={c.name} label={`${c.name} (${c.size})`} pct={c.pct} count={c.count} color={c.color} />
          ))}
        </div>

        {/* Age + Size distributions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 220px" }}>
          <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>파일 연령 분포</div>
            {data.ageDistribution.map((r) => (
              <BarRow key={r.label} label={r.label} pct={r.pct} count={r.count} color="#60a5fa" />
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>파일 크기 분포</div>
            {data.sizeDistribution.map((r) => (
              <BarRow key={r.label} label={r.label} pct={r.pct} count={r.count} color="#34d399" />
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>추천 작업</div>
          {recommendations.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < recommendations.length - 1 ? "1px solid #f0f0f0" : "none" }}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{r.text}</span>
              <button
                style={{ padding: "4px 12px", background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 5, cursor: "pointer", fontSize: 11, color: "#1d4ed8", fontFamily: "inherit" }}
                onClick={() => onAction?.(r.action)}
              >
                {r.action}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
