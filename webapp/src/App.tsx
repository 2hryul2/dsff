import React, { useState, useEffect, useCallback, useRef } from "react";
import TitleBar from "./components/TitleBar";
import AddressBar from "./components/AddressBar";
import CommandBar from "./components/CommandBar";
import NavigationPane from "./components/NavigationPane";
import FileList from "./components/FileList";
import DetailsPane from "./components/DetailsPane";
import StatusBar from "./components/StatusBar";
import ContextMenu from "./components/ContextMenu";
import type { MenuItem } from "./components/ContextMenu";
import DateTooltip from "./components/DateTooltip";
import AnalyzeView from "./components/views/AnalyzeView";
import PreviewView from "./components/views/PreviewView";
import DuplicatesView from "./components/views/DuplicatesView";
import RenameView from "./components/views/RenameView";
import SmartOrganizeView, { updateFolderKeywords } from "./components/views/SmartOrganizeView";
import type { AiStructureNode } from "./components/views/SmartOrganizeView";

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

/* ── Error Boundary — React 렌더링 오류 시 앱 전체 크래시 방지 ── */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: "center", background: "#fff", minHeight: "100vh" }}>
          <h2 style={{ color: "#dc2626", fontSize: 18 }}>오류가 발생했습니다</h2>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "12px 0" }}>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "8px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
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
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [activeView, setActiveView]     = useState<ActiveView>("explorer");
  const [watchActive, setWatchActive]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [organizeMode, setOrganizeMode] = useState<string | null>(null);
  const [sortCol, setSortCol]           = useState<keyof FileItem>("name");
  const [sortAsc, setSortAsc]           = useState(true);

  /* ── Clipboard state ── */
  const [clipboard, setClipboard] = useState<{ mode: "copy" | "cut"; files: FileItem[] } | null>(null);

  /* ── Inline rename state ── */
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);

  /* ── Delete confirmation modal ── */
  const [deleteConfirm, setDeleteConfirm] = useState<{ files: FileItem[] } | null>(null);

  /* (newFolderMode 제거 — handleNewFolder에서 직접 생성+이름편집) */
  const [contextMenu, setContextMenu]   = useState<ContextMenuState | null>(null);
  const [tooltip, setTooltip]           = useState<TooltipState | null>(null);
  const [navWidth, setNavWidth]         = useState(220);
  const [detailOpen, setDetailOpen]     = useState(true);
  const [detailWidth, setDetailWidth]   = useState(260);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [aiStructure, setAiStructure]   = useState<AiStructureNode[] | null>(null);
  const [aiProfileName, setAiProfileName] = useState<string | null>(null);
  const smartReapplyRef = useRef<(() => void) | null>(null);

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

  /* ── File search state (하위폴더 포함 재귀 검색) ── */
  interface SearchResult { name: string; path: string; size: string; sizeBytes: number; modified: string; created: string; accessed: string; icon: string; }
  const [fileSearchResults, setFileSearchResults] = useState<SearchResult[] | null>(null);
  const [fileSearchBusy, setFileSearchBusy] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  /* ── Filter/Search reset key (탭 전환 시 자식 컴포넌트 로컬 state 초기화용) ── */
  const [filterResetKey, setFilterResetKey] = useState(0);

  /* ── Modal state ── */
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  /* ── EML 더블클릭 시 세부정보 패널 열기 ── */
  const openEmlInPanel = useCallback(() => {
    setDetailOpen(true);
  }, []);

  /* ── Zoom state (80~150%, step 10) ── */
  const [zoom, setZoom] = useState(100);
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 150)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 80)), []);

  /* ── Load directory contents ── */
  const fetchDir = useCallback(async (path: string): Promise<FileItem[] | null> => {
    if (!path) return null;
    setLoading(true);
    setSelectedFiles([]);
    setRenamingFile(null);
    try {
      const items = await loadDirectory(path);
      setFiles(items);
      return items;
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load saved config on mount + 마지막 상태 복원 ── */
  useEffect(() => {
    window.electronAPI?.loadConfig().then(async (saved: ManagedFolder[]) => {
      if (!Array.isArray(saved) || saved.length === 0) return;
      setFolders(saved);

      // watching 상태 복원
      saved.filter((f) => f.watching).forEach((f) => {
        window.electronAPI?.watchStart(f.path);
      });

      // 마지막 탐색 상태 복원 시도
      const lastState = await window.electronAPI?.loadLastState();
      if (lastState?.folderPath) {
        const matched = saved.find((f) => f.path === lastState.folderPath);
        if (matched) {
          setActiveFolder(matched);
          if (matched.watching) setWatchActive(true);
          // 마지막 탐색 경로 복원 (해당 관리폴더 하위인지 확인)
          const restorePath = lastState.currentPath || matched.path;
          setCurrentPath(restorePath);
          const dirFiles = await fetchDir(restorePath);
          // 마지막 선택 파일 복원
          if (lastState.selectedFile && dirFiles) {
            const found = dirFiles.find((f: FileItem) => f.path === lastState.selectedFile);
            if (found) setSelectedFiles([found]);
          }
          return;
        }
      }

      // 마지막 상태가 없으면 첫 번째 폴더 열기
      const first = saved[0];
      setActiveFolder(first);
      setCurrentPath(first.path);
      fetchDir(first.path);
      if (first.watching) setWatchActive(true);
    });
  }, [fetchDir]);

  /* ── 마지막 탐색 상태 자동 저장 (경로·폴더·선택파일 변경 시) ── */
  useEffect(() => {
    if (!currentPath || !activeFolder) return;
    const sel = selectedFiles.length === 1 ? selectedFiles[0].path : null;
    window.electronAPI?.saveLastState({
      folderPath: activeFolder.path,
      currentPath,
      selectedFile: sel,
    });
  }, [currentPath, activeFolder, selectedFiles]);

  /* ── View change triggers CLI calls ── */
  useEffect(() => {
    if (!currentPath) return;

    if (activeView === "analyze") {
      setAnalyzeBusy(true);
      setAnalyzeError(null);
      window.electronAPI?.analyze(currentPath).then((res) => {
        if (res.ok && res.data) {
          setAnalyzeData(res.data);
          // 건강점수 + 분석 시간 업데이트
          setFolders((prev) => {
            const updated = prev.map((f) =>
              f.path === currentPath
                ? { ...f, score: res.data!.score, analyzedAt: new Date().toISOString() }
                : f
            );
            window.electronAPI?.saveConfig(updated);
            return updated;
          });
        } else {
          setAnalyzeError(res.error ?? "분석 실패");
        }
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
    const managedRoot = activeFolder?.path ?? currentPath;
    if (watchActive) {
      await window.electronAPI?.watchStop(currentPath);
      setWatchActive(false);
      setFolders((prev) => {
        const updated = prev.map((f) =>
          f.path === managedRoot ? { ...f, watching: false } : f
        );
        window.electronAPI?.saveConfig(updated);
        return updated;
      });
    } else {
      const res = await window.electronAPI?.watchStart(currentPath);
      if (res?.ok) {
        setWatchActive(true);
        setFolders((prev) => {
          const updated = prev.map((f) =>
            f.path === managedRoot ? { ...f, watching: true } : f
          );
          window.electronAPI?.saveConfig(updated);
          return updated;
        });
      } else {
        setModal({ title: "감시 시작 실패", message: res?.error ?? "알 수 없는 오류" });
      }
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

  /* ── Rename a managed folder label ── */
  function renameFolder(f: ManagedFolder, newLabel: string) {
    const updated = folders.map((fld) =>
      fld.path === f.path ? { ...fld, label: newLabel } : fld
    );
    setFolders(updated);
    window.electronAPI?.saveConfig(updated);
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
    .filter((f) => !searchQuery || (f.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
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

  // 다중 선택 핸들러 (Ctrl+클릭, Shift+클릭)
  function handleSelect(file: FileItem, e: React.MouseEvent | React.KeyboardEvent) {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isCtrl) {
      // Ctrl+클릭: 토글
      setSelectedFiles((prev) => {
        const exists = prev.find((f) => f.path === file.path);
        return exists ? prev.filter((f) => f.path !== file.path) : [...prev, file];
      });
    } else if (isShift && selectedFiles.length > 0) {
      // Shift+클릭: 범위 선택
      const lastSelected = selectedFiles[selectedFiles.length - 1];
      const startIdx = filteredFiles.findIndex((f) => f.path === lastSelected.path);
      const endIdx = filteredFiles.findIndex((f) => f.path === file.path);
      if (startIdx >= 0 && endIdx >= 0) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        setSelectedFiles(filteredFiles.slice(from, to + 1));
      }
    } else {
      setSelectedFiles([file]);
    }
  }

  function handleSelectAll() {
    setSelectedFiles([...filteredFiles]);
  }

  function handleSetView(v: ActiveView) {
    setActiveView(v);
    if (v !== "explorer") setSelectedFiles([]);
    // 탭 전환 시 필터·검색 상태 초기화
    setSearchQuery("");
    setFileSearchResults(null);
    setFileSearchQuery("");
    setFileSearchBusy(false);
    setFilterResetKey((k) => k + 1);
  }

  /* ── Clipboard operations ── */
  function handleCopy() {
    if (selectedFiles.length > 0) setClipboard({ mode: "copy", files: [...selectedFiles] });
  }
  function handleCut() {
    if (selectedFiles.length > 0) setClipboard({ mode: "cut", files: [...selectedFiles] });
  }
  async function handlePaste() {
    if (!clipboard || !currentPath) return;
    const errors: string[] = [];
    for (const file of clipboard.files) {
      const api = clipboard.mode === "cut"
        ? window.electronAPI?.moveFile(file.path, currentPath)
        : window.electronAPI?.copyFileTo(file.path, currentPath);
      const res = await api;
      if (!res?.ok) errors.push(`${file.name}: ${res?.error ?? "실패"}`);
    }
    if (clipboard.mode === "cut") setClipboard(null); // 잘라내기는 1회용
    if (errors.length > 0) setModal({ title: "붙여넣기 오류", message: errors.join("\n") });
    fetchDir(currentPath);
  }

  /* ── Delete with confirmation ── */
  function requestDelete(files: FileItem[]) {
    if (files.length === 0) return;
    setDeleteConfirm({ files });
  }
  async function confirmDelete() {
    if (!deleteConfirm) return;
    const root = activeFolder?.path ?? currentPath;
    const errors: string[] = [];
    for (const file of deleteConfirm.files) {
      const res = await window.electronAPI?.moveToDeleteBin(file.path, root);
      if (!res?.ok) errors.push(`${file.name}: ${res?.error ?? "실패"}`);
    }
    // 삭제된 파일을 선택에서 제거
    const deletedPaths = new Set(deleteConfirm.files.map((f) => f.path));
    setSelectedFiles((prev) => prev.filter((f) => !deletedPaths.has(f.path)));
    // 잘라내기 클립보드에서도 제거
    if (clipboard?.mode === "cut") {
      setClipboard((prev) => {
        if (!prev) return null;
        const remaining = prev.files.filter((f) => !deletedPaths.has(f.path));
        return remaining.length > 0 ? { ...prev, files: remaining } : null;
      });
    }
    setDeleteConfirm(null);
    if (errors.length > 0) setModal({ title: "삭제 오류", message: errors.join("\n") });
    if (currentPath) fetchDir(currentPath);
  }

  /* ── New folder creation ── */
  async function handleNewFolder() {
    if (!currentPath) return;
    // 고유한 이름 생성
    let name = "새 폴더";
    let counter = 1;
    const existingNames = new Set(files.map((f) => f.name));
    while (existingNames.has(name)) {
      name = `새 폴더 (${counter})`;
      counter++;
    }
    const res = await window.electronAPI?.createFolders(currentPath, [name]);
    if (res?.ok) {
      await fetchDir(currentPath);
      // 새 폴더를 선택하고 이름 편집 모드 진입
      const newFiles = await loadDirectory(currentPath);
      setFiles(newFiles);
      const created = newFiles.find((f) => f.name === name);
      if (created) {
        setSelectedFiles([created]);
        setRenamingFile(created);
      }
    } else {
      setModal({ title: "폴더 생성 실패", message: res?.error ?? "알 수 없는 오류" });
    }
  }

  /* ── File search (하위폴더 포함 재귀 검색) ── */
  async function handleFileSearch(query: string) {
    if (!currentPath || !query.trim()) return;
    setFileSearchBusy(true);
    setFileSearchQuery(query.trim());
    setFileSearchResults(null);
    try {
      const res = await window.electronAPI?.readDirRecursive(currentPath);
      if (res?.ok && res.data) {
        const q = query.trim().toLowerCase();
        const fmtDate = (iso: string) => {
          if (!iso) return "";
          const d = new Date(iso);
          const y = d.getFullYear();
          const M = String(d.getMonth() + 1).padStart(2, "0");
          const D = String(d.getDate()).padStart(2, "0");
          const h = String(d.getHours()).padStart(2, "0");
          const m = String(d.getMinutes()).padStart(2, "0");
          return `${y}.${M}.${D} ${h}:${m}`;
        };
        const fmtSize = (s: number) =>
          s > 1048576 ? `${(s / 1048576).toFixed(1)} MB`
          : s > 1024 ? `${(s / 1024).toFixed(1)} KB`
          : `${s} B`;
        const matched: SearchResult[] = res.data
          .filter((f: { name: string }) => f.name.toLowerCase().includes(q))
          .map((f: { name: string; path: string; size: number; modified: string; created: string; accessed?: string }) => ({
            name: f.name,
            path: f.path,
            size: fmtSize(f.size),
            sizeBytes: f.size,
            modified: fmtDate(f.modified),
            created: fmtDate(f.created),
            accessed: fmtDate(f.accessed ?? ""),
            icon: "📄",
          }));
        setFileSearchResults(matched);
      }
    } catch (err) {
      setModal({ title: "검색 오류", message: String(err) });
    } finally {
      setFileSearchBusy(false);
    }
  }

  /* ── Inline rename handler ── */
  async function handleRenameCommit(file: FileItem, newName: string) {
    const res = await window.electronAPI?.renameFile(file.path, newName);
    if (res?.ok) {
      setRenamingFile(null);
      if (currentPath) fetchDir(currentPath);
    } else {
      setModal({ title: "이름 바꾸기 실패", message: res?.error ?? "알 수 없는 오류" });
    }
  }

  /* ── Global keyboard shortcuts ── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // input/textarea에서는 무시
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (activeView !== "explorer") return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "c") { e.preventDefault(); handleCopy(); }
      if (ctrl && e.key === "x") { e.preventDefault(); handleCut(); }
      if (ctrl && e.key === "v") { e.preventDefault(); handlePaste(); }
      if (ctrl && e.key === "z") { e.preventDefault(); handleUndo(); }
      if (e.key === "Delete") { e.preventDefault(); requestDelete(selectedFiles); }
      if (e.key === "F2" && selectedFiles.length === 1) { e.preventDefault(); setRenamingFile(selectedFiles[0]); }
      if (e.key === "F5") { e.preventDefault(); if (currentPath) fetchDir(currentPath); }
      if (e.key === "Backspace") { e.preventDefault(); goUp(); }
      if (ctrl && e.shiftKey && e.key === "N") { e.preventDefault(); handleNewFolder(); }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); goForward(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles, currentPath, activeView, clipboard]);

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
    <ErrorBoundary>
    <div
      style={{ display: "flex", flexDirection: "column", height: `${10000 / zoom}vh`, width: `${10000 / zoom}vw`, fontFamily: "Segoe UI, Malgun Gothic, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f3f3f3", overflow: "hidden", transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
      onClick={() => { setContextMenu(null); setTooltip(null); }}
    >
      <TitleBar />

      <AddressBar
        currentPath={currentPath}
        managedPaths={folders.map((f) => f.path)}
        canGoBack={backStack.length > 0}
        canGoForward={fwdStack.length > 0}
        canGoUp={!!currentPath && parentDir(currentPath) !== currentPath}
        onBack={goBack}
        onForward={goForward}
        onUp={goUp}
        onNavigate={navigate}
        onSearch={setSearchQuery}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        activeView={activeView}
        resetKey={filterResetKey}
      />

      <CommandBar
        activeView={activeView}
        watchActive={watchActive}
        onSetView={handleSetView}
        onToggleWatch={handleWatchToggle}
        onUndo={handleUndo}
        onFileSearch={handleFileSearch}
        searchBusy={fileSearchBusy}
        resetKey={filterResetKey}
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Navigation Pane */}
        <NavigationPane
          folders={folders}
          active={activeFolder}
          width={navWidth}
          refreshKey={refreshKey}
          onSelect={selectFolder}
          onAddFolder={addFolder}
          onRemoveFolder={removeFolder}
          onRenameFolder={renameFolder}
          onNavigate={navigate}
        />

        {/* Resize handle */}
        <div
          onMouseDown={startNavResize}
          style={{ width: 4, cursor: "col-resize", background: "transparent", flexShrink: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#c0d0e8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
        />

        {/* Main content — 최소 폭 확보하여 세부정보 패널이 커져도 찌그러지지 않도록 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", minWidth: 320 }}>
          {/* Empty state */}
          {!currentPath && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9ca3af" }}>
              <span style={{ fontSize: 48 }}>📂</span>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#6b7280" }}>폴더를 추가하세요</div>
              <div style={{ fontSize: 13 }}>왼쪽 패널에서 <strong>폴더 추가</strong> 버튼을 클릭하세요</div>
            </div>
          )}

          {currentPath && (activeView === "explorer") && !fileSearchResults && (
            <FileList
              files={filteredFiles}
              selectedFiles={selectedFiles}
              sortCol={sortCol}
              sortAsc={sortAsc}
              loading={loading}
              renamingFile={renamingFile}
              onSort={handleSort}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onNavigate={navigate}
              onContextMenu={(file, x, y) => setContextMenu({ file, x, y })}
              onTooltip={(file, x, y) => setTooltip(file ? { file, x, y } : null)}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={() => setRenamingFile(null)}
              onOpenEml={openEmlInPanel}
            />
          )}

          {/* 파일 검색 결과 패널 */}
          {currentPath && (activeView === "explorer" || activeView === "smart") && fileSearchResults && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* 검색 결과 헤더 */}
              <div style={{
                padding: "8px 14px", background: "#eff6ff", borderBottom: "1px solid #bfdbfe",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔎</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                    "{fileSearchQuery}" 검색 결과
                  </span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    — {fileSearchResults.length}개 파일 발견
                  </span>
                </div>
                <button
                  onClick={() => { setFileSearchResults(null); setFileSearchQuery(""); }}
                  style={{
                    padding: "3px 12px", border: "1px solid #93c5fd", borderRadius: 4,
                    background: "#dbeafe", color: "#1d4ed8", cursor: "pointer",
                    fontSize: 12, fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  닫기 ✕
                </button>
              </div>
              {/* 검색 결과 목록 */}
              <div style={{ flex: 1, overflow: "auto", userSelect: "none" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, color: "#555", fontSize: 12 }}>파일명</th>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, color: "#555", fontSize: 12, width: 130 }}>수정한 날짜</th>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, color: "#555", fontSize: 12, width: 130 }}>만든 날짜</th>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, color: "#555", fontSize: 12, width: 130 }}>액세스 날짜</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 500, color: "#555", fontSize: 12, width: 80 }}>크기</th>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, color: "#555", fontSize: 12, width: 240 }}>상대 경로</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileSearchResults.map((f) => {
                      const relPath = f.path.replace(/\\/g, "/");
                      const basePath = currentPath.replace(/\\/g, "/");
                      const rel = relPath.startsWith(basePath)
                        ? relPath.slice(basePath.length).replace(/^\//, "").replace(/\/[^/]+$/, "")
                        : f.path.replace(/[\\/][^\\/]+$/, "");
                      return (
                        <tr
                          key={f.path}
                          style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f0f7ff"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          onDoubleClick={() => {
                            if (f.name.toLowerCase().endsWith(".eml")) openEmlInPanel();
                            else window.electronAPI?.openPath(f.path);
                          }}
                          onClick={() => {
                            const parentPath = f.path.replace(/[\\/][^\\/]+$/, "");
                            if (parentPath) {
                              setFileSearchResults(null);
                              setFileSearchQuery("");
                              navigate(parentPath);
                            }
                          }}
                        >
                          <td style={{ padding: "5px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                              <span style={{ color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap", fontSize: 11 }}>{f.modified}</td>
                          <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap", fontSize: 11 }}>{f.created}</td>
                          <td style={{ padding: "5px 10px", color: "#555", whiteSpace: "nowrap", fontSize: 11 }}>{f.accessed}</td>
                          <td style={{ padding: "5px 10px", color: "#555", textAlign: "right", whiteSpace: "nowrap", fontSize: 12 }}>{f.size}</td>
                          <td style={{ padding: "5px 10px", color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }} title={rel}>
                            {rel || "."}
                          </td>
                        </tr>
                      );
                    })}
                    {fileSearchResults.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

          {activeView === "smart" && activeFolder && !fileSearchResults && (
            <SmartOrganizeView
              folder={{ ...activeFolder, label: labelFromPath(currentPath) || activeFolder.label, path: currentPath || activeFolder.path }}
              searchQuery={searchQuery}
              onCancel={() => { handleSetView("explorer"); setAiStructure(null); setAiProfileName(null); }}
              onRefresh={() => { if (currentPath) fetchDir(currentPath); setRefreshKey((k) => k + 1); }}
              onAiStructure={(data, name) => { setAiStructure(data); setAiProfileName(name); setDetailOpen(true); }}
              onRegisterReapply={(fn) => { smartReapplyRef.current = fn; }}
            />
          )}
        </div>

        {/* Details Pane */}
        {detailOpen && currentPath && (
          <DetailsPane
            file={selectedFiles.length === 1 ? selectedFiles[0] : null}
            folder={displayFolder}
            onClose={() => setDetailOpen(false)}
            onSetView={handleSetView}
            onToggleWatch={handleWatchToggle}
            onRefresh={() => { if (currentPath) fetchDir(currentPath); setRefreshKey((k) => k + 1); }}
            activeView={activeView}
            aiStructure={aiStructure}
            aiProfileName={aiProfileName}
            width={detailWidth}
            onWidthChange={setDetailWidth}
            onKeywordSave={(folderName, keywords) => {
              if (aiProfileName) {
                updateFolderKeywords(aiProfileName, folderName, keywords);
                // AI추천 구조 트리의 키워드 수·목록도 즉시 반영
                if (aiStructure) {
                  const updateNode = (nodes: AiStructureNode[]): AiStructureNode[] =>
                    nodes.map((n) => {
                      if (n.name === folderName) {
                        return { ...n, keywords: [...keywords], keywordCount: keywords.length };
                      }
                      if (n.children.length > 0) {
                        return { ...n, children: updateNode(n.children) };
                      }
                      return n;
                    });
                  setAiStructure(updateNode(aiStructure));
                }
                smartReapplyRef.current?.();
              }
            }}
          />
        )}
        {(!detailOpen || !currentPath) && detailOpen && currentPath && null}
        {!detailOpen && (
          <button
            onClick={() => setDetailOpen(true)}
            title={activeView === "smart" ? "AI추천 구조 열기" : "세부 정보 열기"}
            style={{ width: 20, background: "#f0f0f0", border: "none", borderLeft: "1px solid #ddd", cursor: "pointer", color: "#666", fontSize: 10 }}
          >›</button>
        )}
      </div>

      <StatusBar
        totalFiles={filteredFiles.length}
        selectedFiles={selectedFiles}
        activeFolder={displayFolder}
        watchActive={watchActive}
        clipboardMode={clipboard?.mode}
        clipboardCount={clipboard?.files.length}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          items={contextMenu.file ? [
            // 파일/폴더 위에서 우클릭
            { icon: "📂", label: "열기", action: "open" },
            { icon: "✏️", label: "이름 바꾸기", action: "rename" },
            null,
            { icon: "📋", label: "복사                    Ctrl+C", action: "copy" },
            { icon: "✂️", label: "잘라내기             Ctrl+X", action: "cut" },
            null,
            { icon: "📁", label: "관리폴더로 이동", action: "move-to-folder",
              subItems: folders.map((f) => ({ icon: "📁", label: f.label, action: `move-to:${f.path}` })),
            },
            null,
            { icon: "🗑️", label: "삭제                    Delete", action: "delete" },
            null,
            { icon: "ℹ️", label: "속성", action: "properties" },
          ] : [
            // 빈 영역 우클릭
            { icon: "📁", label: "새 폴더           Ctrl+Shift+N", action: "new-folder" },
            ...(clipboard ? [
              null as MenuItem | null,
              { icon: "📋", label: `붙여넣기             Ctrl+V  (${clipboard.files.length}개)`, action: "paste" },
            ] : []),
            null,
            { icon: "🔄", label: "새로고침                       F5", action: "refresh" },
          ]}
          onClose={() => setContextMenu(null)}
          onAction={(action) => {
            const file = contextMenu.file;
            setContextMenu(null);

            // 빈 영역 메뉴 동작
            if (action === "new-folder") { handleNewFolder(); return; }
            if (action === "paste") { handlePaste(); return; }
            if (action === "refresh") { if (currentPath) fetchDir(currentPath); return; }

            if (!file) return;

            // 다중 선택 시 선택된 파일 목록 사용
            const targetFiles = selectedFiles.find((f) => f.path === file.path)
              ? selectedFiles : [file];

            if (action.startsWith("move-to:")) {
              const targetFolder = action.slice("move-to:".length);
              const moves = targetFiles.map((f) => ({ source: f.path, destFolder: targetFolder }));
              window.electronAPI?.organizeCustom(moves).then((res) => {
                if (res?.ok && res.data) {
                  const d = res.data as { moved: number; message: string };
                  setModal({ title: "파일 이동", message: d.message });
                  if (currentPath) fetchDir(currentPath);
                } else {
                  setModal({ title: "이동 실패", message: res?.error ?? "알 수 없는 오류" });
                }
              });
            } else if (action === "open") {
              if (file.category === "folder") {
                navigate(file.path);
              } else if (file.category === "email" && file.name.toLowerCase().endsWith(".eml")) {
                openEmlInPanel();
              } else {
                window.electronAPI?.openPath(file.path);
              }
            } else if (action === "rename") {
              setSelectedFiles([file]);
              setRenamingFile(file);
            } else if (action === "copy") {
              setClipboard({ mode: "copy", files: [...targetFiles] });
            } else if (action === "cut") {
              setClipboard({ mode: "cut", files: [...targetFiles] });
            } else if (action === "delete") {
              requestDelete(targetFiles);
            } else if (action === "properties") {
              const parentPath = file.path.replace(/[\\/][^\\/]+$/, "") || file.path;
              window.electronAPI?.openPath(parentPath);
            }
          }}
        />
      )}
      {tooltip && (
        <DateTooltip file={tooltip.file} x={tooltip.x} y={tooltip.y} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "24px 28px", minWidth: 340, maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700 }}>삭제 확인</h3>
            <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              {deleteConfirm.files.length === 1
                ? `"${deleteConfirm.files[0].name}"을(를) 삭제대상으로 이동하시겠습니까?`
                : `${deleteConfirm.files.length}개 항목을 삭제대상으로 이동하시겠습니까?`}
            </p>
            {deleteConfirm.files.length > 1 && deleteConfirm.files.length <= 10 && (
              <ul style={{ margin: "0 0 12px 0", padding: "0 0 0 20px", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                {deleteConfirm.files.map((f) => <li key={f.path}>{f.name}</li>)}
              </ul>
            )}
            <div style={{ textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "7px 20px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                취소
              </button>
              <button onClick={confirmDelete} style={{ padding: "7px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {modal && (
        <ResultModal title={modal.title} message={modal.message} onClose={() => setModal(null)} />
      )}
    </div>
    </ErrorBoundary>
  );
}
