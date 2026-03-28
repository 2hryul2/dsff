"""DS FolderFit — 폴더 심층 분석/건강도 점수"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from loguru import logger

from dsff.config import AnalyzeConfig, ManagedFolder
from dsff.core.scanner import FolderScanner, FileInfo


@dataclass
class CategoryStats:
    count: int = 0
    total_size: int = 0


@dataclass
class DuplicateSummary:
    duplicate_groups: int = 0
    duplicate_files: int = 0
    wasted_size: int = 0


@dataclass
class FolderAnalysis:
    """폴더 분석 결과"""

    folder_path: Path
    total_files: int = 0
    total_size: int = 0
    category_distribution: dict[str, CategoryStats] = field(default_factory=dict)
    size_distribution: dict[str, int] = field(default_factory=dict)
    age_distribution: dict[str, int] = field(default_factory=dict)
    duplicate_summary: DuplicateSummary = field(default_factory=DuplicateSummary)
    depth_distribution: dict[int, int] = field(default_factory=dict)
    health_score: int = 0
    recommendations: List[str] = field(default_factory=list)


class FolderAnalyzer:
    """폴더 심층 분석"""

    def __init__(self, config: Optional[AnalyzeConfig] = None):
        self._config = config or AnalyzeConfig()
        self._scanner = FolderScanner(detect_mime=False)  # 분석엔 MIME 불필요

    def analyze(self, target: Path, depth: Optional[int] = None) -> FolderAnalysis:
        """폴더 전체 분석 실행"""
        target = target.expanduser().resolve()
        analysis = FolderAnalysis(folder_path=target)

        files = self._scanner.scan(target, recursive=True)
        if not files:
            return analysis

        # 카테고리 분류
        from dsff.core.classifier import FileClassifier
        classifier = FileClassifier()
        classifier.classify(files)

        # 깊이 필터
        if depth is not None:
            files = [f for f in files if self._get_depth(f.path, target) <= depth]

        analysis.total_files = len(files)
        analysis.total_size = sum(f.size for f in files)

        # 카테고리 분포
        for f in files:
            cat = f.category or "기타"
            if cat not in analysis.category_distribution:
                analysis.category_distribution[cat] = CategoryStats()
            analysis.category_distribution[cat].count += 1
            analysis.category_distribution[cat].total_size += f.size

        # 크기 분포
        analysis.size_distribution = self._calc_size_distribution(files)

        # 날짜 분포
        analysis.age_distribution = self._calc_age_distribution(files)

        # 깊이 분포
        analysis.depth_distribution = self._calc_depth_distribution(files, target)

        # 중복 분석 (빠른 크기 기반만)
        analysis.duplicate_summary = self._quick_duplicate_check(files)

        # 건강도 점수
        analysis.health_score = self.calculate_health_score(analysis)

        # 추천
        analysis.recommendations = self.generate_recommendations(analysis)

        logger.info(f"분석 완료: {target} (건강도: {analysis.health_score}/100)")
        return analysis

    def analyze_all(self, folders: List[ManagedFolder]) -> List[FolderAnalysis]:
        """등록된 모든 폴더 분석"""
        results = []
        for folder in folders:
            try:
                result = self.analyze(folder.path)
                results.append(result)
            except Exception as e:
                logger.error(f"폴더 분석 실패: {folder.label} — {e}")
        return results

    def calculate_health_score(self, analysis: FolderAnalysis) -> int:
        """정리 건강도 점수 산출 (0~100)"""
        score = 100
        total = analysis.total_files
        if total == 0:
            return 100

        # 1. 미분류(기타) 파일 비율 — 최대 -30
        etc_count = analysis.category_distribution.get("기타", CategoryStats()).count
        etc_ratio = etc_count / total
        score -= int(etc_ratio * 30)

        # 2. 중복 파일 비율 — 최대 -25
        if analysis.duplicate_summary.duplicate_files > 0:
            dup_ratio = analysis.duplicate_summary.duplicate_files / total
            score -= int(dup_ratio * 25)

        # 3. 오래된 파일 비율 (1년+) — 최대 -20
        old_count = analysis.age_distribution.get("old", 0)
        old_ratio = old_count / total
        score -= int(old_ratio * 20)

        # 4. 대용량 파일 방치 — 최대 -15
        large_count = analysis.size_distribution.get("large", 0)
        if large_count > 5:
            score -= 15
        elif large_count > 0:
            score -= large_count * 3

        # 5. 깊이 혼란 (루트에 파일이 너무 많음) — 최대 -10
        root_files = analysis.depth_distribution.get(0, 0)
        if root_files > 100:
            score -= 10
        elif root_files > 50:
            score -= 5

        return max(0, min(100, score))

    def generate_recommendations(self, analysis: FolderAnalysis) -> List[str]:
        """분석 결과 기반 추천 작업 생성"""
        recs: List[str] = []

        etc_stats = analysis.category_distribution.get("기타", CategoryStats())
        if etc_stats.count > 10:
            recs.append(f"미분류 파일 {etc_stats.count}개 → 'dsff organize' 실행 추천")

        dup = analysis.duplicate_summary
        if dup.duplicate_files > 0:
            size_mb = dup.wasted_size / (1024 * 1024)
            recs.append(f"중복 파일 {dup.duplicate_files}개 (약 {size_mb:.0f}MB 낭비) → 'dsff duplicates' 실행 추천")

        old_count = analysis.age_distribution.get("old", 0)
        if old_count > 20:
            recs.append(f"1년 이상 오래된 파일 {old_count}개 → 아카이브 또는 삭제 검토")

        large_count = analysis.size_distribution.get("large", 0)
        if large_count > 0:
            recs.append(f"대용량 파일(100MB+) {large_count}개 발견 → 정리 대상 확인")

        if analysis.health_score >= 80:
            recs.append("전체적으로 잘 정리되어 있습니다!")

        return recs

    # ── 내부 헬퍼 ──

    @staticmethod
    def _get_depth(file_path: Path, root: Path) -> int:
        try:
            return len(file_path.relative_to(root).parts) - 1
        except ValueError:
            return 0

    @staticmethod
    def _calc_size_distribution(files: List[FileInfo]) -> dict[str, int]:
        dist = {"small": 0, "medium": 0, "large": 0}
        for f in files:
            if f.size < 1024 * 1024:  # < 1MB
                dist["small"] += 1
            elif f.size < 100 * 1024 * 1024:  # < 100MB
                dist["medium"] += 1
            else:
                dist["large"] += 1
        return dist

    @staticmethod
    def _calc_age_distribution(files: List[FileInfo]) -> dict[str, int]:
        now = datetime.now()
        dist = {"recent": 0, "this_month": 0, "this_year": 0, "old": 0}
        for f in files:
            age = now - f.modified_time
            if age <= timedelta(days=7):
                dist["recent"] += 1
            elif age <= timedelta(days=30):
                dist["this_month"] += 1
            elif age <= timedelta(days=365):
                dist["this_year"] += 1
            else:
                dist["old"] += 1
        return dist

    def _calc_depth_distribution(self, files: List[FileInfo], root: Path) -> dict[int, int]:
        dist: dict[int, int] = {}
        for f in files:
            d = self._get_depth(f.path, root)
            dist[d] = dist.get(d, 0) + 1
        return dist

    @staticmethod
    def _quick_duplicate_check(files: List[FileInfo]) -> DuplicateSummary:
        """빠른 크기 기반 중복 추정 (정확한 해시 비교 아님)"""
        size_groups: dict[int, list[FileInfo]] = {}
        for f in files:
            if f.size > 0:  # 빈 파일 제외
                if f.size not in size_groups:
                    size_groups[f.size] = []
                size_groups[f.size].append(f)

        dup_groups = 0
        dup_files = 0
        wasted = 0
        for size, group in size_groups.items():
            if len(group) > 1:
                dup_groups += 1
                dup_files += len(group) - 1
                wasted += size * (len(group) - 1)

        return DuplicateSummary(
            duplicate_groups=dup_groups,
            duplicate_files=dup_files,
            wasted_size=wasted,
        )
