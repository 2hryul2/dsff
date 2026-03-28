"""DS FolderFit — Dry-run 모드 지원"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

# 글로벌 dry-run 상태
_dry_run_mode: bool = False


def is_dry_run() -> bool:
    """현재 dry-run 모드인지 확인"""
    return _dry_run_mode


@contextmanager
def dry_run_context(enabled: bool = True) -> Generator[None, None, None]:
    """dry-run 모드 컨텍스트 매니저"""
    global _dry_run_mode
    prev = _dry_run_mode
    _dry_run_mode = enabled
    try:
        yield
    finally:
        _dry_run_mode = prev
