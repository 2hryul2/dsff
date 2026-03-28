"""Scanner 모듈 테스트"""
from dsff.core.scanner import FolderScanner


class TestFolderScanner:
    def test_scan_finds_all_files(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        assert len(files) == 12

    def test_scan_empty_folder(self, empty_folder):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(empty_folder)
        assert len(files) == 0

    def test_file_info_has_metadata(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)

        for f in files:
            assert f.name
            assert f.path.exists()
            assert f.size >= 0
            assert f.created_time is not None
            assert f.modified_time is not None
            assert f.accessed_time is not None

    def test_statistics(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        stats = scanner.get_statistics(files)

        assert stats.total_files == 12
        assert stats.total_size > 0
        assert stats.largest_file is not None
        assert stats.newest_file is not None

    def test_scan_nonexistent_folder(self, tmp_path):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(tmp_path / "nonexistent")
        assert len(files) == 0

    def test_size_display(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        for f in files:
            assert isinstance(f.size_display, str)
            assert len(f.size_display) > 0
