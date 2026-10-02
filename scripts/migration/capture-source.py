#!/usr/bin/env python3
"""Capture public WordPress source with GET only; never authenticate or execute JS.

Raw evidence stays in a new dated snapshot. Normalized public content is exported
by WordPress ID, and downloaded images/PDF/fonts/CSS have a per-URL asset map.
Uses only the Python standard library and curl. At most three requests run at once.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
from html.parser import HTMLParser
import json
import mimetypes
from pathlib import Path, PurePosixPath
import re
import subprocess
import threading
from datetime import datetime, timezone
from urllib.parse import unquote, urldefrag, urljoin, urlsplit, urlunsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://clinicadeolhosbenchimol.com.br"
SAFE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".css"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I)
CSS_IMPORT = re.compile(r"@import\s+(['\"])(.*?)\1", re.I)


def sha(data: bytes | str) -> str:
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def public_url(raw: str, base: str) -> str | None:
    raw = html.unescape(raw).strip().replace("\\/", "/")
    if not raw or raw.startswith(("#", "data:", "javascript:", "mailto:", "tel:", "blob:")):
        return None
    resolved = urldefrag(urljoin(base, raw))[0]
    p = urlsplit(resolved)
    if p.scheme not in ("https", "http") or not p.hostname or p.username or p.password:
        return None
    host = p.hostname.lower()
    # Never use content-discovered URLs to contact local services or IP literals.
    if host == "localhost" or host.endswith((".local", ".internal")) or ":" in host or re.fullmatch(r"[\d.]+", host):
        return None
    return urlunsplit(("https", p.netloc, p.path or "/", p.query, ""))


def asset_candidate(url: str) -> bool:
    p = urlsplit(url)
    return (Path(unquote(p.path)).suffix.lower() in SAFE_EXTENSIONS
            or p.hostname == "fonts.googleapis.com"
            or (p.hostname or "").endswith((".googleusercontent.com", ".gravatar.com")))


def route_candidate(url: str, base: str) -> bool:
    p, source = urlsplit(url), urlsplit(base)
    if p.hostname != source.hostname or p.query:
        return False
    if any(token in p.path for token in ("/wp-admin", "/wp-login", "/wp-json", "/wp-content", "/xmlrpc", "/feed", "/trackback")):
        return False
    return not Path(p.path).suffix or Path(p.path).suffix in (".html", ".htm")


def srcset_urls(value: str):
    return [item.strip().split()[0] for item in value.split(",") if item.strip() and not item.strip().startswith("data:")]


class Document(HTMLParser):
    """Extract useful public markup and dependencies without a browser/JS runtime."""
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.line_starts = [0]
        self.line_starts.extend(m.end() for m in re.finditer("\n", source))
        self.stack = []
        self.fragments = []
        self.links = []
        self.assets = []
        self.scripts = []
        self.styles = []
        self.forms = []
        self.iframes = []
        self.interactive = []
        self.headings = []
        self.meta = {}
        self.title = []
        self.body_attributes = {}
        self.feed(source)

    def source_offset(self):
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        node = {"tag": tag, "attrs": a, "start": self.source_offset(), "texts": []}
        if tag == "body": self.body_attributes = a
        if tag == "meta": self.meta[a.get("name", a.get("property", ""))] = a.get("content", "")
        if tag == "link" and a.get("href"):
            if "canonical" in a.get("rel", ""): self.meta["canonical"] = a["href"]
            if "stylesheet" in a.get("rel", "") or a.get("as") == "style": self.assets.append({"type": "css", "url": a["href"]})
            elif "icon" in a.get("rel", ""): self.assets.append({"type": "icon", "url": a["href"]})
        if tag == "a" and a.get("href"):
            self.links.append({"url": a["href"], "text": "", "nav": any(n["tag"] == "nav" for n in self.stack)})
            node["link_index"] = len(self.links) - 1
            if asset_candidate(a["href"]): self.assets.append({"type": "linked-file", "url": a["href"]})
        if tag == "script" and a.get("src"): self.scripts.append(a["src"])
        if tag in ("img", "source", "video", "audio"):
            for field in ("src", "data-src", "data-lazy-src", "poster"):
                if a.get(field): self.assets.append({"type": tag + ":" + field, "url": a[field], "alt": a.get("alt", "")})
            for field in ("srcset", "data-srcset", "data-lazy-srcset"):
                for url in srcset_urls(a.get(field, "")): self.assets.append({"type": "srcset", "url": url, "alt": a.get("alt", "")})
        if a.get("style"):
            for match in CSS_URL.finditer(a["style"]): self.assets.append({"type": "inline-css", "url": match.group(2)})
        if a.get("data-settings"):
            try:
                settings = json.loads(a["data-settings"])
                def walk(v):
                    if isinstance(v, dict):
                        for k, value in v.items():
                            if k == "url" and isinstance(value, str): self.assets.append({"type": "elementor-setting", "url": value})
                            else: walk(value)
                    elif isinstance(v, list):
                        for value in v: walk(value)
                walk(settings)
            except (json.JSONDecodeError, TypeError): pass
        if tag == "form": self.forms.append(a)
        if tag == "iframe": self.iframes.append(a)
        classes = a.get("class", "")
        widget = a.get("data-widget_type", "")
        if tag in ("details", "summary", "button") or a.get("role") in ("tab", "button") or any(t in classes for t in ("accordion", "carousel", "swiper", "gallery", "menu-toggle", "popup", "whatsapp")) or any(t in widget for t in ("accordion", "carousel", "slider", "gallery", "tabs", "video", "popup", "nav-menu")):
            self.interactive.append({"tag": tag, "id": a.get("id"), "class": classes, "role": a.get("role"), "widget": a.get("data-widget_type"), "settings": a.get("data-settings")})
        if tag not in VOID: self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID: self.handle_endtag(tag)

    def handle_endtag(self, tag):
        index = next((i for i in range(len(self.stack)-1, -1, -1) if self.stack[i]["tag"] == tag), None)
        if index is None: return
        nodes, self.stack = self.stack[index:], self.stack[:index]
        node = nodes[0]
        text = " ".join("".join(node["texts"]).split())
        if tag == "a" and "link_index" in node: self.links[node["link_index"]]["text"] = text
        if tag == "title": self.title.append(text)
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"): self.headings.append({"tag": tag, "text": text})
        if tag == "style": self.styles.append("".join(node["texts"]))
        a = node["attrs"]
        kind = a.get("data-elementor-type")
        if tag in ("header", "footer", "main", "body", "nav") or kind in ("header", "footer", "wp-page", "single-post") or "elementor-location-single" in a.get("class", ""):
            end = self.source.find(">", self.source_offset()) + 1
            self.fragments.append({"tag": tag, "kind": kind, "id": a.get("data-elementor-id"), "attrs": a, "html": self.source[node["start"]:end]})

    def handle_data(self, data):
        for node in self.stack: node["texts"].append(data)


class Sanitizer(HTMLParser):
    """Remove executable WP code while retaining public texts, CSS classes and embeds."""
    def __init__(self, source, rewrite):
        super().__init__(convert_charrefs=False)
        self.parts = []
        self.skip = 0
        self.rewrite = rewrite
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "object", "embed"):
            self.skip += 1
            return
        if self.skip: return
        clean = []
        for k, v in attrs:
            if k.lower().startswith("on") or k in ("srcdoc", "nonce"): continue
            if v is not None and re.match(r"\s*(javascript|vbscript):", html.unescape(v), re.I): continue
            if v is not None: v = self.rewrite(v)
            clean.append(k if v is None else f'{k}="{html.escape(v, quote=True)}"')
        self.parts.append("<" + tag + (" " + " ".join(clean) if clean else "") + ">")

    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        if tag in ("script", "object", "embed"):
            self.skip = max(0, self.skip - 1)
        elif not self.skip: self.parts.append("</" + tag + ">")
    def handle_data(self, data):
        if not self.skip: self.parts.append(self.rewrite(data))
    def handle_entityref(self, name):
        if not self.skip: self.parts.append("&" + name + ";")
    def handle_charref(self, name):
        if not self.skip: self.parts.append("&#" + name + ";")
    def result(self): return "".join(self.parts)


def sanitize(source, rewrite=lambda x: x):
    return Sanitizer(source, rewrite).result()


class Capture:
    def __init__(self, snapshot: Path, base: str, offline=False):
        self.snapshot, self.base, self.offline = snapshot, base.rstrip("/"), offline
        self.records = {}
        self.lock = threading.Lock()
        snapshot.mkdir(parents=True, exist_ok=True)

    def fetch(self, url, group="assets"):
        key = sha(url)[:20]
        folder = self.snapshot / group
        folder.mkdir(parents=True, exist_ok=True)
        body, headers, metadata = (folder / (key + ext) for ext in (".body", ".headers", ".json"))
        if metadata.exists() and body.exists():
            record = json.loads(metadata.read_text())
        elif self.offline:
            record = {"url": url, "finalUrl": url, "status": 0, "bytes": 0, "sha256": sha(b""), "file": str(body.relative_to(self.snapshot)), "error": "not cached; offline", "headers": {}}
        else:
            # Fixed argv, no shell interpolation. Public GET, no cookies or auth.
            result = subprocess.run(["curl", "-sS", "-L", "--proto", "=https", "--proto-redir", "=https", "--max-time", "35", "--max-redirs", "4", "--max-filesize", "26214400", "--user-agent", "BenchimolMigrationPublicCapture/1.0", "-D", str(headers), "-o", str(body), "-w", "%{http_code}\n%{url_effective}", url], capture_output=True, text=True)
            output = result.stdout.splitlines()
            raw = body.read_bytes() if body.exists() else b""
            raw_headers = headers.read_text(errors="replace") if headers.exists() else ""
            safe_headers = {}
            hops = []
            for line in raw_headers.splitlines():
                if line.startswith("HTTP/"):
                    hops.append({"statusLine": line})
                    safe_headers = {}
                elif ":" in line:
                    k, v = line.split(":", 1)
                    k = k.lower()
                    if k in {"content-type", "content-length", "location", "cache-control", "etag", "last-modified", "x-wp-total", "x-wp-totalpages"}:
                        safe_headers[k] = v.strip()
                        if k == "location" and hops: hops[-1]["location"] = v.strip()
            headers.write_text(json.dumps({"hops": hops, "headers": safe_headers}, ensure_ascii=False, indent=2) + "\n")
            record = {"url": url, "finalUrl": output[1] if len(output)>1 else url, "status": int(output[0]) if output and output[0].isdigit() else 0, "bytes": len(raw), "sha256": sha(raw), "file": str(body.relative_to(self.snapshot)), "error": result.stderr.strip(), "headers": safe_headers, "hops": hops, "capturedAt": datetime.now(timezone.utc).isoformat()}
            write_json(metadata, record)
        with self.lock: self.records[url] = record
        return record

    def batch(self, urls, group):
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            return list(pool.map(lambda url: self.fetch(url, group), sorted(set(urls))))

    def text(self, record):
        file = self.snapshot / record["file"]
        return file.read_text(errors="replace") if file.exists() else ""


def sitemap_locations(source):
    try: return [(node.text or "") for node in ET.fromstring(source).iter() if node.tag.endswith("loc")]
    except ET.ParseError: return []


def normalize_content(item, kind, rewrite):
    raw_content = item.get("content", {}).get("rendered", "")
    return {"wpId": item["id"], "type": kind, "slug": item["slug"], "status": item.get("status"), "originalUrl": item["link"], "path": urlsplit(item["link"]).path, "title": html.unescape(item.get("title", {}).get("rendered", "")), "titleHtml": sanitize(item.get("title", {}).get("rendered", "")), "contentHtml": sanitize(raw_content, rewrite), "excerptHtml": sanitize(item.get("excerpt", {}).get("rendered", ""), rewrite), "publishedAt": item.get("date"), "publishedAtGmt": item.get("date_gmt"), "modifiedAt": item.get("modified"), "modifiedAtGmt": item.get("modified_gmt"), "authorId": item.get("author"), "featuredMediaId": item.get("featured_media"), "categoryIds": item.get("categories", []), "tagIds": item.get("tags", []), "parentId": item.get("parent", 0), "menuOrder": item.get("menu_order", 0), "commentStatus": item.get("comment_status"), "seo": item.get("yoast_head_json", {}), "sourceContentSha256": sha(raw_content), "sourceRecordSha256": sha(json.dumps(item, sort_keys=True, ensure_ascii=False)), "sourceRawCollection": kind + ".json"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--snapshot", type=Path)
    parser.add_argument("--offline", action="store_true", help="Rebuild exports exclusively from cached public GET evidence")
    parser.add_argument("--skip-assets", action="store_true")
    parser.add_argument("--max-routes", type=int, default=700)
    parser.add_argument("--max-assets", type=int, default=6000)
    args = parser.parse_args()
    started = datetime.now(timezone.utc)
    snapshot = args.snapshot or ROOT / "docs/research" / ("restored-" + started.strftime("%Y-%m-%d-%H%M%SZ"))
    snapshot = snapshot.resolve()
    if "baseline-" in snapshot.name: raise SystemExit("Historical baseline cannot be overwritten")
    capture = Capture(snapshot, args.base, args.offline)
    print("Snapshot: " + str(snapshot), flush=True)
    initial = capture.batch([args.base + "/", args.base + "/robots.txt", args.base + "/sitemap_index.xml", args.base + "/wp-json/"], "discovery")
    sitemap_urls = set()
    for record in initial:
        if record["url"].endswith("sitemap_index.xml"): sitemap_urls.update(sitemap_locations(capture.text(record)))
    sitemap_records = capture.batch([u for u in sitemap_urls if public_url(u, args.base)], "sitemaps")
    routes = {args.base + "/"}
    for record in sitemap_records: routes.update(sitemap_locations(capture.text(record)))
    collections, api_summary = {}, {}
    for kind in ("posts", "pages", "categories", "tags", "media", "comments", "users", "pgc_simply_gallery"):
        all_items, reported, total_pages = [], None, 1
        batch = 1
        while batch <= min(total_pages, 30):
            record = capture.fetch(args.base + "/wp-json/wp/v2/" + kind + "?per_page=100&page=" + str(batch), "api")
            try: items = json.loads(capture.text(record))
            except json.JSONDecodeError: break
            if record["status"] != 200 or not isinstance(items, list): break
            all_items.extend(items)
            reported = int(record["headers"].get("x-wp-total", len(all_items)))
            total_pages = int(record["headers"].get("x-wp-totalpages", 1))
            batch += 1
        unique = {item["id"]: item for item in all_items}
        # API offset pagination can skip records when the upstream query order is
        # unstable. An independent ID-ascending pass makes this measurable.
        if reported is not None and len(unique) != reported:
            for page in range(1, min(total_pages, 30)+1):
                record = capture.fetch(args.base + "/wp-json/wp/v2/" + kind + "?per_page=100&page=" + str(page) + "&orderby=id&order=asc", "api")
                try: extra = json.loads(capture.text(record))
                except json.JSONDecodeError: continue
                if record["status"] == 200 and isinstance(extra, list):
                    for item in extra: unique[item["id"]] = item
        collections[kind] = sorted(unique.values(), key=lambda item: item["id"])
        write_json(snapshot / (kind + ".json"), collections[kind])
        api_summary[kind] = {"reportedTotal": reported, "capturedCount": len(unique), "unreconciledCount": None if reported is None else reported-len(unique)}
        if kind in ("posts", "pages", "categories", "tags"): routes.update(item["link"] for item in all_items if item.get("link"))
        print(kind + ": " + str(len(unique)) + "/" + str(reported), flush=True)
    # Preserve useful aliases/URLs already evidenced in the historical public capture.
    historical = ROOT / "docs/research/baseline-2026-09-30/routes.json"
    if historical.exists(): routes.update(item["url"] for item in json.loads(historical.read_text()))
    pages, documents, discovered_assets, skipped_assets = {}, {}, {}, {}
    def discover_asset(raw, origin, usage):
        url = public_url(raw, origin)
        if not url: return
        if asset_candidate(url): discovered_assets.setdefault(url, set()).add(usage)
        else: skipped_assets.setdefault(url, set()).add(usage)
    for kind in ("posts", "pages", "pgc_simply_gallery"):
        for item in collections[kind]:
            doc = Document(item.get("content", {}).get("rendered", ""))
            for asset in doc.assets: discover_asset(asset["url"], item["link"], kind + ":" + str(item["id"]))
    for media in collections["media"]:
        discover_asset(media.get("source_url", ""), args.base, "media:" + str(media["id"]))
    visited = set()
    while True:
        pending = sorted({u for raw in routes if (u := public_url(raw, args.base)) and route_candidate(u, args.base)} - visited)
        if not pending: break
        if len(visited) + len(pending) > args.max_routes: raise SystemExit("Route limit exceeded; increase only after scope review")
        records = capture.batch(pending, "html")
        for record in records:
            visited.add(record["url"])
            doc = Document(capture.text(record))
            documents[record["url"]] = doc
            pages[record["url"]] = {"url": record["url"], "path": urlsplit(record["url"]).path, "finalUrl": record["finalUrl"], "status": record["status"], "sha256": record["sha256"], "file": record["file"], "title": " ".join(doc.title), "meta": doc.meta, "headings": doc.headings, "bodyAttributes": doc.body_attributes, "links": doc.links, "forms": doc.forms, "iframes": doc.iframes, "interactive": doc.interactive, "scriptsObservedNotExecuted": doc.scripts, "cssUrls": []}
            for link in doc.links:
                url = public_url(link["url"], record["finalUrl"])
                if url and route_candidate(url, args.base): routes.add(url)
            for asset in doc.assets:
                discover_asset(asset["url"], record["finalUrl"], record["url"])
                if asset["type"] == "css":
                    css = public_url(asset["url"], record["finalUrl"])
                    if css: pages[record["url"]]["cssUrls"].append(css)
            for css in doc.styles:
                for match in CSS_URL.finditer(css): discover_asset(match.group(2), record["finalUrl"], record["url"] + ":inline-css")
        print("HTML routes: " + str(len(visited)), flush=True)
    fetched_assets = {}
    if not args.skip_assets:
        while True:
            pending = set(discovered_assets) - set(fetched_assets)
            if not pending: break
            if len(discovered_assets) > args.max_assets: raise SystemExit("Asset limit exceeded; increase only after scope review")
            for record in capture.batch(pending, "assets"):
                fetched_assets[record["url"]] = record
                mime = record["headers"].get("content-type", "").split(";")[0]
                if record["status"] == 200 and (mime == "text/css" or urlsplit(record["url"]).path.endswith(".css")):
                    css = capture.text(record)
                    for match in CSS_URL.finditer(css): discover_asset(match.group(2), record["finalUrl"], record["url"])
                    for match in CSS_IMPORT.finditer(css): discover_asset(match.group(2), record["finalUrl"], record["url"])
            print("Assets GET: " + str(len(fetched_assets)), flush=True)
    asset_map, assets, destinations = {}, [], {}
    for url, record in sorted(fetched_assets.items()):
        mime = record["headers"].get("content-type", "").split(";")[0]
        row = {"originalUrl": url, "finalUrl": record["finalUrl"], "status": record["status"], "mimeType": mime, "bytes": record["bytes"], "sha256": record["sha256"], "uses": sorted(discovered_assets[url]), "snapshotFile": record["file"], "error": record["error"], "localPath": None}
        if record["status"] == 200 and record["bytes"] and not record["error"] and (mime.startswith(("image/", "font/")) or mime in ("text/css", "application/pdf", "application/font-woff", "application/vnd.ms-fontobject", "application/x-font-ttf", "application/x-font-woff", "application/octet-stream")):
            p = urlsplit(url)
            decoded = unquote(p.path)
            safe_path = PurePosixPath(decoded)
            preserved = p.hostname == urlsplit(args.base).hostname and decoded.startswith("/wp-content/uploads/") and ".." not in safe_path.parts and "\\" not in decoded
            if preserved: local = decoded
            else:
                filename = re.sub(r"[^\w.\-]", "_", safe_path.name) or ("stylesheet.css" if mime == "text/css" else "asset")
                if Path(filename).suffix.lower() not in SAFE_EXTENSIONS:
                    filename += mimetypes.guess_extension(mime) or ""
                local = "/legacy-assets/" + (p.hostname or "external") + "/" + sha(url)[:16] + "/" + filename
            if local in destinations and destinations[local] != record["sha256"]:
                local = "/legacy-assets/query-variants/" + sha(url)[:16] + "/" + safe_path.name
            destinations[local] = record["sha256"]
            asset_map[url] = local
            row["localPath"] = local
            row["originalHashBeforeCssRewrite"] = record["sha256"]
        assets.append(row)
    replacements = {}
    for old, local in asset_map.items():
        for variant in (old, old.replace("https://", "http://", 1)):
            replacements[variant] = local
            replacements[variant.replace("/", "\\/")] = local.replace("/", "\\/")
    # Longest first preserves query-version variants. Build once, rather than
    # scanning every asset for each HTML attribute (including plain classes).
    replacement_pattern = re.compile("|".join(re.escape(u) for u in sorted(replacements, key=len, reverse=True))) if replacements else None
    source_pattern = re.compile(r"https?://" + re.escape(urlsplit(args.base).hostname or "") + r"(?=/)")
    def rewrite(value):
        if "http" not in value: return value
        if replacement_pattern: value = replacement_pattern.sub(lambda match: replacements[match.group(0)], value)
        return source_pattern.sub("", value)
    for row in assets:
        if not row["localPath"]: continue
        raw = (snapshot / row["snapshotFile"]).read_bytes()
        if row["mimeType"] == "text/css" or urlsplit(row["originalUrl"]).path.endswith(".css"):
            css = raw.decode("utf-8", errors="replace")
            def replace_css(match):
                resolved = public_url(match.group(2), row["finalUrl"])
                return "url(" + match.group(1) + asset_map[resolved] + match.group(1) + ")" if resolved in asset_map else match.group(0)
            css = CSS_URL.sub(replace_css, css)
            css = CSS_IMPORT.sub(lambda match: "@import " + match.group(1) + asset_map.get(public_url(match.group(2), row["finalUrl"]), match.group(2)) + match.group(1), css)
            raw = css.encode()
        destination = ROOT / "public" / row["localPath"].lstrip("/")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and sha(destination.read_bytes()) != sha(raw):
            raise SystemExit("Refusing to overwrite a different existing local asset: " + str(destination))
        destination.write_bytes(raw)
        row["localSha256"] = sha(raw)
        row["localBytes"] = len(raw)
    exported = ROOT / "data/wordpress"
    for kind in ("posts", "pages"):
        normalized = [normalize_content(item, kind, rewrite) for item in collections[kind]]
        if kind == "pages":
            for item in normalized:
                doc = documents.get(item["originalUrl"])
                if not doc and item["wpId"] == 2735: doc = documents.get(args.base + "/")
                if doc:
                    fragment = next((x["html"] for x in doc.fragments if x["id"] == str(item["wpId"])), None)
                    if fragment: item["renderedHtml"] = sanitize(fragment, rewrite)
                    item["inlineStyles"] = [rewrite(style) for style in doc.styles]
                    item["bodyClasses"] = doc.body_attributes.get("class", "")
                    item["cssPaths"] = [asset_map.get(u, u) for u in pages.get(item["originalUrl"], pages.get(args.base+"/", {})).get("cssUrls", [])]
        write_json(exported / (kind + ".json"), normalized)
    for kind in ("categories", "tags"):
        write_json(exported / (kind + ".json"), [{"wpId": item["id"], "name": html.unescape(item["name"]), "slug": item["slug"], "descriptionHtml": sanitize(item.get("description", "")), "count": item["count"], "originalUrl": item["link"], "path": urlsplit(item["link"]).path, "parentId": item.get("parent", 0), "seo": item.get("yoast_head_json", {})} for item in collections[kind]])
    write_json(exported / "media.json", [{"wpId": item["id"], "originalUrl": item.get("source_url"), "localPath": asset_map.get(public_url(item.get("source_url", ""), args.base)), "title": html.unescape(item.get("title", {}).get("rendered", "")), "alt": item.get("alt_text", ""), "captionHtml": sanitize(item.get("caption", {}).get("rendered", "")), "descriptionHtml": sanitize(item.get("description", {}).get("rendered", "")), "mimeType": item.get("mime_type"), "mediaType": item.get("media_type"), "parentWpId": item.get("post"), "details": item.get("media_details", {})} for item in collections["media"]])
    # Gabriel explicitly removed comments from the new application. Public REST
    # comments remain historical research evidence only, outside product exports.
    obsolete_comments = exported / "comments.json"
    if obsolete_comments.exists(): obsolete_comments.unlink()
    write_json(exported / "authors.json", [{"wpId": item["id"], "name": item.get("name"), "slug": item.get("slug"), "originalUrl": item.get("link"), "description": item.get("description", "")} for item in collections["users"]])
    write_json(exported / "galleries.json", [normalize_content(item, "pgc_simply_gallery", rewrite) for item in collections["pgc_simply_gallery"]])
    candidates = {}
    for kind in ("posts", "pages"):
        for item in collections[kind]: candidates.setdefault(urlsplit(item["link"]).path, []).append({"type": kind, "wpId": item["id"], "slug": item["slug"]})
    route_export = []
    for url, page in sorted(pages.items()):
        route_export.append({**page, "cssPaths": [asset_map.get(u, u) for u in page["cssUrls"]], "sourceCandidates": candidates.get(page["path"], []), "needsCollisionDecision": len(candidates.get(page["path"], [])) > 1})
    home_doc = documents.get(args.base + "/")
    site = {"source": args.base, "snapshot": str(snapshot.relative_to(ROOT)), "capturedAt": started.isoformat(), "routeCandidates": candidates, "collisions": {path: items for path, items in candidates.items() if len(items)>1}, "menu": [link for link in home_doc.links if link["nav"]] if home_doc else [], "menus": [{"attributes": fragment["attrs"], "html": sanitize(fragment["html"], rewrite)} for fragment in home_doc.fragments if fragment["tag"] == "nav"] if home_doc else [], "headerHtml": "", "footerHtml": "", "homeHtml": "", "homeInlineStyles": [rewrite(style) for style in home_doc.styles] if home_doc else [], "homeCssPaths": [asset_map.get(u, u) for u in pages.get(args.base+"/", {}).get("cssUrls", [])], "homeBodyClasses": home_doc.body_attributes.get("class", "") if home_doc else ""}
    if home_doc:
        for kind in ("header", "footer", "wp-page"):
            fragment = next((x["html"] for x in home_doc.fragments if x["kind"] == kind), "")
            site[{"header":"headerHtml", "footer":"footerHtml", "wp-page":"homeHtml"}[kind]] = sanitize(fragment, rewrite)
    write_json(exported / "routes.json", route_export)
    write_json(exported / "site.json", site)
    write_json(exported / "assets.json", assets)
    write_json(exported / "asset-map.json", asset_map)
    write_json(snapshot / "routes.json", list(pages.values()))
    write_json(snapshot / "assets.json", assets)
    write_json(snapshot / "excluded-assets.json", [{"url": u, "uses": sorted(uses), "reason": "Not an image/PDF/font/CSS dependency; JS and video bytes are not downloaded"} for u, uses in sorted(skipped_assets.items())])
    summary = {"source": args.base, "snapshot": str(snapshot.relative_to(ROOT)), "startedAt": started.isoformat(), "completedAt": datetime.now(timezone.utc).isoformat(), "scope": "Unauthenticated public GET; no remote mutation; JS observed as data and never executed; video bytes excluded", "api": api_summary, "routes": len(pages), "assetsRequested": len(assets), "assetsSaved": sum(bool(x["localPath"]) for x in assets), "assetsBytes": sum(x.get("localBytes", 0) for x in assets), "collisions": site["collisions"], "thirdPartyHosts": sorted({urlsplit(x["originalUrl"]).hostname for x in assets if urlsplit(x["originalUrl"]).hostname != urlsplit(args.base).hostname}), "failures": [{"url": x["url"], "status": x["status"], "error": x["error"]} for x in capture.records.values() if x["status"] != 200 or x["error"]], "requests": sorted(capture.records.values(), key=lambda x: x["url"])}
    write_json(snapshot / "manifest.json", summary)
    write_json(exported / "capture-summary.json", {k:v for k,v in summary.items() if k != "requests"})
    print(json.dumps({k:v for k,v in summary.items() if k != "requests"}, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__": main()
