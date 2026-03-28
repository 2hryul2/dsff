"""Duplicates 모듈 테스트"""
from dsff.config import DuplicateConfig
from dsff.core.duplicates import DuplicateDetector
from dsff.core.scanner import FolderScanner


class TestDuplicateDetector:
    def test_find_duplicates(self, sample_with_duplicates):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_with_duplicates)

        detector = DuplicateDetector()
        groups = detector.find_duplicates(files)

        assert len(groups) == 2  # 2개 중복 그룹 (A 3개, B 2개)
        total_dups = sum(g.count for g in groups)
        assert total_dups == 5  # 총 5개 파일이 중복 그룹에

    def test_no_duplicates(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)

        detector = DuplicateDetector()
        groups = detector.find_duplicates(files)

        # sample_downloads에는 모든 파일이 다른 내용
        assert len(groups) == 0

    def test_wasted_size(self, sample_with_duplicates):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_with_duplicates)

        detector = DuplicateDetector()
        groups = detector.find_duplicates(files)

        total_wasted = sum(g.wasted_size for g in groups)
        assert total_wasted > 0

    def test_process_report_only(self, sample_with_duplicates):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_with_duplicates)

        detector = DuplicateDetector()
        groups = detector.find_duplicates(files)
        result = detector.process(groups, action="report")

        assert result.processed == 0  # report만 하므로 처리 없음
