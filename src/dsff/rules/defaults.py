"""DS FolderFit — 기본 파일 분류 규칙"""
from __future__ import annotations

# 카테고리별 확장자 매핑
DEFAULT_CATEGORIES: dict[str, dict] = {
    "문서": {
        "extensions": [
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".txt", ".rtf", ".odt", ".ods", ".odp", ".csv", ".tsv",
            ".hwp", ".hwpx", ".md", ".tex", ".epub",
        ],
        "mime_types": [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.*",
            "application/vnd.ms-excel",
            "application/vnd.ms-powerpoint",
            "text/plain",
            "text/csv",
        ],
        "target_folder": "Documents",
    },
    "이미지": {
        "extensions": [
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp",
            ".ico", ".tiff", ".tif", ".heic", ".heif", ".raw", ".cr2",
            ".nef", ".dng", ".psd", ".ai", ".eps",
        ],
        "mime_types": ["image/*"],
        "target_folder": "Images",
    },
    "동영상": {
        "extensions": [
            ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm",
            ".m4v", ".mpg", ".mpeg", ".3gp", ".ts",
        ],
        "mime_types": ["video/*"],
        "target_folder": "Videos",
    },
    "음악": {
        "extensions": [
            ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a",
            ".opus", ".aiff", ".alac",
        ],
        "mime_types": ["audio/*"],
        "target_folder": "Music",
    },
    "압축": {
        "extensions": [
            ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
            ".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".cab", ".iso",
        ],
        "mime_types": ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
        "target_folder": "Archives",
    },
    "설치파일": {
        "extensions": [
            ".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".appimage",
            ".apk", ".ipa",
        ],
        "mime_types": ["application/x-executable", "application/x-msi"],
        "target_folder": "Installers",
    },
    "코드": {
        "extensions": [
            ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp",
            ".h", ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt",
            ".sql", ".sh", ".bat", ".ps1", ".html", ".css", ".scss",
            ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg",
            ".ipynb",
        ],
        "mime_types": ["text/x-python", "application/javascript", "text/html"],
        "target_folder": "Code",
    },
    "폰트": {
        "extensions": [".ttf", ".otf", ".woff", ".woff2", ".eot"],
        "mime_types": ["font/*"],
        "target_folder": "Fonts",
    },
    "데이터": {
        "extensions": [
            ".db", ".sqlite", ".sqlite3", ".mdb", ".accdb",
            ".parquet", ".feather", ".arrow", ".hdf5", ".h5",
        ],
        "mime_types": [],
        "target_folder": "Data",
    },
}


def get_extension_map() -> dict[str, str]:
    """확장자 → 카테고리명 매핑 딕셔너리 반환"""
    ext_map: dict[str, str] = {}
    for category_name, info in DEFAULT_CATEGORIES.items():
        for ext in info["extensions"]:
            ext_map[ext.lower()] = category_name
    return ext_map


def get_category_target(category_name: str) -> str:
    """카테고리 이름으로 대상 폴더명 반환"""
    info = DEFAULT_CATEGORIES.get(category_name)
    return info["target_folder"] if info else "Others"


def get_all_targets() -> dict[str, str]:
    """카테고리명 → 대상 폴더명 매핑"""
    return {name: info["target_folder"] for name, info in DEFAULT_CATEGORIES.items()}
