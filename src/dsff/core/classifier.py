"""DS FolderFit — 파일 분류 엔진"""
from __future__ import annotations

from typing import Optional, List

from dsff.config import CategoryRule, DSFolderFitConfig
from dsff.core.scanner import FileInfo
from dsff.rules.engine import RuleEngine


class FileClassifier:
    """파일 목록에 카테고리를 부여하는 분류기"""

    def __init__(self, config: Optional[DSFolderFitConfig] = None):
        custom_rules = config.categories if config else []
        self._engine = RuleEngine(custom_rules=custom_rules)

    def classify(self, files: List[FileInfo]) -> List[FileInfo]:
        """파일 목록 전체에 카테고리 부여 (in-place 수정 + 반환)"""
        for f in files:
            f.category = self._engine.classify(f.name, f.mime_type)
        return files

    def classify_single(self, file_info: FileInfo) -> str:
        """단일 파일 분류"""
        category = self._engine.classify(file_info.name, file_info.mime_type)
        file_info.category = category
        return category

    def get_target_folder(self, category: str) -> str:
        """카테고리 → 대상 폴더명"""
        return self._engine.get_target_folder(category)
