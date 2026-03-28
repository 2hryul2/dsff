"""DS FolderFit — 생성일 기반 파일 리네임"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.core.scanner import FileInfo

# 날짜 접두사 패턴
DATE_PREFIX_PATTERNS = [
    re.compile(r"^\d{6}_"),              # YYMMDD_
    re.compile(r"^\d{8}_"),              # YYYYMMDD_
    re.compile(r"^\d{4}-\d{2}-\d{2}_"), # YYYY-MM-DD_
]

DATE_FORMATS = {
    "YYMMDD": "%y%m%d",
    "YYYYMMDD": "%Y%m%d",
    "YYYY-MM-DD": "%Y-%m-%d",
}


@dataclass
class RenamePlan:
    """리네임 계획"""

    source: Path
    dest: Path
    original_name: str
    new_name: str
    date_applied: str


class FileRenamer:
    """생성일 기반 파일 리네임"""

    def __init__(
        self,
        date_format: str = "YYMMDD",
        date_source: str = "created",
        skip_existing: bool = True,
        separator: str = "_",
    ):
        self.date_format = date_format
        self.date_source = date_source
        self.skip_existing = skip_existing
        self.separator = separator

        if date_format not in DATE_FORMATS:
            raise ValueError(f"지원하지 않는 날짜 포맷: {date_format}. 사용 가능: {list(DATE_FORMATS.keys())}")
        self._fmt = DATE_FORMATS[date_format]

    def plan_rename(self, file_info: FileInfo) -> Optional[RenamePlan]:
        """리네임 계획 생성 (dry-run용)"""
        # 이미 날짜 접두사가 있는지 확인
        if self.skip_existing and self._has_date_prefix(file_info.name):
            return None

        # 날짜 기준 선택
        if self.date_source == "created":
            date = file_info.created_time
        else:
            date = file_info.modified_time

        # 새 파일명 생성
        date_str = date.strftime(self._fmt)
        new_name = f"{date_str}{self.separator}{file_info.name}"
        new_path = file_info.path.parent / new_name

        # 이름 충돌 처리
        new_path = self._resolve_conflict(new_path)

        return RenamePlan(
            source=file_info.path,
            dest=new_path,
            original_name=file_info.name,
            new_name=new_path.name,
            date_applied=date_str,
        )

    def plan_batch(self, files: List[FileInfo]) -> List[RenamePlan]:
        """여러 파일 일괄 리네임 계획"""
        plans = []
        for f in files:
            plan = self.plan_rename(f)
            if plan:
                plans.append(plan)
        return plans

    def execute_rename(self, plan: RenamePlan) -> bool:
        """리네임 실행"""
        try:
            plan.source.rename(plan.dest)
            logger.info(f"리네임: {plan.original_name} → {plan.new_name}")
            return True
        except OSError as e:
            logger.error(f"리네임 실패: {plan.original_name} → {e}")
            return False

    @staticmethod
    def _has_date_prefix(filename: str) -> bool:
        """파일명에 이미 날짜 접두사가 있는지 확인"""
        return any(p.match(filename) for p in DATE_PREFIX_PATTERNS)

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
