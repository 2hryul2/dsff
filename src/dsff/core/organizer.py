"""DS FolderFit — 파일 정리 실행 로직"""
from __future__ import annotations

import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.config import DSFolderFitConfig
from dsff.core.scanner import FolderScanner, FileInfo
from dsff.core.classifier import FileClassifier


@dataclass
class MovePlan:
    """단일 파일 이동 계획"""

    source: Path
    dest: Path
    category: str
    reason: str  # "type", "date", "size"


@dataclass
class OrganizePlan:
    """정리 계획 전체"""

    target_folder: Path
    moves: List[MovePlan] = field(default_factory=list)
    skipped: List[str] = field(default_factory=list)

    @property
    def total_moves(self) -> int:
        return len(self.moves)


@dataclass
class OrganizeResult:
    """정리 실행 결과"""

    moved: int = 0
    failed: int = 0
    operations: List[dict] = field(default_factory=list)


class FileOrganizer:
    """파일 정리 엔진"""

    def __init__(self, config: DSFolderFitConfig):
        self._config = config
        self._scanner = FolderScanner()
        self._classifier = FileClassifier(config)

    def plan(
        self,
        target: Path,
        by_type: bool = True,
        by_date: Optional[str] = None,
        by_size: bool = False,
        exclude_patterns: Optional[List[str]] = None,
    ) -> OrganizePlan:
        """정리 계획 생성 (dry-run)"""
        import fnmatch

        target = target.expanduser().resolve()
        plan = OrganizePlan(target_folder=target)

        files = self._scanner.scan(target, recursive=False)
        self._classifier.classify(files)

        exclude = exclude_patterns or []

        for f in files:
            # 제외 패턴 체크
            if any(fnmatch.fnmatch(f.name, pat) for pat in exclude):
                plan.skipped.append(f.name)
                continue

            dest: Optional[Path] = None
            reason = ""

            if by_type:
                subfolder = self._classifier.get_target_folder(f.category)
                dest = target / subfolder / f.name
                reason = "type"

            if by_date and not dest:
                subfolder = self._get_date_folder(f, by_date)
                dest = target / subfolder / f.name
                reason = "date"

            if by_size and not dest:
                subfolder = self._get_size_folder(f)
                dest = target / subfolder / f.name
                reason = "size"

            if dest and dest != f.path:
                # 이름 충돌 처리
                dest = self._resolve_conflict(dest)
                plan.moves.append(MovePlan(source=f.path, dest=dest, category=f.category, reason=reason))

        return plan

    def execute(self, plan: OrganizePlan) -> OrganizeResult:
        """정리 계획 실행"""
        from dsff.safety.history import HistoryManager

        result = OrganizeResult()
        history = HistoryManager()
        ops: List[dict] = []

        for move in plan.moves:
            try:
                move.dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(move.source), str(move.dest))
                result.moved += 1
                ops.append({
                    "type": "move",
                    "source": str(move.source),
                    "dest": str(move.dest),
                })
            except (OSError, shutil.Error) as e:
                logger.error(f"이동 실패: {move.source.name} → {e}")
                result.failed += 1

        if ops:
            history.record(ops)
        result.operations = ops
        return result

    @staticmethod
    def _get_date_folder(f: FileInfo, mode: str) -> str:
        """날짜 기반 정리 폴더명"""
        dt = f.modified_time
        if mode == "daily":
            return dt.strftime("%Y-%m-%d")
        elif mode == "monthly":
            return dt.strftime("%Y-%m")
        elif mode == "yearly":
            return dt.strftime("%Y")
        elif mode == "age":
            from datetime import datetime, timedelta
            now = datetime.now()
            age = now - dt
            if age <= timedelta(days=7):
                return "최근 1주"
            elif age <= timedelta(days=30):
                return "이번 달"
            elif age <= timedelta(days=365):
                return "올해"
            else:
                return "오래된 파일"
        return dt.strftime("%Y-%m")

    @staticmethod
    def _get_size_folder(f: FileInfo) -> str:
        """크기 기반 정리 폴더명"""
        if f.size < 1024 * 1024:
            return "Small (<1MB)"
        elif f.size < 100 * 1024 * 1024:
            return "Medium (1-100MB)"
        else:
            return "Large (100MB+)"

    @staticmethod
    def _resolve_conflict(path: Path) -> Path:
        """파일명 충돌 시 번호 접미사 추가"""
        if not path.exists():
            return path
        stem = path.stem
        suffix = path.suffix
        counter = 1
        while path.exists():
            path = path.parent / f"{stem}({counter}){suffix}"
            counter += 1
        return path
