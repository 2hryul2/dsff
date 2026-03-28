"""DS FolderFit — 작업 이력 관리"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from loguru import logger

from dsff.config import HISTORY_DIR


class HistoryManager:
    """모든 파일 작업을 JSON 로그로 기록"""

    def __init__(self, history_dir: Optional[Path] = None):
        self._dir = history_dir or HISTORY_DIR
        self._dir.mkdir(parents=True, exist_ok=True)

    def record(self, operations: List[dict]) -> Path:
        """작업 기록 저장"""
        timestamp = datetime.now()
        entry = {
            "timestamp": timestamp.isoformat(),
            "operations": operations,
        }
        filename = timestamp.strftime("%Y-%m-%d_%H-%M-%S") + ".json"
        filepath = self._dir / filename
        filepath.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"이력 저장: {filepath} ({len(operations)}건)")
        return filepath

    def get_latest(self) -> Optional[dict]:
        """최근 작업 이력 가져오기"""
        files = sorted(self._dir.glob("*.json"), reverse=True)
        if not files:
            return None
        return json.loads(files[0].read_text(encoding="utf-8"))

    def get_all(self) -> List[dict]:
        """모든 작업 이력 (최신순)"""
        files = sorted(self._dir.glob("*.json"), reverse=True)
        results = []
        for f in files:
            try:
                results.append(json.loads(f.read_text(encoding="utf-8")))
            except (json.JSONDecodeError, OSError):
                logger.warning(f"이력 파싱 실패: {f}")
        return results

    def delete_latest(self) -> bool:
        """최근 이력 삭제"""
        files = sorted(self._dir.glob("*.json"), reverse=True)
        if files:
            files[0].unlink()
            return True
        return False

    def clear_all(self) -> int:
        """모든 이력 삭제"""
        files = list(self._dir.glob("*.json"))
        for f in files:
            f.unlink()
        return len(files)
