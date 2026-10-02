import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("capture_source", Path(__file__).resolve().parents[1] / "capture-source.py")
capture_source = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(capture_source)


class CaptureSourceTests(unittest.TestCase):
    def test_public_url_rejects_non_public_targets_and_credentials(self):
        for url in ("javascript:alert(1)", "data:image/png;base64,x", "https://localhost/a", "https://127.0.0.1/a", "https://[::1]/a", "https://a:b@example.org/a", "https://example.local/a"):
            self.assertIsNone(capture_source.public_url(url, capture_source.BASE), url)
        self.assertEqual(capture_source.public_url("/exames/#mapa", capture_source.BASE), capture_source.BASE + "/exames/")

    def test_parser_preserves_elementor_fragments_and_menu_order(self):
        source = '<body class="home"><div data-elementor-type="header" data-elementor-id="2800"><nav><a href="/a/">A</a><a href="/b/">B <strong>nested</strong></a></nav></div><div data-elementor-type="wp-page" data-elementor-id="2735"><h1>Clínica</h1></div></body>'
        document = capture_source.Document(source)
        self.assertEqual([x["text"] for x in document.links], ["A", "B nested"])
        self.assertTrue(all(x["nav"] for x in document.links))
        self.assertEqual(next(x["html"] for x in document.fragments if x["kind"] == "header"), source[source.index('<div'):source.index('</div>') + 6])
        self.assertEqual(document.headings, [{"tag": "h1", "text": "Clínica"}])

    def test_parser_collects_preloaded_css_srcset_and_backgrounds(self):
        document = capture_source.Document('<link rel="preload" as="style" href="layout.css"><img src="photo.jpg" data-src="lazy.webp" srcset="small.jpg 400w, big.jpg 800w"><div style="background:url(bg.png)"></div><style>.a{background:url(extra.svg)}</style><script src="legacy.js">ignored()</script>')
        self.assertEqual([x["url"] for x in document.assets], ["layout.css", "photo.jpg", "lazy.webp", "small.jpg", "big.jpg", "bg.png"])
        self.assertEqual(document.styles, [".a{background:url(extra.svg)}"])
        self.assertEqual(document.scripts, ["legacy.js"])

    def test_sanitizer_removes_executable_code_without_discarding_text(self):
        source = '<p onclick="bad()">Texto &amp; corpo<script>bad()</script><a href="javascript:bad()">link</a><img src="https://example.org/a.jpg" onerror="bad()"><iframe src="https://www.youtube.com/embed/id" srcdoc="bad"></iframe></p>'
        clean = capture_source.sanitize(source, lambda value: value.replace("https://example.org/a.jpg", "/a.jpg"))
        self.assertIn('Texto &amp; corpo', clean)
        self.assertIn('<img src="/a.jpg">', clean)
        self.assertIn('https://www.youtube.com/embed/id', clean)
        for blocked in ("script", "onclick", "onerror", "javascript:", "srcdoc", "bad()"):
            self.assertNotIn(blocked, clean)

    def test_content_collision_is_preserved_by_wordpress_id(self):
        common = {"slug": "cirurgia-refrativa", "link": capture_source.BASE + "/cirurgia-refrativa/", "title": {"rendered": "Cirurgia"}, "content": {"rendered": "<p>original</p>"}}
        post = capture_source.normalize_content({**common, "id": 34}, "posts", lambda x: x)
        page = capture_source.normalize_content({**common, "id": 3216}, "pages", lambda x: x)
        self.assertNotEqual(post["wpId"], page["wpId"])
        self.assertEqual(post["path"], page["path"])
        self.assertEqual(post["contentHtml"], "<p>original</p>")
        self.assertEqual(post["sourceContentSha256"], capture_source.sha("<p>original</p>"))

    def test_fetch_uses_get_argv_and_redacts_response_cookies(self):
        with tempfile.TemporaryDirectory() as directory:
            collector = capture_source.Capture(Path(directory), capture_source.BASE)
            def fake_run(argv, **kwargs):
                Path(argv[argv.index("-o") + 1]).write_text("public evidence")
                Path(argv[argv.index("-D") + 1]).write_text("HTTP/2 200\nContent-Type: text/html\nSet-Cookie: session=never-persist\nX-WP-Total: 154\n")
                class Result:
                    stdout = "200\n" + capture_source.BASE + "/"
                    stderr = ""
                self.assertNotIn("--data", argv)
                self.assertNotIn("--cookie", argv)
                self.assertNotIn("--user", argv)
                self.assertNotIn("shell", kwargs)
                return Result()
            with patch.object(capture_source.subprocess, "run", fake_run):
                record = collector.fetch(capture_source.BASE + "/", "html")
            self.assertEqual(record["status"], 200)
            self.assertEqual(record["sha256"], capture_source.sha("public evidence"))
            self.assertEqual(record["headers"]["x-wp-total"], "154")
            self.assertNotIn("never-persist", "".join(p.read_text() for p in Path(directory).rglob("*.headers")))
            with patch.object(capture_source.subprocess, "run", side_effect=AssertionError("offline cannot fetch")):
                offline = capture_source.Capture(Path(directory), capture_source.BASE, offline=True)
                self.assertEqual(offline.fetch(capture_source.BASE + "/", "html")["sha256"], record["sha256"])
                self.assertEqual(offline.fetch(capture_source.BASE + "/missing/", "html")["status"], 0)


if __name__ == "__main__": unittest.main()
