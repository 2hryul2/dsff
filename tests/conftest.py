"""DS FolderFit — 테스트 공통 fixture"""
import pytest
from pathlib import Path


@pytest.fixture
def sample_downloads(tmp_path):
    """다양한 파일 타입의 테스트 폴더 생성"""
    files = {
        "report.pdf": b"%PDF-1.4 fake pdf content",
        "photo.jpg": b"\xff\xd8\xff\xe0 fake jpg",
        "music.mp3": b"ID3 fake mp3 content here",
        "video.mp4": b"\x00\x00\x00\x20ftyp fake mp4",
        "data.xlsx": b"PK fake xlsx",
        "script.py": b"#!/usr/bin/env python3\nprint('hello')",
        "archive.zip": b"PK\x03\x04 fake zip",
        "installer.exe": b"MZ fake exe",
        "notes.txt": b"Some notes here",
        "readme.md": b"# README",
        "mystery_file": b"unknown content",
        "big_file.iso": b"x" * 1024,  # 작은 "대용량" 파일
    }

    for name, content in files.items():
        (tmp_path / name).write_bytes(content)

    return tmp_path


@pytest.fixture
def sample_with_duplicates(tmp_path):
    """중복 파일이 포함된 테스트 폴더"""
    content_a = b"This is duplicate content A" * 100
    content_b = b"This is duplicate content B" * 50
    content_unique = b"This is unique content"

    (tmp_path / "file_a1.txt").write_bytes(content_a)
    (tmp_path / "file_a2.txt").write_bytes(content_a)
    (tmp_path / "file_a3.txt").write_bytes(content_a)
    (tmp_path / "file_b1.pdf").write_bytes(content_b)
    (tmp_path / "file_b2.pdf").write_bytes(content_b)
    (tmp_path / "unique.doc").write_bytes(content_unique)

    return tmp_path


@pytest.fixture
def sample_with_dates(tmp_path):
    """날짜 접두사 테스트용 파일"""
    import os
    import time

    files = [
        "report.xlsx",
        "260101_already_dated.pdf",
        "20260315_long_date.docx",
        "photo.jpg",
    ]
    for name in files:
        p = tmp_path / name
        p.write_bytes(b"content")

    return tmp_path


@pytest.fixture
def empty_folder(tmp_path):
    """빈 폴더"""
    return tmp_path
