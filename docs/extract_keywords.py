import re, json

with open("webapp/src/components/views/SmartOrganizeView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

blocks = {
    "EXECUTIVE": ("임원·관리자", "#ef4444"),
    "DEVELOPER": ("개발자", "#3b82f6"),
    "INFRA": ("인프라·운영", "#10b981"),
    "SALES": ("영업·제안", "#f59e0b"),
    "PROCUREMENT": ("구매·계약", "#8b5cf6"),
}

SEP = "\\\\"

job_data = {}
for key, (label, color) in blocks.items():
    pattern_block = re.search(rf"const RULES_{key}.*?\];", content, re.DOTALL)
    if pattern_block:
        rules = re.findall(r'pattern:\s*"([^"]*)",\s*folder:\s*"([^"]+)"', pattern_block.group())
        folders = {}
        for pat, folder in rules:
            if not pat:
                continue
            fname = folder.split(SEP)[-1]
            if fname not in folders:
                folders[fname] = set()
            for kw in pat.split("|"):
                kw = re.sub(r"[\[\]\(\)\.\?\*\+\\\^]", "", kw.strip())
                if kw and len(kw) > 1:
                    folders[fname].add(kw)
        job_data[key] = {"label": label, "color": color, "folders": {k: sorted(v) for k, v in folders.items()}}

# HR
hr_block = re.search(r"function getHrRules.*?^}", content, re.DOTALL | re.MULTILINE)
if hr_block:
    rules = re.findall(r'pattern:\s*"([^"]*)",\s*folder:\s*"([^"]+)"', hr_block.group())
    folders = {}
    for pat, folder in rules:
        if not pat:
            continue
        fname = folder.split(SEP)[-1]
        if fname not in folders:
            folders[fname] = set()
        for kw in pat.split("|"):
            kw = re.sub(r"[\[\]\(\)\.\?\*\+\\\^]", "", kw.strip())
            if kw and len(kw) > 1:
                folders[fname].add(kw)
    job_data["HR"] = {"label": "HR", "color": "#ec4899", "folders": {k: sorted(v) for k, v in folders.items()}}

# Find shared keywords
all_kw_jobs = {}
for key, data in job_data.items():
    for fname, kws in data["folders"].items():
        for kw in kws:
            if kw not in all_kw_jobs:
                all_kw_jobs[kw] = set()
            all_kw_jobs[kw].add(key)

shared = {kw: sorted(jobs) for kw, jobs in all_kw_jobs.items() if len(jobs) >= 2}

result = {
    "jobs": {k: {"label": v["label"], "color": v["color"], "folders": v["folders"]} for k, v in job_data.items()},
    "shared": shared,
}

with open("docs/keyword_graph_data.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Jobs: {len(job_data)}, Shared keywords: {len(shared)}")
for k, v in job_data.items():
    total_kw = sum(len(kws) for kws in v["folders"].values())
    print(f"  {v['label']}: {len(v['folders'])} folders, {total_kw} keywords")
