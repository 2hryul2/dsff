import { useState, useEffect, useRef } from "react";
import type { EmlData, EmlAttachmentMeta } from "../types";
import { formatSize } from "../services/fsService";

/* ── DetailsPane 인라인 EML 뷰어 ── */
interface Props {
  filePath: string;
}

/* ── 첨부파일 아이콘 (MIME 타입 기반) ── */
function attachIcon(ct: string): string {
  if (ct.startsWith("image/")) return "\u{1F5BC}\uFE0F";
  if (ct.includes("pdf")) return "\u{1F4C4}";
  if (ct.includes("spreadsheet") || ct.includes("excel")) return "\u{1F4CA}";
  if (ct.includes("presentation") || ct.includes("powerpoint")) return "\u{1F4CA}";
  if (ct.includes("word") || ct.includes("document")) return "\u{1F4DD}";
  if (ct.includes("zip") || ct.includes("compressed") || ct.includes("archive")) return "\u{1F4E6}";
  if (ct.startsWith("text/")) return "\u{1F4C4}";
  return "\u{1F4CE}";
}

/* ── 이메일 헤더 ── */
function EmlHeader({ data }: { data: EmlData }) {
  const rows: { label: string; value: string }[] = [
    { label: "보낸 사람", value: data.from },
    { label: "받는 사람", value: data.to },
  ];
  if (data.cc) rows.push({ label: "참조", value: data.cc });
  if (data.date) rows.push({ label: "날짜", value: data.date });

  return (
    <div style={{ marginBottom: 8 }}>
      {/* 제목 */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#1e293b",
        marginBottom: 8, lineHeight: 1.4, wordBreak: "break-word",
      }}>
        {data.subject}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{
                padding: "2px 6px 2px 0", color: "#9ca3af",
                whiteSpace: "nowrap", verticalAlign: "top", width: 58, fontSize: 10,
              }}>
                {r.label}
              </td>
              <td style={{ padding: "2px 0", color: "#374151", wordBreak: "break-all", lineHeight: 1.4 }}>
                {r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── 첨부파일 목록 (본문 위에 표시) ── */
function EmlAttachments({ attachments, filePath }: { attachments: EmlAttachmentMeta[]; filePath: string }) {
  const [extracting, setExtracting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  async function handleOpen(att: EmlAttachmentMeta) {
    setExtracting(att.index);
    setError(null);
    try {
      const res = await window.electronAPI?.extractEmlAttachment(filePath, att.index);
      if (res && !res.ok) setError(`${att.filename}: ${res.error}`);
    } catch (err: any) {
      setError(`${att.filename}: ${err.message}`);
    } finally {
      setExtracting(null);
    }
  }

  return (
    <div style={{
      background: "#fefce8", border: "1px solid #fde68a", borderRadius: 5,
      padding: "6px 8px", marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, color: "#92400e", marginBottom: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 12 }}>📎</span> 첨부파일 ({attachments.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {attachments.map((att) => (
          <div
            key={att.index}
            onClick={() => handleOpen(att)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 6px", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: 4,
              fontSize: 11, cursor: extracting === att.index ? "default" : "pointer",
              opacity: extracting === att.index ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (extracting !== att.index) (e.currentTarget as HTMLElement).style.background = "#f0f9ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            <span style={{ fontSize: 13 }}>{attachIcon(att.contentType)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {att.filename}
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af" }}>{formatSize(att.size)}</div>
            </div>
            <span style={{ fontSize: 9, color: "#2563eb", flexShrink: 0 }}>
              {extracting === att.index ? "..." : "열기"}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <div style={{ fontSize: 10, color: "#dc2626", marginTop: 3, padding: "3px 5px", background: "#fef2f2", borderRadius: 3 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ── 이메일 본문 ── */
function EmlBody({ data }: { data: EmlData }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeH, setIframeH] = useState(200);

  useEffect(() => {
    if (!data.htmlBody || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const adjust = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) setIframeH(Math.min(600, Math.max(120, doc.body.scrollHeight + 20)));
      } catch { /* 크로스 오리진 무시 */ }
    };
    iframe.addEventListener("load", adjust);
    return () => iframe.removeEventListener("load", adjust);
  }, [data.htmlBody]);

  if (!data.htmlBody && !data.textBody) {
    return (
      <div style={{ padding: "10px 0", fontSize: 11, color: "#9ca3af", fontStyle: "italic", textAlign: "center" }}>
        (본문 없음)
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>본문</div>
      {data.htmlBody ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          srcDoc={data.htmlBody}
          style={{
            width: "100%", height: iframeH, border: "1px solid #e5e7eb",
            borderRadius: 4, background: "#fff",
          }}
          title="이메일 본문"
        />
      ) : (
        <pre style={{
          fontSize: 11, color: "#374151", whiteSpace: "pre-wrap", wordWrap: "break-word",
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4,
          padding: 8, maxHeight: 600, overflowY: "auto", margin: 0, lineHeight: 1.5,
        }}>
          {data.textBody}
        </pre>
      )}
    </div>
  );
}

/* ── 메인 인라인 EmlViewer ── */
export default function EmlViewer({ filePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmlData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await window.electronAPI?.parseEml(filePath);
        if (cancelled) return;
        if (!res || !res.ok) setError(res?.error || "이메일 파일을 읽을 수 없습니다");
        else setData(res.data!);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) {
    return (
      <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: 6, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>📧 이메일 파싱 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 8, marginTop: 6 }}>
        <div style={{ fontSize: 11, color: "#dc2626", padding: 8, background: "#fef2f2", borderRadius: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>이메일 읽기 실패</div>
          <div style={{ fontSize: 10, color: "#b91c1c" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 10, marginTop: 6 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#1d4ed8", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span>📧</span> 이메일 미리보기
      </div>
      <EmlHeader data={data} />
      <EmlAttachments attachments={data.attachments} filePath={filePath} />
      <EmlBody data={data} />
    </div>
  );
}
