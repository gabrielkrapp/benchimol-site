"""Extract only approved public content from a local WXR; never copy the WXR itself."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'wp': 'http://wordpress.org/export/1.2/', 'content': 'http://purl.org/rss/1.0/modules/content/', 'dc': 'http://purl.org/dc/elements/1.1/'}
PUBLIC_TYPES = {'post', 'page', 'attachment', 'elementor_library', 'nav_menu_item', 'pgc_simply_gallery', 'custom_css', 'popup', 'popup_theme', 'wp_global_styles'}
META_KEYS = {'_elementor_data', '_elementor_page_settings', '_elementor_template_type', '_elementor_css', '_wp_attached_file', '_thumbnail_id', '_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_canonical', '_menu_item_type', '_menu_item_menu_item_parent', '_menu_item_object_id', '_menu_item_object', '_menu_item_target', '_menu_item_classes', '_menu_item_xfn', '_menu_item_url'}

def value(node, name):
    return node.findtext(name, '', NS)

def sanitized_export(xml):
    channel = ET.fromstring(xml).find('channel')
    if channel is None:
        raise ValueError('Missing WXR channel')
    nodes = channel.findall('item')
    types = Counter(value(x, 'wp:post_type') for x in nodes)
    statuses = Counter(value(x, 'wp:status') for x in nodes)
    authors = [{'wpId': int(value(a,'wp:author_id')), 'displayName': value(a,'wp:author_display_name')} for a in channel.findall('wp:author', NS)]
    items = []
    for node in nodes:
        kind, status = value(node,'wp:post_type'), value(node,'wp:status')
        if kind not in PUBLIC_TYPES or status not in ('publish', 'inherit'):
            continue
        body = value(node,'content:encoded')
        meta = {value(m,'wp:meta_key'):value(m,'wp:meta_value') for m in node.findall('wp:postmeta', NS) if value(m,'wp:meta_key') in META_KEYS}
        items.append({'wpId': int(value(node,'wp:post_id')), 'type':kind, 'status':status, 'title':value(node,'title'), 'slug':value(node,'wp:post_name'), 'url':value(node,'link'), 'contentHtml':body, 'contentSha256':hashlib.sha256(body.encode()).hexdigest(), 'metadata':meta})
    return {'formatVersion':1, 'source':'authenticated WXR, public-only allowlist', 'counts':{'allItems':len(nodes), 'byType':dict(types), 'byStatus':dict(statuses)}, 'authors':authors, 'items':items}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('wxr', type=Path)
    parser.add_argument('--output', type=Path, default=Path('data/wordpress/authenticated-public.json'))
    args=parser.parse_args()
    result=sanitized_export(args.wxr.read_text())
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    report={'source':result['source'], 'counts':result['counts'], 'publicExtracted':len(result['items']), 'excluded':'all comments, private/draft items, author email/login/password, executable snippets and non-allowlisted metadata'}
    for kind, collection in (('post','posts'),('page','pages'),('attachment','media')):
        public=json.loads((args.output.parent/(collection+'.json')).read_text())
        public_ids={x['wpId'] for x in public}
        authenticated_ids={x['wpId'] for x in result['items'] if x['type']==kind}
        report[collection]={'publicCount':len(public_ids), 'authenticatedPublicCount':len(authenticated_ids), 'missingInPublic':sorted(authenticated_ids-public_ids), 'missingInExport':sorted(public_ids-authenticated_ids)}
    path=Path('docs/research/authenticated-reconciliation.json')
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    main()
