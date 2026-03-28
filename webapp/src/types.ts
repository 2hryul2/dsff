export type ActiveView = "explorer" | "analyze" | "preview" | "duplicates" | "rename";

export interface FileItem {
  name: string;
  path: string;          // full absolute path
  type: string;
  modified: string;
  created?: string;
  accessed?: string;
  size: string;          // formatted string (e.g. "1.2 MB")
  sizeBytes: number;     // raw bytes for numeric sort
  icon: string;
  category: "folder" | "document" | "image" | "video" | "audio" | "archive" | "code" | "other";
}

export interface ManagedFolder {
  label: string;
  path: string;
  score: number;
  watching: boolean;
  profile?: string;
}

export interface CategoryStat {
  name: string;
  count: number;
  size: string;
  pct: number;
  color: string;
}

export interface Recommendation {
  icon: string;
  text: string;
  action: string;
}

export interface AnalysisData {
  totalFiles: number;
  totalSize: string;
  duplicates: number;
  wastedSize: string;
  largeFiles: number;
  largeSize: string;
  oldFiles: number;
  score: number;
  categories: CategoryStat[];
  ageDistribution: { label: string; count: number; pct: number }[];
  sizeDistribution: { label: string; count: number; pct: number }[];
  recommendations?: Recommendation[];
}

export interface DuplicateCopy {
  path: string;
  date: string;
  size: string;
  original: boolean;
  checked: boolean;
}

export interface DuplicateGroup {
  id: number;
  name: string;
  copies: DuplicateCopy[];
  totalSize: string;
  wastedSize: string;
}

export interface RenamePlan {
  from: string;
  to: string | null;
  date: string;
  skip: boolean;
  skipReason?: string;
}

export interface DsffResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface OrganizeMove {
  source: string;
  dest: string;
  fileName: string;
  category: string;
  reason: string;
}

export interface OrganizePlan {
  targetFolder: string;
  moves: OrganizeMove[];
  totalMoves: number;
}

export interface OrganizeResult {
  moved: number;
  failed: number;
  message: string;
}

export interface RenameResult {
  success: number;
  failed: number;
  message: string;
}

export interface UndoResult {
  undone: number;
  message: string;
}

export interface WatchEvent {
  path: string;
  event: string;
  file?: string;
  action?: string;
  dest?: string;
  message?: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  file: FileItem;
}

export interface TooltipState {
  file: FileItem;
  x: number;
  y: number;
}
