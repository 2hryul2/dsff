"""DS FolderFit — Rich 출력 포매팅"""
from __future__ import annotations

from typing import Optional, List

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.text import Text


def print_scan_result(console: Console, files, stats, verbose: bool = False) -> None:
    """스캔 결과 출력"""
    from dsff.core.scanner import FileInfo, FolderStats

    # 요약 패널
    size_display = _human_size(stats.total_size)
    summary = f"총 [bold]{stats.total_files}[/]개 파일, [bold]{size_display}[/]"
    console.print(Panel(summary, title="📊 스캔 결과", border_style="cyan"))

    # 확장자별 분포 테이블
    if stats.by_extension:
        table = Table(title="확장자별 분포", show_lines=False)
        table.add_column("확장자", style="cyan")
        table.add_column("파일 수", justify="right")

        sorted_exts = sorted(stats.by_extension.items(), key=lambda x: x[1], reverse=True)
        for ext, count in sorted_exts[:15]:
            table.add_row(ext, str(count))
        if len(sorted_exts) > 15:
            table.add_row("...", f"+{len(sorted_exts) - 15}")
        console.print(table)

    # 카테고리별 분포
    if stats.by_category:
        table = Table(title="카테고리별 분포", show_lines=False)
        table.add_column("카테고리", style="green")
        table.add_column("파일 수", justify="right")

        for cat, count in sorted(stats.by_category.items(), key=lambda x: x[1], reverse=True):
            table.add_row(cat, str(count))
        console.print(table)

    # 상세 파일 목록 (verbose)
    if verbose and files:
        table = Table(title="파일 목록", show_lines=False)
        table.add_column("파일명", max_width=40)
        table.add_column("크기", justify="right")
        table.add_column("수정일")
        table.add_column("카테고리", style="dim")

        for f in files[:50]:
            table.add_row(
                f.name[:40],
                f.size_display,
                f.modified_time.strftime("%Y-%m-%d %H:%M"),
                f.category or "—",
            )
        if len(files) > 50:
            table.add_row("...", "", "", f"+{len(files) - 50}개")
        console.print(table)


def print_analysis(console: Console, analysis, score_only: bool = False) -> None:
    """분석 리포트 출력"""
    from dsff.core.analyzer import FolderAnalysis

    # 건강도 점수
    score = analysis.health_score
    color = "green" if score >= 70 else "yellow" if score >= 40 else "red"
    score_bar = _score_bar(score)

    if score_only:
        console.print(f"[{color}]{score_bar} {score}/100[/] — {analysis.folder_path}")
        return

    # 헤더
    console.print(Panel(
        f"[bold]{analysis.folder_path}[/]\n"
        f"파일 수: {analysis.total_files}  |  총 용량: {_human_size(analysis.total_size)}\n"
        f"건강도: [{color}]{score_bar} {score}/100[/]",
        title="📊 폴더 분석 리포트",
        border_style=color,
    ))

    # 카테고리 분포 차트
    if analysis.category_distribution:
        table = Table(title="📁 카테고리 분포", show_lines=False)
        table.add_column("카테고리", style="cyan")
        table.add_column("파일 수", justify="right")
        table.add_column("용량", justify="right")
        table.add_column("비율", min_width=20)

        total = analysis.total_files or 1
        for cat, stats in sorted(analysis.category_distribution.items(), key=lambda x: x[1].count, reverse=True):
            ratio = stats.count / total
            bar = "█" * int(ratio * 20) + "░" * (20 - int(ratio * 20))
            table.add_row(cat, str(stats.count), _human_size(stats.total_size), f"[cyan]{bar}[/] {ratio:.0%}")
        console.print(table)

    # 크기 분포
    if analysis.size_distribution:
        sd = analysis.size_distribution
        console.print(f"\n📐 크기 분포: 소형(<1MB) {sd.get('small', 0)}개 | 중형(1-100MB) {sd.get('medium', 0)}개 | 대형(100MB+) {sd.get('large', 0)}개")

    # 날짜 분포
    if analysis.age_distribution:
        ad = analysis.age_distribution
        console.print(f"📅 날짜 분포: 최근 7일 {ad.get('recent', 0)}개 | 이번 달 {ad.get('this_month', 0)}개 | 올해 {ad.get('this_year', 0)}개 | 1년+ {ad.get('old', 0)}개")

    # 중복 요약
    dup = analysis.duplicate_summary
    if dup.duplicate_files > 0:
        console.print(f"\n⚠️  중복 추정: [yellow]{dup.duplicate_groups}개 그룹, {dup.duplicate_files}개 파일, {_human_size(dup.wasted_size)} 낭비[/]")

    # 추천
    if analysis.recommendations:
        console.print("\n💡 [bold]추천 작업:[/]")
        for rec in analysis.recommendations:
            console.print(f"  • {rec}")


