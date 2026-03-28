"""DS FolderFit — 실행취소 기능"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional

from loguru import logger

from dsff.safety.history import HistoryManager


class UndoManager:
    """작업 되돌리기"""

    def __init__(self, history: Optional[HistoryManager] = None):
        self._history = history or HistoryManager()

    def undo_last(self) -> int:
        """마지막 작업 되돌리기"""
        entry = self._history.get_latest()
        if not entry:
            logger.info("되돌릴 작업이 없습니다.")
            return 0

        count = self._undo_operations(entry["operations"])
        if count > 0:
            self._history.delete_latest()
        return count

    def undo_all(self) -> int:
        """모든 작업 되돌리기 (역순)"""
        entries = self._history.get_all()
        total = 0
        for entry in entries:
            count = self._undo_operations(entry["operations"])
            total += count
        if total > 0:
            self._history.clear_all()
        return total

    def _undo_operations(self, operations: list[dict]) -> int:
        """작업 목록 역순으로 되돌리기"""
        count = 0
        # 역순으로 되돌리기
        for op in reversed(operations):
            try:
                op_type = op.get("type", "")
                source = Path(op["source"])
                dest = Path(op["dest"])

                if op_type == "move":
                    # 이동 되돌리기: dest → source
                    if dest.exists():
                        source.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(dest), str(source))
                        count += 1
                        logger.info(f"되돌리기 (이동): {dest.name} → {source.parent}")
                    else:
                        logger.warning(f"되돌리기 실패 — 파일 없음: {dest}")

                elif op_type == "rename":
                    # 리네임 되돌리기: dest → source
                    if dest.exists():
                        dest.rename(source)
                        count += 1
                        logger.info(f"되돌리기 (리네임): {dest.name} → {source.name}")
                    else:
                        logger.warning(f"되돌리기 실패 — 파일 없음: {dest}")

            except (OSError, KeyError) as e:
                logger.error(f"되돌리기 실패: {e}")

        return count
