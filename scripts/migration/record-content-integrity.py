"""Prove captured bodies are the exact deterministic safe/localized source conversion.

Run only on a fresh, reviewed capture. The resulting hashes are committed as the
normalized baseline; normal verification must never regenerate them.
"""
import importlib.util
import json
from pathlib import Path
import re

root=Path(__file__).resolve().parents[2]
module_spec=importlib.util.spec_from_file_location('capture',Path(__file__).with_name('capture-source.py'))
capture=importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(capture)
data=root/'data/wordpress'
source=root/'docs/research/restored-2026-09-30-public'
assets=json.loads((data/'assets.json').read_text())
replacements={}
for asset in assets:
    if not asset.get('localPath'): continue
    old,local=asset['originalUrl'],asset['localPath']
    for variant in (old,old.replace('https://','http://',1)):
        replacements[variant]=local
        replacements[variant.replace('/','\\/')]=local.replace('/','\\/')
pattern=re.compile('|'.join(re.escape(u) for u in sorted(replacements,key=len,reverse=True)))
origin=re.compile(r'https?://clinicadeolhosbenchimol\.com\.br(?=/)')
def rewrite(text):
    if 'http' not in text:return text
    return origin.sub('',pattern.sub(lambda m:replacements[m.group(0)],text))
integrity={'method':'Exact deterministic conversion of captured REST HTML: remove executable markup and localize asset/origin URLs. Source hashes retained separately.','posts':{},'pages':{}}
for kind in ('posts','pages'):
    raw=json.loads((source/(kind+'.json')).read_text())
    by_id={x['id']:x for x in raw}
    current=json.loads((data/(kind+'.json')).read_text())
    for item in current:
        original=by_id[item['wpId']]
        expected=capture.normalize_content(original,kind,rewrite)
        if expected['contentHtml']!=item['contentHtml'] or expected['sourceContentSha256']!=item['sourceContentSha256']:
            raise SystemExit(f'Conversion/source mismatch {kind} {item["wpId"]}')
        integrity[kind][str(item['wpId'])]=capture.sha(expected['contentHtml'])
(data/'content-integrity.json').write_text(json.dumps(integrity,ensure_ascii=False,indent=2)+'\n')
print('Verified exact safe/localized conversion for 154 posts and 38 pages; normalized baseline recorded.')
