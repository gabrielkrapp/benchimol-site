import importlib.util
from pathlib import Path
import unittest

module_spec = importlib.util.spec_from_file_location('wxr', Path(__file__).parents[1] / 'reconcile-authenticated-export.py')
wxr = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(wxr)

class AuthenticatedExportTests(unittest.TestCase):
    def test_private_content_and_comments_are_not_copied(self):
        xml = '''<rss xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
        <wp:author><wp:author_id>2</wp:author_id><wp:author_display_name>Equipe</wp:author_display_name><wp:author_email>private@example.test</wp:author_email></wp:author>
        <item><title>Public</title><content:encoded>Text</content:encoded><wp:post_id>10</wp:post_id><wp:post_type>post</wp:post_type><wp:status>publish</wp:status><wp:comment><wp:comment_content>Patient secret</wp:comment_content><wp:comment_author_email>patient@example.test</wp:comment_author_email></wp:comment><wp:postmeta><wp:meta_key>secret_token</wp:meta_key><wp:meta_value>secret</wp:meta_value></wp:postmeta></item>
        <item><title>Private attachment</title><content:encoded>Private body</content:encoded><wp:post_id>11</wp:post_id><wp:post_type>attachment</wp:post_type><wp:status>private</wp:status></item>
        </channel></rss>'''
        result = wxr.sanitized_export(xml)
        self.assertEqual([x['wpId'] for x in result['items']], [10])
        self.assertEqual(result['authors'], [{'wpId': 2, 'displayName': 'Equipe'}])
        data = str(result)
        for secret in ('Patient secret','Private body','private@example.test','patient@example.test','secret_token'):
            self.assertNotIn(secret, data)

    def test_snippets_and_non_public_pages_are_excluded(self):
        xml = '''<rss xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
        <item><title>Draft</title><wp:post_id>5</wp:post_id><wp:post_type>page</wp:post_type><wp:status>draft</wp:status><content:encoded>SECRET_DRAFT</content:encoded></item>
        <item><title>Snippet</title><wp:post_id>6</wp:post_id><wp:post_type>elementor_snippet</wp:post_type><wp:status>publish</wp:status><content:encoded>SECRET_SCRIPT</content:encoded></item>
        </channel></rss>'''
        result = wxr.sanitized_export(xml)
        self.assertEqual(result['items'], [])
        self.assertEqual(result['counts']['allItems'], 2)
        self.assertNotIn('SECRET', str(result))

if __name__ == '__main__':
    unittest.main()
