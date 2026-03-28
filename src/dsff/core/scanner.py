"""DS FolderFit — 파일 스캔/발견 모듈"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.utils.platform import get_creation_time, get_mime_description


@dataclass
class FileInfo:
    """스캔된 파일의 메타데이터"""

    path: Path
    name: str
    extension: str
    size: int
    created_time: datetime
    modified_time: datetime
    accessed_time: datetime
    mime_type: Optional[str] = None
    mime_description: str = ""
    is_symlink: bool = False
    inode: int = 0
    category: str = ""  # classifier가 나중에 채움

    @property
    def size_display(self) -> str:
        """사람이 읽기 쉬운 크기"""
        try:
            import humanize
            return humanize.naturalsize(self.size, binary=True)
        except ImportError:
            if self.size < 1024:
                return f"{self.size} B"
            elif self.size < 1024 ** 2:
                return f"{self.size / 1024:.1f} KB"
            elif self.size < 1024 ** 3:
                return f"{self.size / 1024**2:.1f} MB"
            return f"{self.size / 1024**3:.1f} GB"


@dataclass
class FolderStats:
    """폴더 통계"""

    total_files: int = 0
    total_size: int = 0
    by_extension: dict[str, int] = field(default_factory=dict)  # ext → count
    by_category: dict[str, int] = field(default_factory=dict)  # category → count
    largest_file: Optional[FileInfo] = None
    newest_file: Optional[FileInfo] = None
    oldest_file: Optional[FileInfo] = None


class FolderScanner:
    """폴더 스캔 및 파일 정보 수집"""

    def __init__(self, detect_mime: bool = True):
        self._detect_mime = detect_mime
        self._mime_detector = None
        if detect_mime:
            try:
                import filetype as ft
                self._mime_detector = ft
            except ImportError:
                logger.warning("filetype 패키지 없음 — MIME 감지 비활성화")

    def scan(self, target: Path, recursive: bool = False) -> List[FileInfo]:
        """대상 폴더의 모든 파일 스캔"""
        target = target.expanduser().resolve()
        if not target.is_dir():
            logger.error(f"유효하지 않은 폴더: {target}")
            return []

        files: List[FileInfo] = []
        seen_inodes: set[int] = set()

        try:
            iterator = target.rglob("*") if recursive else target.iterdir()
            for entry in iterator:
                if not entry.is_file():
                    continue

                try:
                    info = self._build_file_info(entry)

                    # 하드링크 중복 방지
                    if info.inode in seen_inodes:
                        continue
                    seen_inodes.add(info.inode)

                    files.append(info)
                except PermissionError:
                    logger.warning(f"권한 없음: {entry}")
                except OSError as e:
                    logger.warning(f"스캔 실패: {entry} — {e}")

        except PermissionError:
            logger.error(f"폴더 접근 권한 없음: {target}")

        logger.info(f"스캔 완료: {len(files)}개 파일 ({target})")
        return files

    def get_statistics(self, files: List[FileInfo]) -> FolderStats:
        """파일 목록에서 통계 생성"""
        stats = FolderStats()
        stats.total_files = len(files)

        if not files:
            return stats

        for f in files:
            stats.total_size += f.size

            ext = f.extension.lower() or "(없음)"
            stats.by_extension[ext] = stats.by_extension.get(ext, 0) + 1

            if f.category:
                stats.by_category[f.category] = stats.by_category.get(f.category, 0) + 1

            if stats.largest_file is None or f.size > stats.largest_file.size:
                stats.largest_file = f
            if stats.newest_file is None or f.modified_time > stats.newest_file.modified_time:
                stats.newest_file = f
            if stats.oldest_file is None or f.modified_time < stats.oldest_file.modified_time:
                stats.oldest_file = f

        return stats

    def find_large_files(self, files: List[FileInfo], threshold_mb: int = 500) -> List[FileInfo]:
        """임계치 초과 대용량 파일 검색"""
        threshold = threshold_mb * 1024 * 1024
        return [f for f in files if f.size >= threshold]

    def _build_file_info(self, path: Path) -> FileInfo:
        """경로에서 FileInfo 객체 생성"""
        stat = path.stat()
        is_symlink = path.is_symlink()

        # MIME 타입 감지
        mime_type = None
        if self._mime_detector and not is_symlink:
            try:
                kind = self._mime_detector.guess(str(path))
                if kind:
                    mime_type = kind.mime
            except Exception:
                pass

        extension = path.suffix
        mime_desc = get_mime_description(mime_type, extension)
        created = get_creation_time(path)

        return FileInfo(
            path=path,
            name=path.name,
            extension=extension,
            size=stat.st_size,
            created_time=created,
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            accessed_time=datetime.fromtimestamp(stat.st_atime),
            mime_type=mime_type,
            mime_description=mime_desc,
            is_symlink=is_symlink,
            inode=stat.st_ino,
        )
