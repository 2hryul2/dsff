"""DS FolderFit — 크로스 플랫폼 유틸리티"""
from __future__ import annotations

import os
import sys
import platform
from datetime import datetime
from pathlib import Path


def get_creation_time(path: Path) -> datetime:
    """크로스 플랫폼 파일 생성일 취득"""
    stat = path.stat()

    if sys.platform == "win32":
        # Windows: st_ctime이 실제 생성 시간
        return datetime.fromtimestamp(stat.st_ctime)

    if sys.platform == "darwin":
        # macOS: st_birthtime 사용
        return datetime.fromtimestamp(stat.st_birthtime)

    # Linux: 폴백 — mtime과 ctime 중 더 오래된 값
    # (statx 시스템콜은 환경에 따라 불안정할 수 있어 안전한 폴백 사용)
    return datetime.fromtimestamp(min(stat.st_mtime, stat.st_ctime))


def _linux_get_birthtime(path: Path) -> datetime | None:
    """Linux statx 시스템콜로 birth time 취득 시도"""
    try:
        import ctypes
        import ctypes.util

        libc_name = ctypes.util.find_library("c")
        if not libc_name:
            return None

        libc = ctypes.CDLL(libc_name, use_errno=True)

        # statx 시스템콜 (커널 4.11+)
        AT_FDCWD = -100
        STATX_BTIME = 0x800

        class StatxTimestamp(ctypes.Structure):
            _fields_ = [("tv_sec", ctypes.c_int64), ("tv_nsec", ctypes.c_uint32), ("__pad", ctypes.c_int32)]

        class Statx(ctypes.Structure):
            _fields_ = [
                ("stx_mask", ctypes.c_uint32),
                ("stx_blksize", ctypes.c_uint32),
                ("stx_attributes", ctypes.c_uint64),
                ("stx_nlink", ctypes.c_uint32),
                ("stx_uid", ctypes.c_uint32),
                ("stx_gid", ctypes.c_uint32),
                ("stx_mode", ctypes.c_uint16),
                ("__pad0", ctypes.c_uint16),
                ("stx_ino", ctypes.c_uint64),
                ("stx_size", ctypes.c_uint64),
                ("stx_blocks", ctypes.c_uint64),
                ("stx_attributes_mask", ctypes.c_uint64),
                ("stx_atime", StatxTimestamp),
                ("stx_btime", StatxTimestamp),
                ("stx_ctime", StatxTimestamp),
                ("stx_mtime", StatxTimestamp),
            ]

        buf = Statx()
        path_bytes = str(path).encode("utf-8")
        ret = libc.statx(AT_FDCWD, path_bytes, 0, STATX_BTIME, ctypes.byref(buf))

        if ret == 0 and buf.stx_btime.tv_sec > 0:
            return datetime.fromtimestamp(buf.stx_btime.tv_sec)
    except Exception:
        pass

    return None


def get_mime_description(mime_type: str | None, extension: str) -> str:
    """MIME 타입 → 사람이 읽기 쉬운 설명"""
    DESCRIPTIONS = {
        ".xlsx": "Microsoft Excel 워크시트",
        ".xls": "Microsoft Excel 97-2003 워크시트",
        ".docx": "Microsoft Word 문서",
        ".doc": "Microsoft Word 97-2003 문서",
        ".pptx": "Microsoft PowerPoint 프레젠테이션",
        ".ppt": "Microsoft PowerPoint 97-2003 프레젠테이션",
        ".pdf": "PDF 문서",
        ".jpg": "JPEG 이미지",
        ".jpeg": "JPEG 이미지",
        ".png": "PNG 이미지",
        ".gif": "GIF 이미지",
        ".mp4": "MP4 비디오",
        ".mp3": "MP3 오디오",
        ".zip": "ZIP 압축 파일",
        ".exe": "Windows 실행 파일",
        ".py": "Python 스크립트",
        ".js": "JavaScript 파일",
        ".html": "HTML 문서",
        ".css": "CSS 스타일시트",
        ".json": "JSON 데이터",
        ".xml": "XML 문서",
        ".csv": "CSV 데이터",
        ".txt": "텍스트 파일",
        ".hwp": "한글 문서",
        ".hwpx": "한글 문서 (OOXML)",
    }
    ext = extension.lower()
    if ext in DESCRIPTIONS:
        return DESCRIPTIONS[ext]
    if mime_type:
        return mime_type
    return f"{ext} 파일" if ext else "알 수 없는 파일"


def is_file_locked(path: Path) -> bool:
    """파일이 잠겨 있는지 확인 (Windows 전용, 다른 OS는 항상 False)"""
    if sys.platform != "win32":
        return False
    try:
        with open(path, "r+b"):
            return False
    except (PermissionError, OSError):
        return True
