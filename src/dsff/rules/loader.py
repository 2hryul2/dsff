"""DS FolderFit — 프로필 YAML 로더

프로필 검색 순서:
  1. 사용자 프로필 디렉토리 (~/.dsff/profiles/ 또는 %AppData%/dsff/profiles/)
  2. 내장 프로필 디렉토리 (config/profiles/)
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List

import yaml
from loguru import logger

from dsff.config import CategoryRule


# ── 내장 프로필 디렉토리 경로 결정 ────────────────────────────────
def _get_builtin_profiles_dir() -> Path:
    """내장 프로필 디렉토리 (소스 실행 / PyInstaller 실행 모두 지원)"""
    if getattr(sys, "frozen", False):
        # PyInstaller 단일 실행 파일 환경
        return Path(sys._MEIPASS) / "config" / "profiles"
    # 소스 실행 환경: src/dsff/rules/ → project_root/config/profiles/
    return Path(__file__).parents[3] / "config" / "profiles"


_BUILTIN_PROFILES_DIR: Path = _get_builtin_profiles_dir()

# 사용 가능한 내장 프로필 ID 목록
BUILTIN_PROFILE_IDS = ["by-date", "by-subject", "by-type"]


# ── 프로필 데이터 클래스 ─────────────────────────────────────────
@dataclass
class OrganizeProfile:
    """정리 방식 설정"""
    mode: str = "by-type"           # "by-type" | "by-date" | "by-size"
    date_mode: Optional[str] = None  # "daily" | "monthly" | "yearly" | "age"
    date_source: str = "modified"   # "created" | "modified"


@dataclass
class RenameProfile:
    """생성일 리네임 설정"""
    enabled: bool = False
    date_format: str = "YYMMDD"     # "YYMMDD" | "YYYYMMDD" | "YYYY-MM-DD"
    date_source: str = "created"    # "created" | "modified"
    skip_existing: bool = True


@dataclass
class ProfileData:
    """프로필 YAML에서 로드한 전체 설정"""
    name: str = "기본"
    id: str = "default"
    description: str = ""
    organize: OrganizeProfile = field(default_factory=OrganizeProfile)
    rename: RenameProfile = field(default_factory=RenameProfile)
    duplicates_action: str = "report"           # "report" | "move" | "trash" | "hardlink"
    duplicates_verify_sha256: bool = False
    watch_delay: float = 2.0
    watch_exclude_patterns: List[str] = field(
        default_factory=lambda: ["*.tmp", "*.part", "*.crdownload"]
    )
    analyze_large_file_threshold_mb: int = 500
    analyze_old_file_days: int = 365
    categories: List[CategoryRule] = field(default_factory=list)


# ── 공개 API ─────────────────────────────────────────────────────
def load_profile(
    name: str,
    user_profiles_dir: Optional[Path] = None,
) -> ProfileData:
    """프로필 이름으로 ProfileData를 로드한다.

    Args:
        name: 프로필 ID ("by-date", "by-subject", "by-type", "default", ...)
        user_profiles_dir: 사용자 정의 프로필 디렉토리 (없으면 platformdirs 기본값)

    Returns:
        ProfileData (찾지 못하면 기본값 반환)
    """
    if name == "default":
        return ProfileData()

    # 사용자 디렉토리 결정
    if user_profiles_dir is None:
        from platformdirs import user_config_dir
        user_profiles_dir = Path(user_config_dir("dsff")) / "profiles"

    for directory in (user_profiles_dir, _BUILTIN_PROFILES_DIR):
        yaml_path = directory / f"{name}.yaml"
        if yaml_path.exists():
            try:
                return _parse_profile(yaml_path)
            except Exception as e:
                logger.warning(f"프로필 파싱 실패 ({yaml_path}): {e}")

    logger.warning(f"프로필 '{name}'을 찾을 수 없습니다. 기본 프로필을 사용합니다.")
    return ProfileData()


def list_available_profiles(user_profiles_dir: Optional[Path] = None) -> List[dict]:
    """사용 가능한 프로필 목록 반환 (내장 + 사용자 정의)"""
    if user_profiles_dir is None:
        from platformdirs import user_config_dir
        user_profiles_dir = Path(user_config_dir("dsff")) / "profiles"

    found: dict[str, dict] = {}

    # 내장 프로필 먼저 (낮은 우선순위)
    for yaml_path in sorted(_BUILTIN_PROFILES_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
            meta = data.get("profile", {})
            profile_id = meta.get("id", yaml_path.stem)
            found[profile_id] = {
                "id": profile_id,
                "name": meta.get("name", yaml_path.stem),
                "description": meta.get("description", ""),
                "rank": meta.get("rank", 99),
                "source": "내장",
            }
        except Exception:
            pass

    # 사용자 프로필 (높은 우선순위 — 같은 ID면 덮어씀)
    if user_profiles_dir.exists():
        for yaml_path in sorted(user_profiles_dir.glob("*.yaml")):
            try:
                data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
                meta = data.get("profile", {})
                profile_id = meta.get("id", yaml_path.stem)
                found[profile_id] = {
                    "id": profile_id,
                    "name": meta.get("name", yaml_path.stem),
                    "description": meta.get("description", ""),
                    "rank": meta.get("rank", 99),
                    "source": "사용자",
                }
            except Exception:
                pass

    return sorted(found.values(), key=lambda x: x["rank"])


# ── 내부 파싱 로직 ────────────────────────────────────────────────
def _parse_profile(path: Path) -> ProfileData:
    """YAML 파일을 ProfileData로 변환"""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    meta = raw.get("profile", {})
    org  = raw.get("organize", {})
    ren  = raw.get("rename", {})
    dup  = raw.get("duplicates", {})
    wat  = raw.get("watch", {})
    ana  = raw.get("analyze", {})
    cats_raw = raw.get("categories", [])

    categories: List[CategoryRule] = []
    for c in cats_raw:
        categories.append(CategoryRule(
            name=c.get("name", "기타"),
            extensions=c.get("extensions", []),
            patterns=c.get("patterns", []),
            mime_types=c.get("mime_types", []),
            target_folder=c.get("target_folder", "Others"),
        ))

    return ProfileData(
        name=meta.get("name", path.stem),
        id=meta.get("id", path.stem),
        description=meta.get("description", ""),
        organize=OrganizeProfile(
            mode=org.get("mode", "by-type"),
            date_mode=org.get("date_mode") or None,
            date_source=org.get("date_source", "modified"),
        ),
        rename=RenameProfile(
            enabled=ren.get("enabled", False),
            date_format=ren.get("date_format", "YYMMDD"),
            date_source=ren.get("date_source", "created"),
            skip_existing=ren.get("skip_existing", True),
        ),
        duplicates_action=dup.get("action", "report"),
        duplicates_verify_sha256=dup.get("verify_with_sha256", False),
        watch_delay=float(wat.get("delay", 2.0)),
        watch_exclude_patterns=wat.get(
            "exclude_patterns", ["*.tmp", "*.part", "*.crdownload"]
        ),
        analyze_large_file_threshold_mb=ana.get("large_file_threshold_mb", 500),
        analyze_old_file_days=ana.get("old_file_days", 365),
        categories=categories,
    )
