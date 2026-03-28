"""DS FolderFit — 3단계 중복 파일 감지"""
from __future__ import annotations

import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.config import DuplicateConfig
from dsff.core.scanner import FileInfo

CHUNK_SIZE = 8192  # 8KB 스트리밍 청크


@dataclass
class DuplicateGroup:
    """중복 파일 그룹"""

    hash: str
    size: int
    files: List[FileInfo] = field(default_factory=list)

    @property
    def wasted_size(self) -> int:
        """중복으로 낭비되는 크기"""
        return self.size * (len(self.files) - 1)

    @property
    def count(self) -> int:
        return len(self.files)


@dataclass
class DuplicateResult:
    """중복 처리 결과"""

    processed: int = 0
    saved_bytes: int = 0

    @property
    def saved_display(self) -> str:
        if self.saved_bytes < 1024 * 1024:
            return f"{self.saved_bytes / 1024:.1f} KB"
        return f"{self.saved_bytes / (1024 * 1024):.1f} MB"


class DuplicateDetector:
    """3단계 파이프라인으로 중복 파일 감지"""

    def __init__(self, config: Optional[DuplicateConfig] = None):
        self._config = config or DuplicateConfig()

    def find_duplicates(self, files: List[FileInfo]) -> List[DuplicateGroup]:
        """3단계 파이프라인으로 중복 그룹 검색"""
        logger.info(f"중복 검사 시작: {len(files)}개 파일")

        # 1단계: 크기 기반 그룹핑
        size_groups = self._group_by_size(files)
        candidates = [f for group in size_groups.values() if len(group) > 1 for f in group]
        logger.debug(f"1단계 (크기 그룹핑): {len(candidates)}개 후보")

        if not candidates:
            return []

        # 2단계: xxhash64 빠른 해싱
        hash_groups = self._hash_fast(candidates)
        logger.debug(f"2단계 (xxhash64): {len(hash_groups)}개 중복 그룹")

        # 3단계: SHA-256 정밀 검증 (선택적)
        if self._config.verify_with_sha256:
            hash_groups = self._hash_verify(hash_groups)
            logger.debug(f"3단계 (SHA-256): {len(hash_groups)}개 확인 그룹")

        # DuplicateGroup으로 변환
        result = []
        for hash_val, group_files in hash_groups.items():
            if len(group_files) > 1:
                result.append(DuplicateGroup(
                    hash=hash_val,
                    size=group_files[0].size,
                    files=group_files,
                ))

        logger.info(f"중복 검사 완료: {len(result)}개 그룹, {sum(g.wasted_size for g in result)} bytes 낭비")
        return result

    def process(self, groups: List[DuplicateGroup], action: str = "report") -> DuplicateResult:
        """중복 파일 처리"""
        result = DuplicateResult()

        if action == "report":
            return result  # 리포트만

        for group in groups:
            # 첫 번째 파일 유지, 나머지 처리
            originals = group.files[:1]
            duplicates = group.files[1:]

            for dup in duplicates:
                try:
                    if action == "trash":
                        from send2trash import send2trash
                        send2trash(str(dup.path))
                    elif action == "move":
                        trash_dir = dup.path.parent / "_duplicates"
                        trash_dir.mkdir(exist_ok=True)
                        dup.path.rename(trash_dir / dup.path.name)
                    elif action == "hardlink":
                        dup.path.unlink()
                        dup.path.hardlink_to(originals[0].path)

                    result.processed += 1
                    result.saved_bytes += dup.size
                except Exception as e:
                    logger.error(f"중복 처리 실패: {dup.name} — {e}")

        return result

    def _group_by_size(self, files: List[FileInfo]) -> dict[int, List[FileInfo]]:
        """1단계: 크기 기반 그룹핑"""
        groups: dict[int, List[FileInfo]] = {}
        for f in files:
            if f.size > 0:  # 빈 파일 제외
                if f.size not in groups:
                    groups[f.size] = []
                groups[f.size].append(f)
        return {k: v for k, v in groups.items() if len(v) > 1}

    def _hash_fast(self, files: List[FileInfo]) -> dict[str, List[FileInfo]]:
        """2단계: xxhash64 빠른 해싱 (병렬)"""
        groups: dict[str, List[FileInfo]] = {}

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(self._compute_xxhash, f): f for f in files}
            for future in as_completed(futures):
                f = futures[future]
                try:
                    h = future.result()
                    if h not in groups:
                        groups[h] = []
                    groups[h].append(f)
                except Exception as e:
                    logger.warning(f"해싱 실패: {f.name} — {e}")

        return {k: v for k, v in groups.items() if len(v) > 1}

    def _hash_verify(self, groups: dict[str, List[FileInfo]]) -> dict[str, List[FileInfo]]:
        """3단계: SHA-256 정밀 검증"""
        verified: dict[str, List[FileInfo]] = {}

        for group_files in groups.values():
            sha_groups: dict[str, List[FileInfo]] = {}
            for f in group_files:
                sha = self._compute_sha256(f)
                if sha not in sha_groups:
                    sha_groups[sha] = []
                sha_groups[sha].append(f)

            for sha, sha_files in sha_groups.items():
                if len(sha_files) > 1:
                    verified[sha] = sha_files

        return verified

    @staticmethod
    def _compute_xxhash(f: FileInfo) -> str:
        """xxhash64 스트리밍 해싱"""
        import xxhash
        h = xxhash.xxh64()
        with open(f.path, "rb") as fp:
            while chunk := fp.read(CHUNK_SIZE):
                h.update(chunk)
        return h.hexdigest()

    @staticmethod
    def _compute_sha256(f: FileInfo) -> str:
        """SHA-256 스트리밍 해싱"""
        h = hashlib.sha256()
        with open(f.path, "rb") as fp:
            while chunk := fp.read(CHUNK_SIZE):
                h.update(chunk)
        return h.hexdigest()
