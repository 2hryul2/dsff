"""Rules 엔진 테스트"""
from dsff.rules.engine import RuleEngine
from dsff.rules.defaults import get_extension_map, get_all_targets
from dsff.config import CategoryRule


class TestRuleEngine:
    def test_classify_by_extension(self):
        engine = RuleEngine()
        assert engine.classify("report.pdf") == "문서"
        assert engine.classify("photo.jpg") == "이미지"
        assert engine.classify("song.mp3") == "음악"
        assert engine.classify("movie.mp4") == "동영상"
        assert engine.classify("code.py") == "코드"
        assert engine.classify("app.zip") == "압축"
        assert engine.classify("setup.exe") == "설치파일"

    def test_classify_unknown(self):
        engine = RuleEngine()
        assert engine.classify("somefile") == "기타"
        assert engine.classify("data.xyz") == "기타"

    def test_classify_tar_gz(self):
        engine = RuleEngine()
        assert engine.classify("backup.tar.gz") == "압축"
        assert engine.classify("data.tar.bz2") == "압축"

    def test_custom_rule_priority(self):
        custom = [CategoryRule(
            name="프로젝트 파일",
            extensions=[".proj", ".pdf"],
            patterns=[],
            mime_types=[],
            target_folder="Projects",
        )]
        engine = RuleEngine(custom_rules=custom)
        # 커스텀 규칙이 .pdf를 "프로젝트 파일"로 분류
        assert engine.classify("report.pdf") == "프로젝트 파일"

    def test_get_target_folder(self):
        engine = RuleEngine()
        assert engine.get_target_folder("문서") == "Documents"
        assert engine.get_target_folder("이미지") == "Images"
        assert engine.get_target_folder("알 수 없는 카테고리") == "Others"


class TestDefaults:
    def test_extension_map_not_empty(self):
        ext_map = get_extension_map()
        assert len(ext_map) > 50  # 최소 50개 확장자

    def test_all_targets_exist(self):
        targets = get_all_targets()
        assert "문서" in targets
        assert "이미지" in targets
        assert "동영상" in targets
