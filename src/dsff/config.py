"""DS FolderFit — Pydantic 기반 설정 모델"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from pydantic import BaseModel, Field
from platformdirs import user_config_dir, user_data_dir

APP_NAME = "dsff"
CONFIG_DIR = Path(user_config_dir(APP_NAME))
DATA_DIR = Path(user_data_dir(APP_NAME))
HISTORY_DIR = DATA_DIR / "history"
CONFIG_FILE = CONFIG_DIR / "config.json"


class ManagedFolder(BaseModel):
    """사용자가 등록한 관리 대상 폴더"""

    path: Path
    label: str
    auto_watch: bool = False
    rules_profile: str = "default"
    last_analyzed: Optional[datetime] = None
    health_score: Optional[int] = None  # 0~100


class CategoryRule(BaseModel):
    """파일 분류 규칙"""

    name: str
    extensions: List[str] = []
    patterns: List[str] = []
    mime_types: List[str] = []
    target_folder: str


class DuplicateConfig(BaseModel):
    enabled: bool = True
    action: str = "report"  # report | move | trash | hardlink
    hash_algorithm: str = "xxhash64"
    verify_with_sha256: bool = False


class WatchConfig(BaseModel):
    enabled: bool = False
    delay: float = 2.0
    exclude_patterns: List[str] = ["*.tmp", "*.part", "*.crdownload"]
    daemon: bool = False


class RenameConfig(BaseModel):
    """생성일 리네임 설정"""

    date_format: str = "YYMMDD"  # YYMMDD | YYYYMMDD | YYYY-MM-DD
    date_source: str = "created"  # created | modified
    skip_existing: bool = True
    separator: str = "_"


class AnalyzeConfig(BaseModel):
    """폴더 분석 설정"""

    depth: Optional[int] = None
    large_file_threshold_mb: int = 500
    old_file_days: int = 365


class DSFolderFitConfig(BaseModel):
    """DS FolderFit 전체 설정"""

    folders: List[ManagedFolder] = [
        ManagedFolder(path=Path.home() / "Downloads", label="다운로드")
    ]
    categories: List[CategoryRule] = []  # 비어 있으면 defaults.py에서 로드
    duplicates: DuplicateConfig = DuplicateConfig()
    watch: WatchConfig = WatchConfig()
    rename: RenameConfig = RenameConfig()
    analyze: AnalyzeConfig = AnalyzeConfig()
    size_threshold_mb: int = 500
    use_trash: bool = True
    date_format: str = "monthly"
    log_level: str = "INFO"

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "DSFolderFitConfig":
        """설정 파일에서 로드 (없으면 기본값)"""
        config_path = path or CONFIG_FILE
        if config_path.exists():
            data = json.loads(config_path.read_text(encoding="utf-8"))
            return cls.model_validate(data)
        return cls()

    def save(self, path: Optional[Path] = None) -> None:
        """설정 파일에 저장"""
        config_path = path or CONFIG_FILE
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(
            self.model_dump_json(indent=2, exclude_none=True), encoding="utf-8"
        )
