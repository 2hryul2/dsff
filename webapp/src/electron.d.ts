import type {
  ManagedFolder, DsffResult, AnalysisData, OrganizePlan,
  OrganizeResult, RenameResult, RenamePlan, DuplicateGroup, UndoResult,
} from "./types";

interface RawDirEntry {
  name: string;
  isDir: boolean;
  size: number;
  modified: string | null;
  created: string | null;
  accessed: string | null;
}

declare global {
  interface Window {
    electronAPI?: {
      /* Window controls */
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      onWindowState: (cb: (state: string) => void) => void;

      /* OS integration */
      openPath: (p: string) => Promise<string>;

      /* File system */
      readDir: (dirPath: string) => Promise<RawDirEntry[] | { error: string }>;
      openFolder: () => Promise<string | null>;
      renameFile: (oldPath: string, newName: string) => Promise<DsffResult<{ newPath: string }>>;
      copyFile: (srcPath: string) => Promise<DsffResult<{ destPath: string }>>;
      moveToDeleteBin: (filePath: string, managedRoot: string) => Promise<DsffResult<{ dest: string }>>;
      readDirRecursive: (dirPath: string) => Promise<DsffResult<Array<{ name: string; path: string; size: number; modified: string; created: string }>>>;
      createFolders: (basePath: string, folderNames: string[]) => Promise<DsffResult<undefined>>;
      findEmptyDirs:   (dirPath: string) => Promise<DsffResult<string[]>>;
      removeEmptyDirs: (dirs: string[])  => Promise<DsffResult<{ removed: number; errors: string[] }>>;
      undoMoves:       (ops: Array<{ source: string; dest: string }>) => Promise<DsffResult<{ restored: number; errors: string[] }>>;

      /* Config */
      loadConfig: () => Promise<ManagedFolder[]>;
      saveConfig: (data: ManagedFolder[]) => Promise<boolean>;

      /* Last state (마지막 탐색 경로·파일 복원) */
      saveLastState: (data: { folderPath: string; currentPath: string; selectedFile: string | null }) => Promise<boolean>;
      loadLastState: () => Promise<{ folderPath: string; currentPath: string; selectedFile: string | null } | null>;

      /* DSFF CLI bridge */
      analyze: (path: string) => Promise<DsffResult<AnalysisData>>;
      organize: (path: string, mode: string, execute: boolean) => Promise<DsffResult<OrganizePlan | OrganizeResult>>;
      organizeCustom: (moves: Array<{ source: string; destFolder: string }>) => Promise<DsffResult<OrganizeResult>>;
      rename: (path: string, format: string, dateSource: string, execute: boolean) => Promise<DsffResult<{ plans: RenamePlan[] } | RenameResult>>;
      duplicates: (path: string, action: string) => Promise<DsffResult<{ groups: DuplicateGroup[] }>>;
      undo: (all: boolean) => Promise<DsffResult<UndoResult>>;
      watchStart: (path: string) => Promise<DsffResult<void>>;
      watchStop: (path: string) => Promise<DsffResult<void>>;
      onWatchEvent: (cb: (data: import("./types").WatchEvent) => void) => void;

      /* File clipboard operations */
      copyFileTo: (srcPath: string, destDir: string) => Promise<DsffResult<{ destPath: string }>>;
      moveFile: (srcPath: string, destDir: string) => Promise<DsffResult<{ destPath: string }>>;

      /* Custom rules (키워드 편집 영구 저장) */
      loadCustomRules: () => Promise<DsffResult<Record<string, Record<string, string[]>>>>;
      saveCustomRules: (data: Record<string, Record<string, string[]>>) => Promise<DsffResult<undefined>>;

      /* Reference markdown */
      readReferenceFile: (fileName: string) => Promise<DsffResult<string>>;
      writeReferenceFile: (fileName: string, folderName: string, keywords: string[]) => Promise<DsffResult<undefined>>;
    };
  }
}

export {};
