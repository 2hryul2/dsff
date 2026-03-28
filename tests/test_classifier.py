"""Classifier 모듈 테스트"""
from dsff.core.classifier import FileClassifier
from dsff.core.scanner import FolderScanner


class TestFileClassifier:
    def test_classify_documents(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        classifier = FileClassifier()
        classifier.classify(files)

        by_name = {f.name: f.category for f in files}
        assert by_name["report.pdf"] == "문서"
        assert by_name["data.xlsx"] == "문서"
        assert by_name["notes.txt"] == "문서"
        assert by_name["readme.md"] == "문서"

    def test_classify_media(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        classifier = FileClassifier()
        classifier.classify(files)

        by_name = {f.name: f.category for f in files}
        assert by_name["photo.jpg"] == "이미지"
        assert by_name["music.mp3"] == "음악"
        assert by_name["video.mp4"] == "동영상"

    def test_classify_archives(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        classifier = FileClassifier()
        classifier.classify(files)

        by_name = {f.name: f.category for f in files}
        assert by_name["archive.zip"] == "압축"

    def test_classify_code(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        classifier = FileClassifier()
        classifier.classify(files)

        by_name = {f.name: f.category for f in files}
        assert by_name["script.py"] == "코드"

    def test_classify_unknown(self, sample_downloads):
        scanner = FolderScanner(detect_mime=False)
        files = scanner.scan(sample_downloads)
        classifier = FileClassifier()
        classifier.classify(files)

        by_name = {f.name: f.category for f in files}
        assert by_name["mystery_file"] == "기타"

    def test_get_target_folder(self):
        classifier = FileClassifier()
        assert classifier.get_target_folder("문서") == "Documents"
        assert classifier.get_target_folder("이미지") == "Images"
        assert classifier.get_target_folder("기타") == "Others"
