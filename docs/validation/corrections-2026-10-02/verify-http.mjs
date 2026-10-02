/** Local HTTP validation. No credentials, real login, editorial mutation or server lifecycle. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
const origin='http://127.0.0.1:3000', canonical='https://clinicadeolhosbenchimol.com.br';
const posts=JSON.parse(await readFile('data/wordpress/posts.json','utf8'));
const article=posts.find(p=>p.wpId===17).path;
const output={startedAt:new Date().toISOString(),origin,scope:'User-controlled Next dev; no production score, mutation, login or cookies.',checks:[]};
const headers=['content-type','cache-control','x-content-type-options','referrer-policy','permissions-policy','content-security-policy','content-security-policy-report-only','x-robots-tag','x-frame-options','location'];
for(const [path,expected] of [['/',200],['/sobre-nos/',200],['/equipe/',200],['/exames-e-procedimentos/',200],['/blog/',200],['/blog/page/2/',200],[article,200],['/cirurgia-refrativa-artigo/',200],['/por-que-piscamos-os-olhos-artigo-2020/',200],['/robots.txt',200],['/sitemap.xml',200],['/llms.txt',200],['/corrections-path-does-not-exist-20261002/',404],['/admin/login/',200],['/admin/',307],['/api/admin/posts/',401],['/api/admin/media/',401],['/api/admin/settings/contact/',401],['/docs/context/gabriel-brain-project.md',404],['/.env.prod',404]]){
 const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(60000)}),body=await response.text();
 const item={path,expected,status:response.status,passed:response.status===expected,headers:Object.fromEntries(headers.filter(k=>response.headers.has(k)).map(k=>[k,response.headers.get(k)])),bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex')};
 if(response.headers.get('content-type')?.includes('text/html')){
  const doc=new JSDOM(body).window.document;
  item.html={title:doc.title,description:doc.querySelector('meta[name="description"]')?.getAttribute('content'),canonicals:[...doc.querySelectorAll('link[rel="canonical"]')].map(e=>e.getAttribute('href')),robots:[...doc.querySelectorAll('meta[name="robots"]')].map(e=>e.getAttribute('content')),h1Count:doc.querySelectorAll('h1').length,mainCharacters:(doc.querySelector('main')?.textContent??'').trim().length,jsonLd:[...doc.querySelectorAll('script[type="application/ld+json"]')].map(e=>{try{const d=JSON.parse(e.textContent);return {valid:true,type:d['@type'],graphTypes:d['@graph']?.map(n=>n['@type']),encodedLegacyDescription:/&(?:hellip|amp|quot|lt|gt);/.test(d.description??'')}}catch{return{valid:false}}}),styles:[...doc.querySelectorAll('link[rel="stylesheet"]')].map(e=>e.getAttribute('href')).filter(h=>h?.startsWith('/site-styles/')),preloads:[...doc.querySelectorAll('link[rel="preload"][as="image"]')].map(e=>e.getAttribute('href'))};
  if(path==='/'){item.html.reviews={controls:doc.querySelectorAll('.ti-widget .ti-read-more-active').length,dates:doc.querySelectorAll('.ti-widget .ti-date').length,lineBreaks:[...doc.querySelectorAll('.ti-widget .ti-review-item .ti-review-text')].map(e=>e.querySelectorAll('br').length)};item.passed&&=item.html.reviews.controls===5&&item.html.reviews.dates===8&&JSON.stringify(item.html.reviews.lineBreaks)===JSON.stringify([0,0,2,3,0,0,4,2]);}
  if(expected===200&&!path.startsWith('/admin')) item.passed&&=item.html.canonicals.length===1&&item.html.canonicals[0].startsWith(canonical+'/')&&item.html.robots.some(r=>r.includes('max-image-preview:large'))&&item.html.jsonLd.every(r=>r.valid&&!r.encodedLegacyDescription)&&item.html.h1Count===1;
 }
 if(path==='/robots.txt'){item.rules=body;item.passed&&=body.includes('Allow: /api/media/')&&body.includes('Disallow: /api/')&&body.includes('GPTBot');}
 if(path==='/sitemap.xml'){const d=new JSDOM(body,{contentType:'text/xml'}).window.document,loc=[...d.querySelectorAll('loc')].map(e=>e.textContent);item.sitemap={count:loc.length,allCanonical:loc.every(u=>u.startsWith(canonical+'/')),privatePaths:loc.filter(u=>/\/(admin|api|preview|docs|backups)\//.test(u))};item.passed&&=item.sitemap.allCanonical&&item.sitemap.privatePaths.length===0;}
 if(path==='/llms.txt')item.passed&&=!/\/(admin|api|preview|docs|backups)\//.test(body);
 if(path.startsWith('/admin'))item.passed&&=item.headers['x-frame-options']==='DENY'&&item.headers['content-security-policy']?.includes("frame-ancestors 'none'");
 if(!path.endsWith('.txt')&&!path.endsWith('.xml'))item.passed&&=item.headers['x-content-type-options']==='nosniff';
 output.checks.push(item);
}
const home=output.checks.find(x=>x.path==='/');
for(const path of [...home.html.styles,...home.html.preloads.filter(p=>p.startsWith('/site-images/'))]){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await response.arrayBuffer()),local=await readFile('public'+path),sha=b=>createHash('sha256').update(b).digest('hex');
 output.checks.push({path,status:response.status,passed:response.status===200&&sha(bytes)===sha(local)&&response.headers.get('cache-control')?.includes('immutable'),bytes:bytes.length,sha256:sha(bytes),sameBytesAsLocal:sha(bytes)===sha(local),cacheControl:response.headers.get('cache-control')});
}
output.finishedAt=new Date().toISOString();output.passed=output.checks.every(x=>x.passed);
await writeFile('docs/validation/corrections-2026-10-02/http.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({passed:output.passed,checks:output.checks.map(x=>({path:x.path,status:x.status,passed:x.passed})),output:'docs/validation/corrections-2026-10-02/http.json'}));
if(!output.passed)process.exitCode=1;
