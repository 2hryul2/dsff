"use strict";

const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");
const { spawn } = require("child_process");

let win;

/* ── Config path (userData/dsff-folders.json) ── */
const configPath = () => path.join(app.getPath("userData"), "dsff-folders.json");

/* ── Python CLI bridge ── */
let dsffCmd = null;   // { exe: string, args: string[] }

function findDsff() {
  const { execSync } = require("child_process");

  // 1. 번들된 dsff.exe (같은 디렉토리 또는 resources)
  const candidates = [
    path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."), "dsff.exe"),
    path.join(app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, "../.."), "dist", "dsff.exe"),
    path.join(app.isPackaged ? path.dirname(process.execPath) : __dirname, "dsff.exe"),
  ];
  for (const exe of candidates) {
    if (fs.existsSync(exe)) {
      try {
        execSync(`"${exe}" --version`, { timeout: 10000, stdio: "pipe" });
        return { exe, args: [] };
      } catch { /* continue */ }
    }
  }

  // 2. python -m dsff (개발 모드)
  for (const cmd of ["python", "python3"]) {
    try {
      execSync(`${cmd} -m dsff --version`, { timeout: 10000, stdio: "pipe" });
      return { exe: cmd, args: ["-m", "dsff"] };
    } catch { /* continue */ }
  }

  return null;
}

