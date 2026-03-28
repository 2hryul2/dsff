"""DS FolderFit — 규칙 엔진"""
from __future__ import annotations

import fnmatch
from pathlib import Path
from typing import Optional, List

from dsff.config import CategoryRule
from dsff.rules.defaults import DEFAULT_CATEGORIES, get_extension_map


class RuleEngine:
    """파일 분류 규칙 엔진"""

    def __init__(self, custom_rules: Optional[List[CategoryRule]] = None):
        self._ext_map = get_extension_map()
        self._custom_rules = custom_rules or []

    def classify(self, filename: str, mime_type: Optional[str] = None) -> str:
        """파일명(또는 MIME)으로 카테고리 결정

        Returns:
            카테고리 이름 (예: "문서", "이미지") 또는 "기타"
        """
        # 1) 커스텀 규칙 우선 적용
        for rule in self._custom_rules:
            if self._matches_rule(filename, mime_type, rule):
                return rule.name

        # 2) 확장자 기반 매칭
        ext = Path(filename).suffix.lower()
        if ext in self._ext_map:
            return self._ext_map[ext]

        # 3) 복합 확장자 (.tar.gz 등)
        name_lower = filename.lower()
        if name_lower.endswith(".tar.gz") or name_lower.endswith(".tar.bz2") or name_lower.endswith(".tar.xz"):
            return "압축"

        return "기타"

    def get_target_folder(self, category: str) -> str:
        """카테고리 → 대상 폴더명"""
        # 커스텀 규칙
        for rule in self._custom_rules:
            if rule.name == category:
                return rule.target_folder

        # 기본 카테고리
        info = DEFAULT_CATEGORIES.get(category)
        return info["target_folder"] if info else "Others"

    def _matches_rule(self, filename: str, mime_type: Optional[str], rule: CategoryRule) -> bool:
        ext = Path(filename).suffix.lower()
        # 확장자 매칭
        if rule.extensions and ext in [e.lower() for e in rule.extensions]:
            return True
        # 패턴 매칭
        if rule.patterns:
            for pattern in rule.patterns:
                if fnmatch.fnmatch(filename, pattern):
                    return True
        # MIME 타입 매칭
        if rule.mime_types and mime_type:
            for mt in rule.mime_types:
                if mt.endswith("*"):
                    if mime_type.startswith(mt[:-1]):
                        return True
                elif mime_type == mt:
                    return True
        return False
