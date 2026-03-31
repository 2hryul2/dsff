import json

with open("docs/keyword_graph_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

JOB_META = {
    "EXECUTIVE":   {"icon": "👔", "label": "임원·관리자"},
    "DEVELOPER":   {"icon": "💻", "label": "개발자"},
    "INFRA":       {"icon": "🖥️", "label": "인프라·운영"},
    "SALES":       {"icon": "📊", "label": "영업·제안"},
    "PROCUREMENT": {"icon": "📋", "label": "구매·계약"},
    "HR":          {"icon": "👥", "label": "HR"},
}

shared = data["shared"]
jobs = data["jobs"]

lines = []
lines.append("# DS FolderFit — 직군별 분류 키워드 전체 규칙표\n")
lines.append(f"> 자동 생성 문서 | 6개 직군 · {sum(len(j['folders']) for j in jobs.values())}개 폴더 · {sum(sum(len(kws) for kws in j['folders'].values()) for j in jobs.values())}개 키워드 · {len(shared)}개 공유 키워드\n")
lines.append("---\n")

# Summary table
lines.append("## 요약\n")
lines.append("| 직군 | 폴더 수 | 키워드 수 |")
lines.append("|------|---------|-----------|")
total_f = 0
total_k = 0
for key, meta in JOB_META.items():
    j = jobs[key]
    fc = len(j["folders"])
    kc = sum(len(kws) for kws in j["folders"].values())
    total_f += fc
    total_k += kc
    lines.append(f"| {meta['icon']} {meta['label']} | {fc} | {kc} |")
lines.append(f"| **합계** | **{total_f}** | **{total_k}** |")
lines.append("")

# Each job
for key, meta in JOB_META.items():
    j = jobs[key]
    kc = sum(len(kws) for kws in j["folders"].values())
    lines.append(f"---\n")
    lines.append(f"## {meta['icon']} {meta['label']} ({len(j['folders'])}개 폴더 · {kc}개 키워드)\n")

    for folder_name, keywords in j["folders"].items():
        shared_in_folder = [kw for kw in keywords if kw in shared]
        unique_in_folder = [kw for kw in keywords if kw not in shared]

        lines.append(f"### 📁 {folder_name} ({len(keywords)}개)\n")

        if shared_in_folder:
            lines.append(f"**공유 키워드** ({len(shared_in_folder)}개): " + ", ".join(f"`{kw}`" for kw in sorted(shared_in_folder)))
            lines.append("")

        if unique_in_folder:
            lines.append(f"**전용 키워드** ({len(unique_in_folder)}개): " + ", ".join(f"`{kw}`" for kw in sorted(unique_in_folder)))
            lines.append("")

        # Table
        lines.append("| # | 키워드 | 공유 |")
        lines.append("|---|--------|------|")
        for i, kw in enumerate(keywords, 1):
            if kw in shared:
                other_jobs = [JOB_META[jk]["icon"] + " " + JOB_META[jk]["label"] for jk in shared[kw] if jk != key]
                share_str = ", ".join(other_jobs)
            else:
                share_str = "-"
            lines.append(f"| {i} | `{kw}` | {share_str} |")
        lines.append("")

# Shared keywords section
lines.append("---\n")
lines.append(f"## 🔗 공유 키워드 ({len(shared)}개)\n")
lines.append("2개 이상 직군에서 동일하게 사용되는 키워드입니다.\n")
lines.append("| # | 키워드 | 공유 직군 수 | 직군 목록 |")
lines.append("|---|--------|-------------|-----------|")

sorted_shared = sorted(shared.items(), key=lambda x: -len(x[1]))
for i, (kw, job_keys) in enumerate(sorted_shared, 1):
    job_labels = ", ".join(JOB_META[jk]["icon"] + " " + JOB_META[jk]["label"] for jk in job_keys if jk in JOB_META)
    lines.append(f"| {i} | `{kw}` | {len(job_keys)} | {job_labels} |")

lines.append("")
lines.append("---\n")
lines.append("*이 문서는 `SmartOrganizeView.tsx`의 규칙 테이블에서 자동 추출되었습니다.*\n")

with open("docs/classification_rules.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Generated: docs/classification_rules.md ({len(lines)} lines)")
