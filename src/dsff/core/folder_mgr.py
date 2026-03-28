"""DS FolderFit — 멀티 폴더 등록/관리"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.config import DSFolderFitConfig, ManagedFolder


class FolderManager:
    """멀티 폴더 등록/해제/조회"""

    def __init__(self, config: DSFolderFitConfig):
        self._config = config

    def add_folder(
        self,
        path: Path,
        label: str = "",
        auto_watch: bool = False,
        profile: str = "default",
    ) -> ManagedFolder:
        """새 폴더를 관리 대상으로 등록"""
        resolved = path.expanduser().resolve()

        if not resolved.is_dir():
            raise ValueError(f"유효하지 않은 폴더: {resolved}")

        # 중복 체크
        for existing in self._config.folders:
            if existing.path.expanduser().resolve() == resolved:
                logger.warning(f"이미 등록된 폴더: {resolved} (라벨: {existing.label})")
                return existing

        folder = ManagedFolder(
            path=resolved,
            label=label or resolved.name,
            auto_watch=auto_watch,
            rules_profile=profile,
        )
        self._config.folders.append(folder)
        logger.info(f"폴더 등록: {folder.label} → {folder.path}")
        return folder

    def remove_folder(self, label: str) -> bool:
        """라벨로 폴더 등록 해제"""
        for i, folder in enumerate(self._config.folders):
            if folder.label == label:
                self._config.folders.pop(i)
                logger.info(f"폴더 해제: {label}")
                return True
        return False

    def list_folders(self) -> List[ManagedFolder]:
        """등록된 모든 폴더 목록"""
        return list(self._config.folders)

    def get_folder(self, label_or_path: str) -> Optional[ManagedFolder]:
        """라벨 또는 경로로 폴더 검색"""
        for folder in self._config.folders:
            if folder.label == label_or_path:
                return folder
            if str(folder.path) == label_or_path:
                return folder
        return None

    def update_health_score(self, label: str, score: int) -> None:
        """폴더 건강도 점수 업데이트"""
        from datetime import datetime

        folder = self.get_folder(label)
        if folder:
            folder.health_score = max(0, min(100, score))
            folder.last_analyzed = datetime.now()