def print_organize_preview(console: Console, plan) -> None:
    """정리 미리보기 출력"""
    if not plan.moves:
        console.print("[yellow]정리할 파일이 없습니다.[/]")
        return

    table = Table(title=f"📂 정리 미리보기 ({plan.total_moves}개 파일)", show_lines=False)
    table.add_column("파일명", max_width=35)
    table.add_column("→", style="dim")
    table.add_column("대상 폴더", style="green")
    table.add_column("분류", style="dim")

    for move in plan.moves[:30]:
        table.add_row(
            move.source.name[:35],
            "→",
            move.dest.parent.name,
            move.category,
        )
    if plan.total_moves > 30:
        table.add_row("...", "", "", f"+{plan.total_moves - 30}개")

    console.print(table)

    if plan.skipped:
        console.print(f"[dim]건너뛴 파일: {len(plan.skipped)}개[/]")


def print_rename_preview(console: Console, plans) -> None:
    """리네임 미리보기 출력"""
    if not plans:
        console.print("[yellow]리네임할 파일이 없습니다.[/]")
        return

    table = Table(title=f"✏️  리네임 미리보기 ({len(plans)}개 파일)", show_lines=False)
    table.add_column("현재 파일명", max_width=35)
    table.add_column("→", style="dim")
    table.add_column("새 파일명", style="green", max_width=40)

    for plan in plans[:30]:
        table.add_row(plan.original_name[:35], "→", plan.new_name[:40])
    if len(plans) > 30:
        table.add_row("...", "", f"+{len(plans) - 30}개")

    console.print(table)


def print_duplicates(console: Console, groups) -> None:
    """중복 파일 리포트 출력"""
    if not groups:
        console.print("[green]✓ 중복 파일이 없습니다.[/]")
        return

    total_wasted = sum(g.wasted_size for g in groups)
    console.print(Panel(
        f"[yellow]{len(groups)}[/]개 중복 그룹, [yellow]{sum(g.count for g in groups)}[/]개 파일, [red]{_human_size(total_wasted)}[/] 낭비",
        title="🔍 중복 파일 검사 결과",
        border_style="yellow",
    ))

    for i, group in enumerate(groups[:10], 1):
        console.print(f"\n[bold]그룹 {i}[/] (크기: {_human_size(group.size)}, {group.count}개):")
        for j, f in enumerate(group.files):
            marker = "[green]원본[/]" if j == 0 else "[yellow]중복[/]"
            console.print(f"  {marker} {f.path}")


def _human_size(size: int) -> str:
    """사람이 읽기 쉬운 크기"""
    try:
        import humanize
        return humanize.naturalsize(size, binary=True)
    except ImportError:
        if size < 1024:
            return f"{size} B"
        elif size < 1024 ** 2:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 ** 3:
            return f"{size / 1024**2:.1f} MB"
        return f"{size / 1024**3:.1f} GB"


def _score_bar(score: int) -> str:
    """건강도 점수 막대 그래프"""
    filled = score // 5
    empty = 20 - filled
    return "█" * filled + "░" * empty
