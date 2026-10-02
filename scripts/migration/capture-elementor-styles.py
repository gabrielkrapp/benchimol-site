#!/usr/bin/env python3
"""Complement the immutable public capture with the CSS observed by the browser.

Only public HTTPS GETs, without authentication. The old LiteSpeed CSS was stale;
original bodies and evidence are never changed. CSS for public WXR page/template
IDs is requested at the same evidenced Elementor uploads path.
"""
import importlib.util
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("capture_source", Path(__file__).with_name("capture-source.py"))
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)

def load(name):
    return json.loads((ROOT / "data/wordpress" / (name + ".json")).read_text())

def main():
    observed = json.loads((ROOT / "docs/validation/reference/home-complete-styles.json").read_text())
    # Exclude UI styles that can be present in a previously authenticated browser.
    excluded = re.compile(r"admin|dashicons|wordfence|wp-components|preferences|block-editor|copy-delete|common\.min|theme-light|litespeed-cache/assets/css", re.I)
    urls = {u for u in observed["cssUrls"] if not excluded.search(u)}
    ids = {item["wpId"] for item in load("authenticated-public")["items"] if item["type"] in ("page", "elementor_library")}
    ids.update((257, 48, 55, 2735, 2800, 364, 3567))
    urls.update(f"{source.BASE}/wp-content/uploads/elementor/css/post-{wp_id}.css" for wp_id in ids)
    snapshot = ROOT / "docs/research/restored-2026-09-30-elementor-css"
    capture = source.Capture(snapshot, source.BASE)
    asset_map = load("asset-map")
    original_assets = load("assets")
    existing_urls = {item["originalUrl"] for item in original_assets}
    fetched = {}
    while True:
        pending = urls - set(fetched) - set(asset_map)
        if not pending:
            break
        for record in capture.batch(pending, "assets"):
            fetched[record["url"]] = record
            if record["status"] == 200 and urlsplit(record["url"]).path.endswith(".css"):
                text = capture.text(record)
                for match in source.CSS_URL.finditer(text):
                    candidate = source.public_url(match.group(2), record["finalUrl"])
                    if candidate and source.asset_candidate(candidate):
                        urls.add(candidate)
        print(f"Supplemental GET: {len(fetched)}", flush=True)
    rows = []
    for url, record in sorted(fetched.items()):
        mime = record["headers"].get("content-type", "").split(";")[0]
        local = None
        if record["status"] == 200 and record["bytes"] and not record["error"] and (mime.startswith(("image/", "font/")) or mime in ("text/css", "application/octet-stream")):
            filename = re.sub(r"[^\w.\-]", "_", Path(urlsplit(url).path).name)
            local = "/legacy-assets/elementor-restored/" + source.sha(url)[:16] + "/" + filename
            asset_map[url] = local
        rows.append({"originalUrl": url, "finalUrl": record["finalUrl"], "status": record["status"], "mimeType": mime, "bytes": record["bytes"], "sha256": record["sha256"], "uses": ["elementor-css-reconciliation"], "snapshotFile": record["file"], "error": record["error"], "localPath": local, "supplementalSnapshot": str(snapshot.relative_to(ROOT))})
    for row in rows:
        if not row["localPath"]:
            continue
        raw = (snapshot / row["snapshotFile"]).read_bytes()
        if urlsplit(row["originalUrl"]).path.endswith(".css"):
            css = raw.decode("utf8", errors="replace")
            def replace(match):
                resolved = source.public_url(match.group(2), row["finalUrl"])
                return "url(" + match.group(1) + asset_map[resolved] + match.group(1) + ")" if resolved in asset_map else match.group(0)
            raw = source.CSS_URL.sub(replace, css).encode()
        destination = ROOT / "public" / row["localPath"].lstrip("/")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and destination.read_bytes() != raw:
            raise SystemExit("Refusing to overwrite a changed supplemental asset")
        destination.write_bytes(raw)
        row.update(localSha256=source.sha(raw), localBytes=len(raw))
    source.write_json(ROOT / "data/wordpress/asset-map.json", asset_map)
    source.write_json(ROOT / "data/wordpress/assets.json", original_assets + [row for row in rows if row["originalUrl"] not in existing_urls])
    css_urls = [u for u in observed["cssUrls"] if not excluded.search(u) and u in asset_map]
    shared = [asset_map[u] for u in css_urls if not re.search(r"/post-\d+\.css", u)]
    shared += [asset_map[u] for wp_id in (257, 48, 55, 2800, 364, 3567) for u in [f"{source.BASE}/wp-content/uploads/elementor/css/post-{wp_id}.css"] if u in asset_map]
    def extend(paths, added):
        return list(dict.fromkeys(paths + added))
    pages = load("pages")
    for page in pages:
        own = asset_map.get(f"{source.BASE}/wp-content/uploads/elementor/css/post-{page['wpId']}.css")
        page["cssPaths"] = extend(page.get("cssPaths", []), shared + ([own] if own else []))
    source.write_json(ROOT / "data/wordpress/pages.json", pages)
    site = load("site")
    site["homeCssPaths"] = extend(site.get("homeCssPaths", []), [asset_map[u] for u in css_urls] + shared + [asset_map[f"{source.BASE}/wp-content/uploads/elementor/css/post-2735.css"]])
    site["homeInlineStyles"] = extend(site.get("homeInlineStyles", []), [s["text"] for s in observed["inlineStyles"] if not excluded.search(s["id"])])
    source.write_json(ROOT / "data/wordpress/site.json", site)
    source.write_json(ROOT / "data/wordpress/elementor-shared-styles.json", shared)
    source.write_json(snapshot / "manifest.json", {"source": "public Elementor CSS reconciliation from observed browser links and public WXR IDs", "capturedAt": source.datetime.now(source.timezone.utc).isoformat(), "assets": rows, "sharedCssPaths": shared, "observedHomeCssUrls": css_urls})
    print(json.dumps({"saved": sum(bool(row["localPath"]) for row in rows), "missingCssIds": [i for i in sorted(ids) if f"{source.BASE}/wp-content/uploads/elementor/css/post-{i}.css" not in asset_map], "shared": len(shared)}))

if __name__ == "__main__":
    main()
