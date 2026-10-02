"""Inspect an existing Next build; never build, connect or publish anything."""
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[2]
manifests = sorted((root / ".next/server").rglob("*.nft.json"))
if not manifests:
    raise SystemExit("No Next build trace found. Run the local build first.")

prompt_files = {p.relative_to(root).as_posix() for p in (root / "docs/prompts").glob("*.md")}
prompt_files.add("docs/prompts/catalog.json")
files = set()
failures = []
for manifest in manifests:
    for item in json.loads(manifest.read_text())["files"]:
        path = (manifest.parent / item).resolve()
        try:
            relative = path.relative_to(root).as_posix()
        except ValueError:
            failures.append({"manifest": str(manifest.relative_to(root)), "reason": "File outside workspace"})
            continue
        files.add(relative)
        # Only compiled application, installed packages and the explicitly
        # requested prompt library belong in a server function's file trace.
        if not (relative.startswith((".next/", "node_modules/")) or relative in prompt_files):
            failures.append({"manifest": str(manifest.relative_to(root)), "path": relative,
                             "reason": "Unexpected source/private file in runtime trace"})

missing = sorted(prompt_files - files)
for path in missing:
    failures.append({"path": path, "reason": "Requested prompt library file absent from build"})

report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "buildId": (root / ".next/BUILD_ID").read_text().strip(),
          "manifests": len(manifests), "uniqueFiles": len(files),
          "promptFiles": sorted(files & prompt_files), "failures": failures, "passed": not failures,
          "scope": "Next server output file traces; public web assets are separate"}
target = root / "docs/validation/runtime-package.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if failures:
    raise SystemExit(1)