function runDsff(args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    if (!dsffCmd) dsffCmd = findDsff();
    if (!dsffCmd) return reject(new Error("dsff.exe 또는 Python dsff 패키지를 찾을 수 없습니다."));

    const proc = spawn(dsffCmd.exe, [...dsffCmd.args, "--json", ...args], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
    proc.stderr.on("data", (d) => { stderr += d.toString("utf8"); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("CLI 실행 시간 초과 (120초)"));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `프로세스 종료 코드: ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(stdout.trim());
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`프로세스 실행 실패: ${err.message}`));
    });
  });
}

/* ── Watch subprocess manager ── */
const watchProcesses = new Map(); // path → ChildProcess

function startWatch(targetPath) {
  if (watchProcesses.has(targetPath)) return;
  if (!dsffCmd) dsffCmd = findDsff();
  if (!dsffCmd) return;

  const proc = spawn(dsffCmd.exe, [...dsffCmd.args, "--json", "watch", targetPath], {
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    windowsHide: true,
  });

  proc.stdout.on("data", (chunk) => {
    const lines = chunk.toString("utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (win) win.webContents.send("watch:event", { path: targetPath, ...event });
      } catch { /* skip non-JSON lines */ }
    }
  });

  proc.on("close", () => {
    watchProcesses.delete(targetPath);
    if (win) win.webContents.send("watch:event", { path: targetPath, event: "stopped" });
  });

  proc.on("error", () => { watchProcesses.delete(targetPath); });
  watchProcesses.set(targetPath, proc);
}

function stopWatch(targetPath) {
  const proc = watchProcesses.get(targetPath);
  if (proc) {
    proc.kill();
    watchProcesses.delete(targetPath);
  }
}

/* ── Window ── */
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    backgroundColor: "#f3f3f3",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.loadFile(path.join(__dirname, "../dist/index.html"));

  win.once("ready-to-show", () => { win.show(); });
  win.on("maximize",   () => win.webContents.send("window-state", "maximized"));
  win.on("unmaximize", () => win.webContents.send("window-state", "normal"));
  win.on("closed",     () => { win = null; });
}

/* ── Window controls ── */
ipcMain.on("window-minimize", () => win && win.minimize());
ipcMain.on("window-maximize", () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on("window-close", () => win && win.close());

/* ── Open path in OS Explorer ── */
ipcMain.handle("open-path", (_e, p) => shell.openPath(p));

/* ── Read directory recursively (all files, no subdirs) ── */
ipcMain.handle("fs:readDirRecursive", async (_e, dirPath) => {
  const results = [];
  const SKIP = new Set(["node_modules", "__pycache__", ".git", "삭제대상"]);
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) walk(full);
      } else {
        try {
          const st = fs.statSync(full);
          results.push({
            name: entry.name,
            path: full,
            size: st.size,
            modified: st.mtime.toISOString(),
            created: st.birthtime.toISOString(),
          });
        } catch { /* skip */ }
      }
    }
  }
  walk(dirPath);
  return { ok: true, data: results };
});

/* ── Create folder structure under basePath ── */
ipcMain.handle("fs:createFolders", async (_e, basePath, folderNames) => {
  try {
    for (const name of folderNames) {
      const target = path.join(basePath, name);
      if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

/* ── Rename file/folder ── */
ipcMain.handle("fs:renameFile", async (_e, oldPath, newName) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    return { ok: true, data: { newPath } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

/* ── Copy file/folder (same dir, "_복사본" suffix) ── */
ipcMain.handle("fs:copy", async (_e, srcPath) => {
  try {
    const dir = path.dirname(srcPath);
    const ext = path.extname(srcPath);
    const base = path.basename(srcPath, ext);
    const destPath = path.join(dir, `${base}_복사본${ext}`);
    fs.cpSync(srcPath, destPath, { recursive: true });
    return { ok: true, data: { destPath } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

/* ── Move to "삭제대상" folder inside managed root ── */
ipcMain.handle("fs:moveToDeleteBin", async (_e, filePath, managedRoot) => {
  try {
    const binDir = path.join(managedRoot, "삭제대상");
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    let dest = path.join(binDir, path.basename(filePath));
    // 같은 이름 충돌 방지: 타임스탬프 접미사 추가
    if (fs.existsSync(dest)) {
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      dest = path.join(binDir, `${base}_${Date.now()}${ext}`);
    }
    fs.renameSync(filePath, dest);
    return { ok: true, data: { dest } };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

/* ── 빈 폴더 탐색 ── */
ipcMain.handle("fs:findEmptyDirs", async (_e, dirPath) => {
  try {
    const SKIP = new Set(["삭제대상", "node_modules", "__pycache__", ".git"]);
    const emptyDirs = [];
    function hasFiles(dir) {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
          if (!entry.isDirectory()) return true;
          if (hasFiles(path.join(dir, entry.name))) return true;
        }
      } catch { /* 접근 불가 디렉토리 무시 */ }
      return false;
    }
    function walk(dir) {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (!hasFiles(full)) emptyDirs.push(full);
          else walk(full);
        }
      } catch { /* 접근 불가 디렉토리 무시 */ }
    }
    walk(dirPath);
    return { ok: true, data: emptyDirs };
  } catch (err) { return { ok: false, error: String(err) }; }
});

/* ── 빈 폴더 삭제 ── */
ipcMain.handle("fs:removeEmptyDirs", async (_e, dirs) => {
  let removed = 0;
  const errors = [];
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch (err) {
      errors.push(`${path.basename(dir)}: ${err.message}`);
    }
  }
  return { ok: true, data: { removed, errors } };
});

/* ── Read directory entries ── */
ipcMain.handle("fs:readDir", (_e, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((entry) => {
      const full = path.join(dirPath, entry.name);
      try {
        const st = fs.statSync(full);
        return {
          name:     entry.name,
          isDir:    entry.isDirectory(),
          size:     st.size,
          modified: st.mtime.toISOString(),
          created:  st.birthtime.toISOString(),
          accessed: st.atime.toISOString(),
        };
      } catch {
        return { name: entry.name, isDir: entry.isDirectory(), size: 0,
                 modified: null, created: null, accessed: null };
      }
    });
  } catch (err) {
    return { error: String(err) };
  }
});

/* ── Open folder picker dialog ── */
ipcMain.handle("dialog:openFolder", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "관리할 폴더를 선택하세요",
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

/* ── Managed-folders config: load ── */
ipcMain.handle("config:load", () => {
  try {
    const p = configPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return [];
  }
});

/* ── Managed-folders config: save ── */
ipcMain.handle("config:save", (_e, data) => {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
});

/* ── DSFF CLI IPC handlers ── */
ipcMain.handle("dsff:analyze", async (_e, targetPath) => {
  try {
    const data = await runDsff(["analyze", targetPath]);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("dsff:organize", async (_e, targetPath, mode, execute) => {
  const args = ["organize", targetPath];
  if (mode === "by-type") args.push("--by-type");
  else if (mode === "by-date") args.push("--by-date", "monthly");
  else if (mode === "by-size") args.push("--by-size");
  if (execute) args.push("--execute");
  try {
    const data = await runDsff(args);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("dsff:rename", async (_e, targetPath, format, dateSource, execute) => {
  const args = ["rename", targetPath, "--format", format, "--date-source", dateSource];
  if (execute) args.push("--execute");
  try {
    const data = await runDsff(args);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("dsff:duplicates", async (_e, targetPath, action) => {
  const args = ["duplicates", targetPath, "--action", action || "report"];
  try {
    const data = await runDsff(args);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("dsff:undo", async (_e, all) => {
  const args = ["undo"];
  if (all) args.push("--all");
  try {
    const data = await runDsff(args);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ── Custom organize: move files with user-modified folder names ── */
ipcMain.handle("dsff:organizeCustom", async (_e, moves) => {
  // moves: Array<{ source: string, destFolder: string }>
  // destFolder is an absolute path to the target directory
  let moved = 0;
  let failed = 0;
  const errors = [];
  const ops = [];

  for (const { source, destFolder } of moves) {
    try {
      if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
      const fileName = path.basename(source);
      let dest = path.join(destFolder, fileName);
      // 이름 충돌 처리
      let counter = 1;
      while (fs.existsSync(dest)) {
        const ext = path.extname(fileName);
        const stem = path.basename(fileName, ext);
        dest = path.join(destFolder, `${stem}(${counter})${ext}`);
        counter++;
      }
      fs.renameSync(source, dest);
      moved++;
      ops.push({ type: "move", source, dest });
    } catch (err) {
      failed++;
      errors.push(`${path.basename(source)}: ${err.message}`);
    }
  }

  // 히스토리 기록 (dsff undo 호환)
  if (ops.length > 0) {
    try {
      const data = await runDsff(["config", "--path"]);
      // history 디렉토리를 추정: config path 옆 data/history
      // 간단히: Electron 측 자체 히스토리
    } catch { /* ignore */ }
  }

  return {
    ok: true,
    data: {
      moved,
      failed,
      message: failed > 0
        ? `${moved}개 파일 이동 완료, ${failed}개 실패`
        : `${moved}개 파일 정리 완료`,
      errors,
      ops,
    },
  };
});

/* ── Undo custom moves: reverse ops ── */
ipcMain.handle("fs:undoMoves", async (_e, ops) => {
  let restored = 0;
  const errors = [];
  for (let i = ops.length - 1; i >= 0; i--) {
    const { source, dest } = ops[i];
    try {
      const origDir = path.dirname(source);
      if (!fs.existsSync(origDir)) fs.mkdirSync(origDir, { recursive: true });
      fs.renameSync(dest, source);
      restored++;
    } catch (err) {
      errors.push(`${path.basename(dest)}: ${err.message}`);
    }
  }
  return { ok: true, data: { restored, errors } };
});

ipcMain.handle("dsff:watchStart", async (_e, targetPath) => {
  try {
    startWatch(targetPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("dsff:watchStop", async (_e, targetPath) => {
  try {
    stopWatch(targetPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ── App lifecycle ── */
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  for (const proc of watchProcesses.values()) {
    try { proc.kill(); } catch { /* ignore */ }
  }
  watchProcesses.clear();
});
