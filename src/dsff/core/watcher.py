"""DS FolderFit — 실시간 폴더 감시 (watchdog)"""
from __future__ import annotations

import fnmatch
import time
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.config import DSFolderFitConfig


class FolderWatcher:
    """watchdog 기반 실시간 파일 감시 및 자동 정리"""

    def __init__(
        self,
        config: DSFolderFitConfig,
        delay: float = 2.0,
        exclude_patterns: Optional[List[str]] = None,
    ):
        self._config = config
        self._delay = delay
        self._exclude = exclude_patterns or ["*.tmp", "*.part", "*.crdownload"]
        self._observer = None

    def start(self, target: Path, daemon: bool = False, json_mode: bool = False) -> None:
        """감시 시작"""
        import json as _json
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileMovedEvent

        target = target.expanduser().resolve()
        self._json_mode = json_mode

        class _Handler(FileSystemEventHandler):
            def __init__(handler_self):
                handler_self._pending: dict[str, float] = {}

            def on_created(handler_self, event):
                if not event.is_directory:
                    handler_self._handle(event.src_path)

            def on_moved(handler_self, event):
                if not event.is_directory:
                    handler_self._handle(event.dest_path)

            def _handle(handler_self, filepath: str):
                p = Path(filepath)

                # 제외 패턴 체크
                if any(fnmatch.fnmatch(p.name, pat) for pat in self._exclude):
                    logger.debug(f"제외됨: {p.name}")
                    return

                # 디바운싱
                now = time.time()
                last = handler_self._pending.get(filepath, 0)
                if now - last < self._delay:
                    return
                handler_self._pending[filepath] = now

                logger.info(f"새 파일 감지: {p.name}")
                self._process_file(p)

        handler = _Handler()
        self._observer = Observer()
        self._observer.schedule(handler, str(target), recursive=False)
        self._observer.start()
        logger.info(f"감시 시작: {target}")

        if not daemon:
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.stop()

    def stop(self) -> None:
        """감시 중지"""
        if self._observer:
            self._observer.stop()
            self._observer.join()
            logger.info("감시 중지됨")

    def _process_file(self, filepath: Path) -> None:
        """감지된 파일 자동 정리"""
        import json as _json
        from dsff.core.scanner import FolderScanner
        from dsff.core.classifier import FileClassifier
        from dsff.core.organizer import FileOrganizer

        try:
            scanner = FolderScanner()
            info = scanner._build_file_info(filepath)

            classifier = FileClassifier(self._config)
            classifier.classify_single(info)

            target_folder = classifier.get_target_folder(info.category)
            dest_dir = filepath.parent / target_folder
            dest_dir.mkdir(exist_ok=True)
            dest = dest_dir / filepath.name

            if dest != filepath:
                import shutil
                shutil.move(str(filepath), str(dest))
                logger.info(f"자동 정리: {filepath.name} → {target_folder}/")

                if getattr(self, "_json_mode", False):
                    print(_json.dumps({
                        "event": "file_detected", "file": filepath.name,
                        "action": "moved", "dest": f"{target_folder}/{filepath.name}",
                    }, ensure_ascii=False), flush=True)

                # 이력 기록
                from dsff.safety.history import HistoryManager
                history = HistoryManager()
                history.record([{"type": "move", "source": str(filepath), "dest": str(dest)}])

        except Exception as e:
            logger.error(f"자동 정리 실패: {filepath.name} — {e}")
            if getattr(self, "_json_mode", False):
                print(_json.dumps({
                    "event": "error", "file": filepath.name, "message": str(e),
                }, ensure_ascii=False), flush=True)
