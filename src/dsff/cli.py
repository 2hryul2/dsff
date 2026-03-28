"""DS FolderFit — Typer CLI 정의"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional, List

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from dsff import __version__, __app_name__
from dsff.config import DSFolderFitConfig, CONFIG_FILE
from dsff.rules.loader import ProfileData, load_profile, list_available_profiles

app = typer.Typer(
    name="dsff",
    help="DS FolderFit — 스마트 폴더 정리 도구",
    no_args_is_help=True,
    rich_markup_mode="rich",
)

console = Console()

# ── JSON 출력 모드 ────────────────────────────────────────
_json_mode: bool = False


def _json_out(data: dict) -> None:
    """JSON 출력 후 즉시 종료 (Rich 우회)"""
    print(json.dumps(data, ensure_ascii=False, default=str))
    raise typer.Exit()


def _human_size(size: int) -> str:
    """사람이 읽기 쉬운 크기"""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 ** 2:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 ** 3:
        return f"{size / 1024**2:.1f} MB"
    return f"{size / 1024**3:.1f} GB"


# ── 서브 커맨드 그룹 ──────────────────────────────────────
folder_app = typer.Typer(help="폴더 등록/해제/목록 관리")
app.add_typer(folder_app, name="folder")


# ── 콜백 (버전 표시 등) ──────────────────────────────────
def _version_callback(value: bool) -> None:
    if value:
        console.print(f"[bold cyan]{__app_name__}[/] v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(
        False, "--version", "-V", callback=_version_callback, is_eager=True,
        help="버전 정보 출력",
    ),
    json_output: bool = typer.Option(
        False, "--json", help="JSON 출력 모드 (GUI 연동용)",
    ),
) -> None:
    """DS FolderFit — 스마트 폴더 정리 도구"""
    global _json_mode
    _json_mode = json_output


# ═══════════════════════════════════════════════════════════
# folder 서브 커맨드
# ═══════════════════════════════════════════════════════════
@folder_app.command("add")
def folder_add(
    path: Path = typer.Argument(..., help="등록할 폴더 경로"),
    label: str = typer.Option("", "--label", "-l", help="폴더 표시 이름"),
    watch: bool = typer.Option(False, "--watch", "-w", help="자동 감시 활성화"),
    profile: str = typer.Option("default", "--profile", "-p", help="규칙 프로필"),
) -> None:
    """새 폴더를 관리 대상으로 등록"""
    from dsff.core.folder_mgr import FolderManager

    config = DSFolderFitConfig.load()
    mgr = FolderManager(config)
    folder = mgr.add_folder(path, label=label or path.name, auto_watch=watch, profile=profile)
    config.save()
    console.print(f"[green]✓[/] 폴더 등록 완료: [bold]{folder.label}[/] → {folder.path}")


@folder_app.command("remove")
def folder_remove(
    label: str = typer.Argument(..., help="제거할 폴더 라벨"),
) -> None:
    """등록된 폴더 해제"""
    from dsff.core.folder_mgr import FolderManager

    config = DSFolderFitConfig.load()
    mgr = FolderManager(config)
    if mgr.remove_folder(label):
        config.save()
        console.print(f"[green]✓[/] 폴더 해제됨: [bold]{label}[/]")
    else:
        console.print(f"[red]✗[/] '{label}' 폴더를 찾을 수 없습니다.")
        raise typer.Exit(code=1)


@folder_app.command("list")
def folder_list() -> None:
    """등록된 모든 관리 폴더 목록"""
    from dsff.core.folder_mgr import FolderManager

    config = DSFolderFitConfig.load()
    mgr = FolderManager(config)
    folders = mgr.list_folders()

    if not folders:
        console.print("[yellow]등록된 폴더가 없습니다.[/]")
        return

    table = Table(title="📁 관리 폴더 목록", show_lines=True)
    table.add_column("라벨", style="bold cyan")
    table.add_column("경로")
    table.add_column("감시", justify="center")
    table.add_column("프로필")
    table.add_column("건강도", justify="center")

    for f in folders:
        watch_icon = "🟢" if f.auto_watch else "⚪"
        score = f"[{'green' if (f.health_score or 0) >= 70 else 'yellow' if (f.health_score or 0) >= 40 else 'red'}]{f.health_score}[/]" if f.health_score is not None else "—"
        table.add_row(f.label, str(f.path), watch_icon, f.rules_profile, score)

    console.print(table)


@folder_app.command("profiles")
def folder_profiles() -> None:
    """사용 가능한 정리 프로필 목록"""
    profiles = list_available_profiles()

    if not profiles:
        console.print("[yellow]사용 가능한 프로필이 없습니다.[/]")
        return

    table = Table(title="[bold] 정리 프로필 목록[/]", show_lines=True)
    table.add_column("순위", justify="center", style="bold yellow")
    table.add_column("ID", style="bold cyan")
    table.add_column("이름")
    table.add_column("설명")
    table.add_column("출처", justify="center")

    for p in profiles:
        table.add_row(
            str(p["rank"]),
            p["id"],
            p["name"],
            p["description"],
            f"[dim]{p['source']}[/]",
        )

    console.print(table)
    console.print(
        "\n[dim]사용 예시:[/] "
        "[bold]dsff folder add ~/Downloads --profile by-date[/]  |  "
        "[bold]dsff organize --profile by-subject[/]"
    )


# ═══════════════════════════════════════════════════════════
# scan 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def scan(
    path: Optional[Path] = typer.Argument(None, help="스캔할 폴더 (기본: 등록된 폴더)"),
    recursive: bool = typer.Option(False, "--recursive", "-r", help="하위 폴더 포함"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="상세 출력"),
) -> None:
    """폴더 스캔 (파일 목록/통계)"""
    from dsff.core.scanner import FolderScanner
    from dsff.utils.formatting import print_scan_result

    config = DSFolderFitConfig.load()
    target = _resolve_target(path, config)
    scanner = FolderScanner()
    files = scanner.scan(target, recursive=recursive)
    stats = scanner.get_statistics(files)
    print_scan_result(console, files, stats, verbose=verbose)


# ═══════════════════════════════════════════════════════════
# analyze 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def analyze(
    path: Optional[Path] = typer.Argument(None, help="분석할 폴더"),
    all_folders: bool = typer.Option(False, "--all", "-a", help="등록된 모든 폴더 분석"),
    depth: Optional[int] = typer.Option(None, "--depth", "-d", help="분석 깊이"),
    score_only: bool = typer.Option(False, "--score-only", help="건강도 점수만 출력"),
) -> None:
    """폴더 심층 분석 리포트"""
    from dsff.core.analyzer import FolderAnalyzer
    from dsff.utils.formatting import print_analysis

    config = DSFolderFitConfig.load()
    analyzer = FolderAnalyzer(config.analyze)

    if all_folders:
        from dsff.core.folder_mgr import FolderManager
        mgr = FolderManager(config)
        results = analyzer.analyze_all(mgr.list_folders())
        if _json_mode:
            _json_out([_analysis_to_json(r) for r in results])
        for result in results:
            print_analysis(console, result, score_only=score_only)
    else:
        target = _resolve_target(path, config)
        result = analyzer.analyze(target, depth=depth)
        if _json_mode:
            _json_out(_analysis_to_json(result))
        print_analysis(console, result, score_only=score_only)


# ═══════════════════════════════════════════════════════════
# organize 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def organize(
    path: Optional[Path] = typer.Argument(None, help="정리할 폴더"),
    execute: bool = typer.Option(False, "--execute", help="실제 실행 (기본은 dry-run)"),
    profile: Optional[str] = typer.Option(None, "--profile", "-P", help="정리 프로필 (by-date/by-subject/by-type)"),
    by_type: Optional[bool] = typer.Option(None, "--by-type/--no-type", help="확장자 기반 분류 (프로필 기본값 덮어씀)"),
    by_date: Optional[str] = typer.Option(None, "--by-date", help="날짜 기반 정리 (daily/monthly/yearly/age)"),
    by_size: bool = typer.Option(False, "--by-size", help="크기 기반 정리"),
    duplicates: Optional[str] = typer.Option(None, "--duplicates", help="중복 처리 (report/move/trash/hardlink)"),
    size_threshold: int = typer.Option(500, "--size-threshold", help="대용량 임계치 (MB)"),
    exclude: Optional[str] = typer.Option(None, "--exclude", help="제외 패턴 (콤마 구분)"),
) -> None:
    """파일 정리 실행 (기본: dry-run 미리보기)

    프로필이 지정되면 해당 프로필의 정리 방식·카테고리 규칙이 적용됩니다.
    CLI 플래그(--by-type, --by-date)는 프로필 설정을 덮어씁니다.
    """
    from dsff.core.organizer import FileOrganizer
    from dsff.utils.formatting import print_organize_preview

    config = DSFolderFitConfig.load()
    target = _resolve_target(path, config)

    # 프로필 결정: --profile > 폴더의 rules_profile > "default"
    prof = _load_folder_profile(config, target, override=profile)

    # 프로필 카테고리로 config 오버라이드 (categories 있는 경우)
    if prof.categories:
        config = config.model_copy(update={"categories": prof.categories})

    # 정리 방식 결정: CLI 플래그 > 프로필 > 기본(by-type)
    effective_by_type: bool
    effective_by_date: Optional[str]

    if by_date is not None:
        # --by-date 명시 → 날짜 기반, by-type 끔
        effective_by_type = False
        effective_by_date = by_date
    elif by_type is not None:
        # --by-type/--no-type 명시 → 그대로 사용
        effective_by_type = by_type
        effective_by_date = None
    else:
        # 프로필의 organize.mode 적용
        effective_by_type = (prof.organize.mode == "by-type")
        effective_by_date = prof.organize.date_mode if prof.organize.mode == "by-date" else None

    exclude_list = [e.strip() for e in exclude.split(",")] if exclude else []

    # 프로필 정보 출력
    if prof.id != "default":
        console.print(
            f"[dim]프로필:[/] [bold cyan]{prof.name}[/] ({prof.id})  "
            f"모드: [bold]{'날짜' if effective_by_date else '유형' if effective_by_type else '크기'}[/]"
        )

    organizer = FileOrganizer(config)
    plan = organizer.plan(
        target,
        by_type=effective_by_type,
        by_date=effective_by_date,
        by_size=by_size,
        exclude_patterns=exclude_list,
    )

    if _json_mode:
        if execute:
            result = organizer.execute(plan)
            _json_out({"moved": result.moved, "failed": result.failed, "message": f"{result.moved}개 파일 정리 완료"})
        else:
            _json_out({
                "targetFolder": str(plan.target_folder),
                "moves": [
                    {"source": str(m.source), "dest": str(m.dest), "fileName": m.source.name, "category": m.category, "reason": m.reason}
                    for m in plan.moves
                ],
                "totalMoves": plan.total_moves,
            })

    print_organize_preview(console, plan)

    if execute:
        result = organizer.execute(plan)
        console.print(f"\n[green]✓[/] {result.moved} 파일 정리 완료")
    else:
        console.print("\n[yellow]ℹ[/] dry-run 모드입니다. [bold]--execute[/]로 실제 실행하세요.")


# ═══════════════════════════════════════════════════════════
# rename 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def rename(
    path: Optional[Path] = typer.Argument(None, help="대상 폴더"),
    execute: bool = typer.Option(False, "--execute", help="실제 실행"),
    profile: Optional[str] = typer.Option(None, "--profile", "-P", help="정리 프로필 (rename 설정 자동 적용)"),
    format: Optional[str] = typer.Option(None, "--format", "-f", help="날짜 포맷 (YYMMDD/YYYYMMDD/YYYY-MM-DD)"),
    date_source: Optional[str] = typer.Option(None, "--date-source", help="날짜 기준 (created/modified)"),
    skip_existing: bool = typer.Option(True, "--skip-existing/--overwrite-date", help="기존 날짜 접두사 건너뛰기"),
    extensions: Optional[str] = typer.Option(None, "--extensions", help="대상 확장자 (콤마 구분)"),
) -> None:
    """생성일 접두사 리네임

    프로필을 지정하면 해당 프로필의 날짜 포맷·기준이 기본값으로 적용됩니다.
    CLI 플래그(--format, --date-source)는 프로필 설정을 덮어씁니다.
    """
    from dsff.core.renamer import FileRenamer
    from dsff.core.scanner import FolderScanner
    from dsff.utils.formatting import print_rename_preview

    config = DSFolderFitConfig.load()
    target = _resolve_target(path, config)

    # 프로필 결정 및 rename 기본값 설정
    prof = _load_folder_profile(config, target, override=profile)
    effective_format = format or prof.rename.date_format
    effective_date_source = date_source or prof.rename.date_source

    ext_list = [e.strip() for e in extensions.split(",")] if extensions else None

    scanner = FolderScanner()
    files = scanner.scan(target)

    if ext_list:
        files = [f for f in files if f.extension in ext_list]

    if prof.id != "default":
        console.print(
            f"[dim]프로필:[/] [bold cyan]{prof.name}[/] ({prof.id})  "
            f"포맷: [bold]{effective_format}[/]  기준: [bold]{effective_date_source}[/]"
        )

    renamer = FileRenamer(
        date_format=effective_format,
        date_source=effective_date_source,
        skip_existing=skip_existing,
    )

    # 모든 파일에 대해 계획 생성 (skip 포함)
    all_plans = []
    for f in files:
        p = renamer.plan_rename(f)
        if p is not None:
            all_plans.append({"plan": p, "skip": False, "skipReason": None, "fileInfo": f})
        elif skip_existing and renamer._has_date_prefix(f.name):
            all_plans.append({"plan": None, "skip": True, "skipReason": "이미 날짜 접두사 있음", "fileInfo": f})

    plans = [item["plan"] for item in all_plans if not item["skip"]]

    if _json_mode:
        if execute and plans:
            from dsff.safety.history import HistoryManager
            history = HistoryManager()
            success = 0
            ops = []
            for plan in plans:
                if renamer.execute_rename(plan):
                    success += 1
                    ops.append({"type": "rename", "source": str(plan.source), "dest": str(plan.dest)})
            history.record(ops)
            _json_out({"success": success, "failed": len(plans) - success, "message": f"{success}/{len(plans)} 파일 리네임 완료"})
        else:
            json_plans = []
            for item in all_plans:
                if item["skip"]:
                    json_plans.append({"from": item["fileInfo"].name, "to": None, "date": "", "skip": True, "skipReason": item["skipReason"]})
                else:
                    p = item["plan"]
                    json_plans.append({"from": p.original_name, "to": p.new_name, "date": p.date_applied, "skip": False, "skipReason": None})
            _json_out({"plans": json_plans})

    print_rename_preview(console, plans)

    if execute and plans:
        from dsff.safety.history import HistoryManager
        history = HistoryManager()
        success = 0
        ops = []
        for plan in plans:
            if renamer.execute_rename(plan):
                success += 1
                ops.append({"type": "rename", "source": str(plan.source), "dest": str(plan.dest)})
        history.record(ops)
        console.print(f"\n[green]✓[/] {success}/{len(plans)} 파일 리네임 완료")
    elif not execute and plans:
        console.print("\n[yellow]ℹ[/] dry-run 모드입니다. [bold]--execute[/]로 실제 실행하세요.")


# ═══════════════════════════════════════════════════════════
# duplicates 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def duplicates(
    path: Optional[Path] = typer.Argument(None, help="검사할 폴더"),
    action: str = typer.Option("report", "--action", "-a", help="중복 처리 (report/move/trash/hardlink)"),
    recursive: bool = typer.Option(True, "--recursive/--no-recursive", help="하위 폴더 포함"),
) -> None:
    """중복 파일 검사"""
    from dsff.core.duplicates import DuplicateDetector
    from dsff.core.scanner import FolderScanner
    from dsff.utils.formatting import print_duplicates

    config = DSFolderFitConfig.load()
    target = _resolve_target(path, config)

    scanner = FolderScanner()
    files = scanner.scan(target, recursive=recursive)

    detector = DuplicateDetector(config.duplicates)
    groups = detector.find_duplicates(files)

    if _json_mode:
        if action != "report" and groups:
            result = detector.process(groups, action=action)
            _json_out({"processed": result.processed, "savedBytes": result.saved_bytes, "savedDisplay": result.saved_display, "message": f"{result.processed}개 중복 파일 처리 완료"})
        else:
            json_groups = []
            for i, g in enumerate(groups):
                copies = []
                for j, f in enumerate(g.files):
                    copies.append({
                        "path": str(f.path),
                        "date": f.modified_time.strftime("%Y-%m-%d"),
                        "size": _human_size(f.size),
                        "original": j == 0,
                        "checked": j > 0,
                    })
                json_groups.append({
                    "id": i + 1,
                    "name": g.files[0].name,
                    "totalSize": _human_size(g.size * g.count),
                    "wastedSize": _human_size(g.wasted_size),
                    "copies": copies,
                })
            _json_out({"groups": json_groups})

    print_duplicates(console, groups)

    if action != "report" and groups:
        result = detector.process(groups, action=action)
        console.print(f"\n[green]✓[/] {result.processed} 중복 파일 처리 완료 (절약: {result.saved_display})")


# ═══════════════════════════════════════════════════════════
# watch 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def watch(
    path: Optional[Path] = typer.Argument(None, help="감시할 폴더"),
    profile: Optional[str] = typer.Option(None, "--profile", "-P", help="정리 프로필 (watch 설정 자동 적용)"),
    delay: Optional[float] = typer.Option(None, "--delay", help="디바운스 지연 (초, 프로필 기본값 덮어씀)"),
    daemon: bool = typer.Option(False, "--daemon", help="백그라운드 실행"),
    exclude: Optional[str] = typer.Option(None, "--exclude", help="제외 패턴 (콤마 구분, 프로필 기본값 덮어씀)"),
) -> None:
    """실시간 감시 모드

    프로필을 지정하면 해당 프로필의 watch 설정(딜레이·제외 패턴)이 기본값으로 적용됩니다.
    """
    from dsff.core.watcher import FolderWatcher

    config = DSFolderFitConfig.load()
    target = _resolve_target(path, config)

    # 프로필 결정 및 watch 기본값 설정
    prof = _load_folder_profile(config, target, override=profile)
    effective_delay = delay if delay is not None else prof.watch_delay
    effective_exclude = (
        [e.strip() for e in exclude.split(",")] if exclude
        else prof.watch_exclude_patterns
    )

    # 프로필 카테고리로 config 오버라이드
    if prof.categories:
        config = config.model_copy(update={"categories": prof.categories})

    if prof.id != "default":
        console.print(
            f"[dim]프로필:[/] [bold cyan]{prof.name}[/] ({prof.id})  "
            f"딜레이: [bold]{effective_delay}s[/]"
        )

    watcher = FolderWatcher(config, delay=effective_delay, exclude_patterns=effective_exclude)

    if _json_mode:
        # JSON 모드: NDJSON 스트림으로 이벤트 출력
        print(json.dumps({"event": "started", "path": str(target)}, ensure_ascii=False), flush=True)
        watcher.start(target, daemon=daemon, json_mode=True)
        return

    console.print(f"[cyan]👁 감시 시작:[/] {target}")
    console.print("[dim]Ctrl+C로 중지[/]")
    watcher.start(target, daemon=daemon)


# ═══════════════════════════════════════════════════════════
# undo 커맨드
# ═══════════════════════════════════════════════════════════
@app.command()
def undo(
    all_ops: bool = typer.Option(False, "--all", help="모든 작업 되돌리기"),
) -> None:
    """마지막 작업 되돌리기"""
    from dsff.safety.undo import UndoManager

    manager = UndoManager()
    if all_ops:
        count = manager.undo_all()
    else:
        count = manager.undo_last()

    if _json_mode:
        msg = f"{count}개 작업 되돌리기 완료" if count > 0 else "되돌릴 작업이 없습니다."
        _json_out({"undone": count, "message": msg})

    if count > 0:
        console.print(f"[green]✓[/] {count}개 작업 되돌리기 완료")
    else:
        console.print("[yellow]되돌릴 작업이 없습니다.[/]")


# ═══════════════════════════════════════════════════════════
# config 커맨드
# ═══════════════════════════════════════════════════════════
@app.command("config")
def config_cmd(
    show: bool = typer.Option(False, "--show", "-s", help="현재 설정 출력"),
    reset: bool = typer.Option(False, "--reset", help="설정 초기화"),
    path: bool = typer.Option(False, "--path", help="설정 파일 경로 출력"),
) -> None:
    """설정 관리"""
    if path:
        console.print(str(CONFIG_FILE))
        return

    if reset:
        config = DSFolderFitConfig()
        config.save()
        console.print("[green]✓[/] 설정이 초기화되었습니다.")
        return

    if show:
        config = DSFolderFitConfig.load()
        console.print_json(config.model_dump_json(indent=2))
        return

    console.print(f"설정 파일: [bold]{CONFIG_FILE}[/]")
    console.print("  --show: 현재 설정 보기  |  --reset: 초기화  |  --path: 경로 출력")


# ═══════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════
CATEGORY_COLORS = {
    "문서": "#34d399", "이미지": "#60a5fa", "동영상": "#f472b6",
    "음악": "#f59e0b", "압축파일": "#fbbf24", "코드": "#a78bfa",
    "설치파일": "#fb923c", "폰트": "#94a3b8", "데이터": "#2dd4bf",
    "기타": "#9ca3af",
}


def _analysis_to_json(analysis) -> dict:
    """FolderAnalysis → AnalysisData JSON (TS 인터페이스 매칭)"""
    total = analysis.total_files or 1

    categories = []
    for cat, stats in sorted(analysis.category_distribution.items(), key=lambda x: x[1].count, reverse=True):
        categories.append({
            "name": cat,
            "count": stats.count,
            "size": _human_size(stats.total_size),
            "pct": round(stats.count / total * 100),
            "color": CATEGORY_COLORS.get(cat, "#9ca3af"),
        })

    sd = analysis.size_distribution
    ad = analysis.age_distribution

    age_labels = {"recent": "최근 7일", "this_month": "이번 달", "this_year": "올해", "old": "1년 이상"}
    age_dist = []
    for key, label in age_labels.items():
        count = ad.get(key, 0)
        age_dist.append({"label": label, "count": count, "pct": round(count / total * 100)})

    size_labels = {"small": "소형 (<1MB)", "medium": "중형 (1–100MB)", "large": "대형 (100MB+)"}
    size_dist = []
    for key, label in size_labels.items():
        count = sd.get(key, 0)
        size_dist.append({"label": label, "count": count, "pct": round(count / total * 100)})

    dup = analysis.duplicate_summary
    large_count = sd.get("large", 0)

    # 추천 작업을 구조화된 형태로 변환
    recommendations = []
    if dup.duplicate_files > 0:
        recommendations.append({
            "icon": "🔄",
            "text": f"중복 파일 {dup.duplicate_files}개 발견 → {_human_size(dup.wasted_size)} 절약 가능",
            "action": "중복 검사 실행",
        })
    old_count = ad.get("old", 0)
    if old_count > 20:
        recommendations.append({
            "icon": "📅",
            "text": f"1년 이상 된 파일 {old_count}개 → 정리 권장",
            "action": "오래된 파일 보기",
        })
    if large_count > 0:
        recommendations.append({
            "icon": "📦",
            "text": f"대형 파일 {large_count}개 → 외부 저장소 이동 권장",
            "action": "대형 파일 목록",
        })

    return {
        "totalFiles": analysis.total_files,
        "totalSize": _human_size(analysis.total_size),
        "duplicates": dup.duplicate_files,
        "wastedSize": _human_size(dup.wasted_size),
        "largeFiles": large_count,
        "largeSize": _human_size(sum(
            stats.total_size for cat, stats in analysis.category_distribution.items()
        ) if large_count > 0 else 0),
        "oldFiles": old_count,
        "score": analysis.health_score,
        "categories": categories,
        "ageDistribution": age_dist,
        "sizeDistribution": size_dist,
        "recommendations": recommendations,
    }


def _resolve_target(path: Optional[Path], config: DSFolderFitConfig) -> Path:
    """대상 폴더 결정: 인자 > 첫 번째 등록 폴더 > ~/Downloads"""
    if path:
        target = path.expanduser().resolve()
    elif config.folders:
        target = config.folders[0].path.expanduser().resolve()
    else:
        target = Path.home() / "Downloads"

    if not target.exists():
        console.print(f"[red]✗[/] 폴더를 찾을 수 없습니다: {target}")
        raise typer.Exit(code=1)

    return target


def _load_folder_profile(
    config: DSFolderFitConfig,
    target: Path,
    override: Optional[str] = None,
) -> ProfileData:
    """대상 폴더에 연결된 프로필을 로드한다.

    우선순위: override 인자 > 등록된 폴더의 rules_profile > "default"
    """
    if override:
        return load_profile(override)

    # 등록된 폴더 중 target과 일치하는 항목의 rules_profile 사용
    target_resolved = target.resolve()
    for folder in config.folders:
        try:
            if folder.path.expanduser().resolve() == target_resolved:
                return load_profile(folder.rules_profile)
        except Exception:
            pass

    return load_profile("default")
