"""Watcher 모듈 테스트 (기본 인스턴스화 테스트)"""
from dsff.config import DSFolderFitConfig
from dsff.core.watcher import FolderWatcher


class TestFolderWatcher:
    def test_create_watcher(self):
        config = DSFolderFitConfig()
        watcher = FolderWatcher(config)
        assert watcher._delay == 2.0
        assert "*.tmp" in watcher._exclude

    def test_custom_delay(self):
        config = DSFolderFitConfig()
        watcher = FolderWatcher(config, delay=5.0)
        assert watcher._delay == 5.0

    def test_custom_exclude(self):
        config = DSFolderFitConfig()
        watcher = FolderWatcher(config, exclude_patterns=["*.log"])
        assert "*.log" in watcher._exclude
