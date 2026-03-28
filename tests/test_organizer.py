"""Organizer 모듈 테스트"""
from dsff.config import DSFolderFitConfig
from dsff.core.organizer import FileOrganizer


class TestFileOrganizer:
    def test_plan_by_type(self, sample_downloads):
        config = DSFolderFitConfig()
        organizer = FileOrganizer(config)
        plan = organizer.plan(sample_downloads, by_type=True)

        assert plan.total_moves > 0
        # 모든 이동이 원본과 다른 경로인지 확인
        for move in plan.moves:
            assert move.source != move.dest
            assert move.category != ""

    def test_plan_with_exclude(self, sample_downloads):
        config = DSFolderFitConfig()
        organizer = FileOrganizer(config)
        plan = organizer.plan(sample_downloads, by_type=True, exclude_patterns=["*.pdf"])

        names = [m.source.name for m in plan.moves]
        assert "report.pdf" not in names

    def test_execute_moves_files(self, sample_downloads):
        config = DSFolderFitConfig()
        organizer = FileOrganizer(config)
        plan = organizer.plan(sample_downloads, by_type=True)
        result = organizer.execute(plan)

        assert result.moved > 0
        assert result.failed == 0

        # 대상 폴더가 생성되었는지 확인
        subdirs = [d.name for d in sample_downloads.iterdir() if d.is_dir()]
        assert len(subdirs) > 0

    def test_plan_empty_folder(self, empty_folder):
        config = DSFolderFitConfig()
        organizer = FileOrganizer(config)
        plan = organizer.plan(empty_folder)
        assert plan.total_moves == 0
