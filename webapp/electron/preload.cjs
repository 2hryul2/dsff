"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /* Window controls */
  minimize:      () => ipcRenderer.send("window-minimize"),
  maximize:      () => ipcRenderer.send("window-maximize"),
  close:         () => ipcRenderer.send("window-close"),
  onWindowState: (cb) => {
    ipcRenderer.on("window-state", (_event, state) => cb(state));
  },

  /* OS integration */
  openPath: (p) => ipcRenderer.invoke("open-path", p),

  /* File system */
  readDir:    (dirPath)          => ipcRenderer.invoke("fs:readDir", dirPath),
  openFolder: ()                 => ipcRenderer.invoke("dialog:openFolder"),
  renameFile:       (oldPath, newName)       => ipcRenderer.invoke("fs:renameFile", oldPath, newName),
  copyFile:         (srcPath)                => ipcRenderer.invoke("fs:copy", srcPath),
  moveToDeleteBin:  (filePath, managedRoot)  => ipcRenderer.invoke("fs:moveToDeleteBin", filePath, managedRoot),
  readDirRecursive: (dirPath)                => ipcRenderer.invoke("fs:readDirRecursive", dirPath),
  createFolders:    (basePath, folderNames)  => ipcRenderer.invoke("fs:createFolders", basePath, folderNames),
  findEmptyDirs:    (dirPath)               => ipcRenderer.invoke("fs:findEmptyDirs", dirPath),
  removeEmptyDirs:  (dirs)                  => ipcRenderer.invoke("fs:removeEmptyDirs", dirs),
  undoMoves:        (ops)                   => ipcRenderer.invoke("fs:undoMoves", ops),

  /* Managed-folders config */
  loadConfig: ()       => ipcRenderer.invoke("config:load"),
  saveConfig: (data)   => ipcRenderer.invoke("config:save", data),

  /* DSFF CLI bridge */
  analyze:     (path) => ipcRenderer.invoke("dsff:analyze", path),
  organize:    (path, mode, execute) => ipcRenderer.invoke("dsff:organize", path, mode, execute),
  organizeCustom: (moves) => ipcRenderer.invoke("dsff:organizeCustom", moves),
  rename:      (path, format, dateSource, execute) => ipcRenderer.invoke("dsff:rename", path, format, dateSource, execute),
  duplicates:  (path, action) => ipcRenderer.invoke("dsff:duplicates", path, action),
  undo:        (all) => ipcRenderer.invoke("dsff:undo", all),
  watchStart:  (path) => ipcRenderer.invoke("dsff:watchStart", path),
  watchStop:   (path) => ipcRenderer.invoke("dsff:watchStop", path),
  onWatchEvent: (cb) => {
    ipcRenderer.on("watch:event", (_event, data) => cb(data));
  },
});
