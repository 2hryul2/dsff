"""DS FolderFit — 해싱 유틸리티"""
from __future__ import annotations

import hashlib
from pathlib import Path

CHUNK_SIZE = 8192


def compute_xxhash64(path: Path) -> str:
    """xxhash64 해시 계산 (스트리밍)"""
    import xxhash
    h = xxhash.xxh64()
    with open(path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()


def compute_sha256(path: Path) -> str:
    """SHA-256 해시 계산 (스트리밍)"""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()


def compute_md5(path: Path) -> str:
    """MD5 해시 계산 (스트리밍)"""
    h = hashlib.md5()
    with open(path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()
