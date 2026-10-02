#!/usr/bin/env python3
"""Read-only public WordPress discovery. Never authenticates or writes remotely.

Run only when a fresh source snapshot is needed. Stores raw HTML/API/XML locally;
does not download images/video or crawl third-party services.
"""
import concurrent.futures
import hashlib
import html
import json
import pathlib
import subprocess
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser

BASE = "https://clinicadeolhosbenchimol.com.br"
ROOT = pathlib.Path(__file__).resolve().parents[1] / "docs/research/baseline-2026-09-30"
ROOT.mkdir(parents=True, exist_ok=True)

def capture(url, group):
    target = ROOT / group
    target.mkdir(exist_ok=True)
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    body_path, header_path = target / (key + ".body"), target / (key + ".headers")
    p = subprocess.run(["curl", "-sS", "-L", "--max-time", "30", "--max-redirs", "4",
                        "-D", str(header_path), "-o", str(body_path),
                        "-w", "%{http_code}\n%{url_effective}", url], capture_output=True, text=True)
    lines = p.stdout.splitlines()
    raw = body_path.read_bytes() if body_path.exists() else b""
    headers = header_path.read_text(errors="replace") if header_path.exists() else ""
    return {"url": url, "status": int(lines[0]) if lines and lines[0].isdigit() else 0,
            "final_url": lines[1] if len(lines) > 1 else url, "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(), "file": str(body_path.relative_to(ROOT)),
            "error": p.stderr.strip(), "headers": headers, "text": raw.decode("utf-8", errors="replace")}

def write(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.assets=[]; self.meta={}; self.title=[]
        self.title_open=False; self.headings=[]; self.heading=None; self.heading_text=[]
        self.forms=[]; self.iframe=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "link" and a.get("href"):
            if "canonical" in a.get("rel", ""): self.meta["canonical"] = a["href"]
            if "stylesheet" in a.get("rel", ""): self.assets.append({"type":"css","url":a["href"]})
        if tag in ("img", "script", "source", "video"):
            for field in ("src", "data-src", "poster"):
                if a.get(field): self.assets.append({"type":tag,"url":a[field],"alt":a.get("alt", "")})
            if a.get("srcset"): self.assets.append({"type":"srcset","url":a["srcset"]})
        if tag == "meta": self.meta[a.get("name", a.get("property", ""))] = a.get("content", "")
        if tag == "title": self.title_open=True
        if tag in ("h1", "h2", "h3"): self.heading=tag; self.heading_text=[]
        if tag == "form": self.forms.append(a)
        if tag == "iframe": self.iframe.append(a)
    def handle_endtag(self, tag):
        if tag == "title": self.title_open=False
        if tag == self.heading:
            self.headings.append({"tag":tag,"text":" ".join("".join(self.heading_text).split())}); self.heading=None
    def handle_data(self, data):
        if self.title_open: self.title.append(data)
        if self.heading: self.heading_text.append(data)

records=[]
initial=[BASE+"/", BASE+"/robots.txt", BASE+"/sitemap_index.xml", BASE+"/wp-json/"]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    records.extend(pool.map(lambda u:capture(u,"discovery"), initial))
routes={BASE+"/"}; sitemaps=[]
for r in records:
    if r["url"].endswith("sitemap_index.xml") and r["status"]==200:
        try: sitemaps=[x.text for x in ET.fromstring(r["text"]).iter() if x.tag.endswith("loc")]
        except ET.ParseError: pass
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    sitemap_records=list(pool.map(lambda u:capture(u,"sitemaps"), sitemaps))
records.extend(sitemap_records)
for r in sitemap_records:
    try: routes.update(x.text for x in ET.fromstring(r["text"]).iter() if x.tag.endswith("loc"))
    except ET.ParseError: pass

api_summary={}
for kind in ("posts", "pages", "categories", "tags", "media"):
    all_items=[]; batch=1; expected=None
    while batch <= 15:
        r=capture(BASE+"/wp-json/wp/v2/"+kind+"?per_page=100&page="+str(batch), "api")
        records.append(r)
        try: items=json.loads(r["text"])
        except json.JSONDecodeError: break
        if r["status"]!=200 or not isinstance(items,list): break
        all_items.extend(items)
        h={}
        for line in r["headers"].splitlines():
            if ":" in line:
                k,v=line.split(":",1); h[k.lower()]=v.strip()
        if "x-wp-total" in h: expected=int(h["x-wp-total"])
        total_pages=int(h.get("x-wp-totalpages","1"))
        if batch >= total_pages: break
        batch+=1
    api_summary[kind]={"reported_total":expected,"captured_count":len(all_items),"pages_requested":batch}
    write(kind+".json",all_items)
    if kind in ("posts","pages","categories","tags"):
        routes.update(x.get("link") for x in all_items if x.get("link"))

home=next(r for r in records if r["url"]==BASE+"/")
hp=PageParser(); hp.feed(home["text"])
routes.update(urllib.parse.urljoin(BASE+"/",u).split("#")[0] for u in hp.links)
routes=sorted(u for u in routes if u and urllib.parse.urlsplit(u).netloc==urllib.parse.urlsplit(BASE).netloc
              and not any(x in u for x in ("/wp-admin", "/wp-json", "/wp-content", "/wp-login", "?")))
if len(routes)>300: raise SystemExit("More than 300 routes; manual scope review required")
pages=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    page_records=list(pool.map(lambda u:capture(u,"html"),routes))
records.extend(page_records)
css=set()
for r in page_records:
    parser=PageParser(); parser.feed(r["text"])
    pages.append({"url":r["url"],"final_url":r["final_url"],"status":r["status"],
                  "title":"".join(parser.title),"meta":parser.meta,"headings":parser.headings,
                  "links":sorted(set(parser.links)),"assets":parser.assets,"forms":parser.forms,"iframes":parser.iframe})
    css.update(urllib.parse.urljoin(r["final_url"],a["url"]) for a in parser.assets if a["type"]=="css")
css=sorted(u for u in css if urllib.parse.urlsplit(u).netloc==urllib.parse.urlsplit(BASE).netloc)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    css_records=list(pool.map(lambda u:capture(u,"css"),css[:80]))
records.extend(css_records)
write("routes.json", pages)
write("manifest.json", {"captured_at_utc":datetime.now(timezone.utc).isoformat(),"source":BASE,
      "scope":"Public GET only, no login. CSS captured; image/video bytes not downloaded.",
      "api":api_summary,"route_count":len(pages),"css_count":len(css_records),
      "requests":[{k:v for k,v in r.items() if k not in ("text","headers")} for r in records]})
print(json.dumps({"api":api_summary,"routes":len(pages),"css":len(css_records),
                 "failed":[{"url":r["url"],"status":r["status"],"error":r["error"]} for r in records if r["status"]!=200]},ensure_ascii=False))
