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

      /* Config */
      loadConfig: () => Promise<ManagedFolder[]>;
      saveConfig: (data: ManagedFolder[]) => Promise<boolean>;

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
    };
  }
}

export {};
