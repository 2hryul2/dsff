import { useState, useEffect, useCallback } from "react";
import TitleBar from "./components/TitleBar";
import AddressBar from "./components/AddressBar";
import CommandBar from "./components/CommandBar";
import NavigationPane from "./components/NavigationPane";
import FileList from "./components/FileList";
import DetailsPane from "./components/DetailsPane";
import StatusBar from "./components/StatusBar";
import ContextMenu from "./components/ContextMenu";
import DateTooltip from "./components/DateTooltip";
import AnalyzeView from "./components/views/AnalyzeView";
import PreviewView from "./components/views/PreviewView";
import DuplicatesView from "./components/views/DuplicatesView";
import RenameView from "./components/views/RenameView";

import {
  loadDirectory, parentDir,
} from "./services/fsService";
import type {
  ActiveView, FileItem, ManagedFolder,
  ContextMenuState, TooltipState,
  AnalysisData, OrganizePlan, DuplicateGroup, RenamePlan,
} from "./types";

/* ── Derive folder label from path ── */
function labelFromPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/$/, "").split("/").pop() ?? p;
}

/* CONTEXT_ITEMS is now built dynamically inside the component to include managed folders */

/* ── Result Modal ── */
function ResultModal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: "24px 28px", minWidth: 340, maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{message}</p>
        <div style={{ textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "7px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Loading Spinner ── */
function LoadingSpinner({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#6b7280" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e4e4e7", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13 }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Error Banner ── */
function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "16px 24px", maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>오류 발생</div>
        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{message}</div>
        {onRetry && (
          <button onClick={onRetry} style={{ marginTop: 12, padding: "6px 16px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 5, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  /* ── Managed folders ── */
  const [folders, setFolders]           = useState<ManagedFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<ManagedFolder | null>(null);

  /* ── Current browsing path (may be deeper than activeFolder.path) ── */
  const [currentPath, setCurrentPath]   = useState<string>("");
  const [backStack, setBackStack]       = useState<string[]>([]);
  const [fwdStack, setFwdStack]         = useState<string[]>([]);

  /* ── Files in current directory ── */
  const [files, setFiles]   = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* ── UI state ── */
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeView, setActiveView]     = useState<ActiveView>("explorer");
  const [watchActive, setWatchActive]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [organizeMode, setOrganizeMode] = useState<string | null>(null);
  const [sortCol, setSortCol]           = useState<keyof FileItem>("name");
  const [sortAsc, setSortAsc]           = useState(true);
  const [contextMenu, setContextMenu]   = useState<ContextMenuState | null>(null);
  const [tooltip, setTooltip]           = useState<TooltipState | null>(null);
  const [navWidth, setNavWidth]         = useState(220);
  const [detailOpen, setDetailOpen]     = useState(true);

  /* ── CLI data states ── */
  const [analyzeData, setAnalyzeData]     = useState<AnalysisData | null>(null);
  const [analyzeBusy, setAnalyzeBusy]     = useState(false);
  const [analyzeError, setAnalyzeError]   = useState<string | null>(null);

  const [organizeData, setOrganizeData]   = useState<OrganizePlan | null>(null);
  const [organizeBusy, setOrganizeBusy]   = useState(false);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  const [dupData, setDupData]             = useState<DuplicateGroup[] | null>(null);
  const [dupBusy, setDupBusy]             = useState(false);
  const [dupError, setDupError]           = useState<string | null>(null);

  const [renameData, setRenameData]       = useState<RenamePlan[] | null>(null);
  const [renameBusy, setRenameBusy]       = useState(false);
  const [renameError, setRenameError]     = useState<string | null>(null);

  /* ── Modal state ── */
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  /* ── Load directory contents ── */
  const fetchDir = useCallback(async (path: string) => {
    if (!path) return;
    setLoading(true);
    setSelectedFile(null);
    try {
      const items = await loadDirectory(path);
      setFiles(items);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load saved config on mount ── */
  useEffect(() => {
    window.electronAPI?.loadConfig().then((saved: ManagedFolder[]) => {
      if (Array.isArray(saved) && saved.length > 0) {
        setFolders(saved);
        const first = saved[0];
        setActiveFolder(first);
        setCurrentPath(first.path);
        fetchDir(first.path);
      }
    });
  }, [fetchDir]);

  /* ── View change triggers CLI calls ── */
  useEffect(() => {
    if (!currentPath) return;

    if (activeView === "analyze") {
      setAnalyzeBusy(true);
      setAnalyzeError(null);
      window.electronAPI?.analyze(currentPath).then((res) => {
        if (res.ok && res.data) setAnalyzeData(res.data);
        else setAnalyzeError(res.error ?? "분석 실패");
      }).catch((e) => setAnalyzeError(String(e))).finally(() => setAnalyzeBusy(false));
    }

    if (activeView === "duplicates") {
      setDupBusy(true);
      setDupError(null);
      window.electronAPI?.duplicates(currentPath, "report").then((res) => {
        if (res.ok && res.data) setDupData((res.data as { groups: DuplicateGroup[] }).groups);
        else setDupError(res.error ?? "중복 검사 실패");
      }).catch((e) => setDupError(String(e))).finally(() => setDupBusy(false));
    }

    if (activeView === "rename") {
      loadRenamePreview("YYYYMMDD", "created");
    }

    if (activeView === "preview") {
      loadOrganizePreview(organizeMode ?? "by-type");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, currentPath]);

  /* ── CLI action helpers ── */
  function loadOrganizePreview(mode: string) {
    if (!currentPath) return;
    setOrganizeBusy(true);
    setOrganizeError(null);
    window.electronAPI?.organize(currentPath, mode, false).then((res) => {
      if (res.ok && res.data) setOrganizeData(res.data as OrganizePlan);
      else setOrganizeError(res.error ?? "정리 미리보기 실패");
    }).catch((e) => setOrganizeError(String(e))).finally(() => setOrganizeBusy(false));
  }

  function loadRenamePreview(format: string, dateSource: string) {
    if (!currentPath) return;
    setRenameBusy(true);
    setRenameError(null);
    window.electronAPI?.rename(currentPath, format, dateSource, false).then((res) => {
      if (res.ok && res.data) {
        const d = res.data as { plans: RenamePlan[] };
        setRenameData(d.plans);
      } else {
        setRenameError(res.error ?? "리네임 미리보기 실패");
      }
    }).catch((e) => setRenameError(String(e))).finally(() => setRenameBusy(false));
  }

  async function handleOrganizeExecute(mode: string, customMoves?: Array<{ source: string; destFolder: string }>) {
    if (!currentPath) return;
    setOrganizeBusy(true);
    try {
      let res;
      if (customMoves && customMoves.length > 0) {
        // 사용자가 폴더명을 수정했거나 파일을 이동한 경우 → 커스텀 이동
        res = await window.electronAPI?.organizeCustom(customMoves);
      } else {
        // 기본 CLI 실행
        res = await window.electronAPI?.organize(currentPath, mode, true);
      }
      if (res?.ok && res.data) {
        const d = res.data as { moved: number; failed: number; message: string };
        setModal({ title: "정리 완료", message: d.message });
        fetchDir(currentPath);
        // 정리 후 미리보기 새로고침 (현재 상태 반영)
        loadOrganizePreview(mode);
      } else {
        setModal({ title: "정리 실패", message: res?.error ?? "알 수 없는 오류" });
      }
    } catch (e) {
      setModal({ title: "정리 실패", message: String(e) });
    } finally {
      setOrganizeBusy(false);
    }
  }

  async function handleRenameExecute(format: string, dateSource: string) {
    if (!currentPath) return;
    setRenameBusy(true);
    try {
      const res = await window.electronAPI?.rename(currentPath, format, dateSource, true);
      if (res?.ok && res.data) {
        const d = res.data as { success: number; failed: number; message: string };
        setModal({ title: "리네임 완료", message: d.message });
        fetchDir(currentPath);
      } else {
        setModal({ title: "리네임 실패", message: res?.error ?? "알 수 없는 오류" });
      }
    } catch (e) {
      setModal({ title: "리네임 실패", message: String(e) });
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleDuplicateProcess(action: string) {
    if (!currentPath) return;
    setDupBusy(true);
    try {
      const res = await window.electronAPI?.duplicates(currentPath, action);
      if (res?.ok && res.data) {
        const d = res.data as { processed?: number; savedDisplay?: string; message?: string; groups?: DuplicateGroup[] };
        if (d.message) {
          setModal({ title: "중복 처리 완료", message: d.message });
        }
        // Refresh duplicate list
        const res2 = await window.electronAPI?.duplicates(currentPath, "report");
        if (res2?.ok && res2.data) setDupData((res2.data as { groups: DuplicateGroup[] }).groups);
        fetchDir(currentPath);
      } else {
        setModal({ title: "중복 처리 실패", message: res?.error ?? "알 수 없는 오류" });
      }
    } catch (e) {
      setModal({ title: "중복 처리 실패", message: String(e) });
    } finally {
      setDupBusy(false);
    }
  }

  async function handleUndo() {
    if (!window.electronAPI?.undo) {
      setModal({ title: "되돌리기", message: "Electron API를 사용할 수 없습니다." });
      return;
    }
    try {
      const res = await window.electronAPI.undo(false);
      if (res.ok && res.data) {
        const d = res.data as { undone: number; message: string };
        setModal({ title: "되돌리기", message: d.message });
        if (currentPath) fetchDir(currentPath);
        // 현재 뷰 데이터도 갱신
        if (activeView === "analyze") {
          setActiveView("explorer");
          setTimeout(() => setActiveView("analyze"), 0);
        }
      } else {
        setModal({ title: "되돌리기", message: res.error ?? "되돌릴 작업이 없습니다." });
      }
    } catch (e) {
      setModal({ title: "되돌리기 실패", message: String(e) });
    }
  }

  async function handleWatchToggle() {
    if (!currentPath) return;
    if (watchActive) {
      await window.electronAPI?.watchStop(currentPath);
      setWatchActive(false);
    } else {
      const res = await window.electronAPI?.watchStart(currentPath);
      if (res?.ok) setWatchActive(true);
      else setModal({ title: "감시 시작 실패", message: res?.error ?? "알 수 없는 오류" });
    }
  }

  /* ── Navigate to a new path (with history) ── */
  function navigate(newPath: string) {
    if (!newPath || newPath === currentPath) return;
    setBackStack((s) => currentPath ? [...s, currentPath] : s);
    setFwdStack([]);
    setCurrentPath(newPath);
    setActiveView("explorer");
    setSearchQuery("");
    fetchDir(newPath);
  }

  function goBack() {
    if (backStack.length === 0) return;
    const prev = backStack[backStack.length - 1];
    setBackStack((s) => s.slice(0, -1));
    setFwdStack((s) => currentPath ? [currentPath, ...s] : s);
    setCurrentPath(prev);
    setActiveView("explorer");
    setSearchQuery("");
    fetchDir(prev);
  }

  function goForward() {
    if (fwdStack.length === 0) return;
    const next = fwdStack[0];
    setFwdStack((s) => s.slice(1));
    setBackStack((s) => currentPath ? [...s, currentPath] : s);
    setCurrentPath(next);
    setActiveView("explorer");
    setSearchQuery("");
    fetchDir(next);
  }

  function goUp() {
    const parent = parentDir(currentPath);
    if (parent && parent !== currentPath) navigate(parent);
  }

  /* ── Select a managed folder from nav pane ── */
  function selectFolder(f: ManagedFolder) {
    setActiveFolder(f);
    navigate(f.path);
  }

  /* ── Add a new managed folder via dialog ── */
  async function addFolder() {
    const picked = await window.electronAPI?.openFolder();
    if (!picked) return;
    const label = labelFromPath(picked);
    const newFolder: ManagedFolder = { label, path: picked, score: 0, watching: false };
    const updated = [...folders, newFolder];
    setFolders(updated);
    window.electronAPI?.saveConfig(updated);
    setActiveFolder(newFolder);
    navigate(picked);
  }

  /* ── Remove a managed folder ── */
  function removeFolder(f: ManagedFolder) {
    const updated = folders.filter((fld) => fld.path !== f.path);
    setFolders(updated);
    window.electronAPI?.saveConfig(updated);
    // 삭제한 폴더가 현재 선택된 폴더면 다른 폴더로 전환
    if (activeFolder?.path === f.path) {
      if (updated.length > 0) {
        setActiveFolder(updated[0]);
        setCurrentPath(updated[0].path);
        setActiveView("explorer");
        fetchDir(updated[0].path);
      } else {
        setActiveFolder(null);
        setCurrentPath("");
        setFiles([]);
      }
    }
  }

  /* ── Filtered + sorted file list ── */
  const filteredFiles = files
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Folders always first
      if (a.category === "folder" && b.category !== "folder") return -1;
      if (a.category !== "folder" && b.category === "folder") return 1;

      // Numeric sort for size column
      if (sortCol === "size") {
        return sortAsc ? a.sizeBytes - b.sizeBytes : b.sizeBytes - a.sizeBytes;
      }
      const av = String(a[sortCol] ?? "");
      const bv = String(b[sortCol] ?? "");
      const cmp = av.localeCompare(bv, "ko");
      return sortAsc ? cmp : -cmp;
    });

  function handleSort(col: keyof FileItem) {
    if (col === sortCol) setSortAsc((p) => !p);
    else { setSortCol(col); setSortAsc(true); }
  }

  function handleSetView(v: ActiveView) {
    setActiveView(v);
    if (v !== "explorer") setSelectedFile(null);
  }

  /* ── Nav pane resize drag ── */
  function startNavResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = navWidth;
    function onMove(me: MouseEvent) {
      setNavWidth(Math.min(360, Math.max(140, startW + me.clientX - startX)));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ── Derived display folder for non-explorer views ── */
  const displayFolder: ManagedFolder = activeFolder ?? {
    label: labelFromPath(currentPath) || "내 PC",
    path: currentPath,
    score: 0,
    watching: false,
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Segoe UI, Malgun Gothic, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f3f3f3", overflow: "hidden" }}
      onClick={() => { setContextMenu(null); setTooltip(null); }}
    >
      <TitleBar />

      <AddressBar
        currentPath={currentPath}
        canGoBack={backStack.length > 0}
        canGoForward={fwdStack.length > 0}
        canGoUp={!!currentPath && parentDir(currentPath) !== currentPath}
        onBack={goBack}
        onForward={goForward}
        onUp={goUp}
        onNavigate={navigate}
        onSearch={setSearchQuery}
      />

      <CommandBar
        activeView={activeView}
        watchActive={watchActive}
        onSetView={handleSetView}
        onOrganizeMode={(mode) => {
          setOrganizeMode(mode);
          // 이미 preview 뷰면 새 dry-run 즉시 호출
          if (activeView === "preview") {
            loadOrganizePreview(mode);
          }
        }}
        onToggleWatch={handleWatchToggle}
        onUndo={handleUndo}
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Navigation Pane */}
        <NavigationPane
          folders={folders}
          active={activeFolder}
          width={navWidth}
          onSelect={selectFolder}
          onAddFolder={addFolder}
          onRemoveFolder={removeFolder}
          onNavigate={navigate}
        />

        {/* Resize handle */}
        <div
          onMouseDown={startNavResize}
          style={{ width: 4, cursor: "col-resize", background: "transparent", flexShrink: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#c0d0e8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
        />

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
          {/* Empty state */}
          {!currentPath && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9ca3af" }}>
              <span style={{ fontSize: 48 }}>📂</span>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#6b7280" }}>폴더를 추가하세요</div>
              <div style={{ fontSize: 13 }}>왼쪽 패널에서 <strong>폴더 추가</strong> 버튼을 클릭하세요</div>
            </div>
          )}

          {currentPath && activeView === "explorer" && (
            <FileList
              files={filteredFiles}
              selected={selectedFile}
              sortCol={sortCol}
              sortAsc={sortAsc}
              loading={loading}
              onSort={handleSort}
              onSelect={setSelectedFile}
              onNavigate={navigate}
              onContextMenu={(file, x, y) => setContextMenu({ file, x, y })}
              onTooltip={(file, x, y) => setTooltip(file ? { file, x, y } : null)}
            />
          )}

          {currentPath && activeView === "analyze" && (
            analyzeBusy ? <LoadingSpinner label="폴더 분석 중..." /> :
            analyzeError ? <ErrorBanner message={analyzeError} onRetry={() => { setActiveView("explorer"); setTimeout(() => setActiveView("analyze"), 0); }} /> :
            analyzeData ? <AnalyzeView data={analyzeData} folder={displayFolder} onRefresh={() => { setActiveView("explorer"); setTimeout(() => setActiveView("analyze"), 0); }} onAction={(action) => {
              if (action === "중복 검사 실행") handleSetView("duplicates");
            }} /> : null
          )}

          {currentPath && activeView === "preview" && (
            organizeBusy ? <LoadingSpinner label="정리 계획 생성 중..." /> :
            organizeError ? <ErrorBanner message={organizeError} onRetry={() => loadOrganizePreview(organizeMode ?? "by-type")} /> :
            <PreviewView
              data={organizeData}
              organizeMode={organizeMode ?? "by-type"}
              folder={displayFolder}
              currentPath={currentPath}
              loading={organizeBusy}
              onModeChange={(mode) => { setOrganizeMode(mode); loadOrganizePreview(mode); }}
              onExecute={(mode, customMoves) => handleOrganizeExecute(mode, customMoves)}
              onCancel={() => handleSetView("explorer")}
            />
          )}

          {currentPath && activeView === "duplicates" && (
            dupBusy ? <LoadingSpinner label="중복 파일 검사 중..." /> :
            dupError ? <ErrorBanner message={dupError} onRetry={() => { setActiveView("explorer"); setTimeout(() => setActiveView("duplicates"), 0); }} /> :
            dupData ? <DuplicatesView groups={dupData} loading={dupBusy} onProcess={handleDuplicateProcess} /> : null
          )}

          {currentPath && activeView === "rename" && (
            renameBusy ? <LoadingSpinner label="리네임 미리보기 생성 중..." /> :
            renameError ? <ErrorBanner message={renameError} onRetry={() => loadRenamePreview("YYYYMMDD", "created")} /> :
            renameData ? <RenameView plans={renameData} loading={renameBusy} onRefresh={loadRenamePreview} onExecute={handleRenameExecute} onCancel={() => handleSetView("explorer")} /> : null
          )}
        </div>

        {/* Details Pane */}
        {detailOpen && currentPath && (
          <DetailsPane
            file={selectedFile}
            folder={displayFolder}
            onClose={() => setDetailOpen(false)}
          />
        )}
        {(!detailOpen || !currentPath) && detailOpen && currentPath && null}
        {!detailOpen && (
          <button
            onClick={() => setDetailOpen(true)}
            title="세부 정보 열기"
            style={{ width: 20, background: "#f0f0f0", border: "none", borderLeft: "1px solid #ddd", cursor: "pointer", color: "#666", fontSize: 10 }}
          >›</button>
        )}
      </div>

      <StatusBar
        totalFiles={filteredFiles.length}
        selected={selectedFile}
        activeFolder={displayFolder}
        watchActive={watchActive}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          items={[
            { icon: "📂", label: "열기", action: "open" },
            { icon: "✏️", label: "이름 바꾸기", action: "rename" },
            { icon: "📋", label: "복사", action: "copy" },
            { icon: "✂️", label: "잘라내기", action: "cut" },
            null,
            { icon: "📁", label: "관리폴더로 이동", action: "move-to-folder",
              subItems: folders.map((f) => ({ icon: "📁", label: f.label, action: `move-to:${f.path}` })),
            },
            null,
            { icon: "🗑️", label: "삭제", action: "delete" },
            null,
            { icon: "ℹ️", label: "속성", action: "properties" },
          ]}
          onClose={() => setContextMenu(null)}
          onAction={(action) => {
            if (action.startsWith("move-to:") && contextMenu.file) {
              const targetFolder = action.slice("move-to:".length);
              const sourcePath = contextMenu.file.path;
              // Electron IPC로 파일 이동
              window.electronAPI?.organizeCustom([{ source: sourcePath, destFolder: targetFolder }]).then((res) => {
                if (res?.ok && res.data) {
                  const d = res.data as { moved: number; message: string };
                  setModal({ title: "파일 이동", message: d.message });
                  if (currentPath) fetchDir(currentPath);
                } else {
                  setModal({ title: "이동 실패", message: res?.error ?? "알 수 없는 오류" });
                }
              });
            } else if (action === "open" && contextMenu.file) {
              if (contextMenu.file.category === "folder") {
                navigate(contextMenu.file.path);
              } else {
                window.electronAPI?.openPath(contextMenu.file.path);
              }
            }
          }}
        />
      )}
      {tooltip && (
        <DateTooltip file={tooltip.file} x={tooltip.x} y={tooltip.y} />
      )}

      {/* Result Modal */}
      {modal && (
        <ResultModal title={modal.title} message={modal.message} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
