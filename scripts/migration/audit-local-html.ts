/** Read-only HTTP audit: no browser JS, no credentials and no remote writes. */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const base = process.env.BENCHIMOL_AUDIT_ORIGIN || 'http://127.0.0.1:3000';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Localhost-only audit');
const startedAt = new Date().toISOString();
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const timeoutMs = 60_000;
const read = async(name: string) => JSON.parse(await readFile(`data/wordpress/${name}.json`,'utf8'));
const [posts,pages,decisions,routes] = await Promise.all([read('posts'),read('pages'),read('route-decisions'),read('routes')]);
const failures: {path: string;reason:string;phase?:string}[] = [];
type RedirectHop={path:string;status:number;target:string};
const results: {path:string;kind:string;status:number;title:string;bodyCharacters?:number;htmlBytes?:number;error?:string;redirects?:RedirectHop[];finalStatus?:number;finalPath?:string}[] = [];
const assets = new Set<string>();
const stylesheets = new Set<string>();
const cssAssets = new Set<string>();
const inspectedStylesheets = new Set<string>();
const externalCssReferences = new Set<string>();
const stylesheetResults: {path:string;status:number;bytes:number;urlReferences:number}[]=[];
let ignoredCssReferences=0;
const text = (node: Node | null) => (node?.textContent || '').replace(/\s+/g,' ').trim();
const canonical = (post: any) => decisions.decisions.find((d:any)=>d.wpId===post.wpId)?.publicPath || decisions.duplicates.find((d:any)=>d.wpId===post.wpId)?.canonicalPath || post.path;
const unique = new Map<string,any>(); for(const post of posts) if(!decisions.duplicates.some((d:any)=>d.wpId===post.wpId))unique.set(canonical(post),post);
const requests = [...[...unique].map(([path,post])=>({path,post,kind:'article'})),...pages.map((page:any)=>({path:page.path,page,kind:'page'}))];
const inspected=new Set(requests.map(item=>item.path));
const otherRoutes=[...new Map<string,any>(routes.filter((route:any)=>route.status===200&&!inspected.has(route.path)).map((route:any)=>[route.path,route])).values()];
let assetsAttempted=0;
let sitemapStatus:number|null=null;
let unauthenticatedAdminStatus:number|null=null;
let unauthenticatedAdminRedirects:RedirectHop[]=[];
let completed=false;

// Synchronous DOM parsing can miss Next's five-second keep-alive expiry and
// reuse a closed socket: reproduced with fetch + 6.5 seconds of CPU work.
// Fresh connections avoid that race. No retries hide a failed request.
const request=(path:string,options:RequestInit={})=>{
 const url=new URL(path,base+'/');
 if(url.origin!==new URL(base).origin||url.username||url.password)throw new Error('Refused non-local audit request');
 return fetch(url,{...options,credentials:'omit',redirect:'manual',headers:{Connection:'close'},signal:AbortSignal.timeout(timeoutMs)});
};
function localAsset(reference:string,parentPath:string,css=false){
 if(!reference||reference.startsWith('#')||/^(data|blob):/i.test(reference)){if(css)ignoredCssReferences+=1;return null;}
 const url=new URL(reference,new URL(parentPath,base+'/'));
 if(url.origin!==new URL(base).origin||url.username||url.password){if(css)externalCssReferences.add(url.href);return null;}
 return url.pathname+url.search;
}
function collectHtmlAssets(doc:Document,pagePath:string){
 for(const node of doc.querySelectorAll('img[src],link[rel="stylesheet"]')){
  const reference=node.getAttribute('src')||node.getAttribute('href');if(!reference)continue;
  const path=localAsset(reference,pagePath);if(!path)continue;
  assets.add(path);if(node.tagName==='LINK')stylesheets.add(path);
 }
}
// Read CSS tokens as data. Skip comments and ordinary strings so examples in
// content: "url(...)" cannot become false network requests. Decode CSS escapes
// only in actual url() tokens; never execute styles, imports or JavaScript.
function cssUrls(css:string){
 const found:string[]=[];
 const stringEnd=(start:number)=>{
  const quote=css[start];let cursor=start+1;
  while(cursor<css.length){if(css[cursor]==='\\'){cursor+=2;continue;}if(css[cursor]===quote)return cursor;cursor+=1;}
  return css.length;
 };
 const decode=(value:string)=>value.replace(/\\([\da-f]{1,6})(?:\r\n|[ \t\r\n\f])?|\\(\r\n|[\r\n\f])|\\([\s\S])/gi,(_match,hex:string|undefined,newline:string|undefined,escaped:string|undefined)=>{
  if(hex){const code=parseInt(hex,16);return code===0||code>0x10ffff||(code>=0xd800&&code<=0xdfff)?'\uFFFD':String.fromCodePoint(code);}
  return newline?'':escaped||'';
 });
 for(let index=0;index<css.length;){
  if(css[index]==='/'&&css[index+1]==='*'){const end=css.indexOf('*/',index+2);index=end<0?css.length:end+2;continue;}
  if(css[index]==='"'||css[index]==="'"){index=stringEnd(index)+1;continue;}
  if((css[index]!=='u'&&css[index]!=='U')||css.slice(index,index+4).toLowerCase()!=='url('||(index>0&&/[\w-]/.test(css[index-1]))){index+=1;continue;}
  let cursor=index+4;while(/\s/.test(css[cursor]||'')&&cursor<css.length)cursor+=1;
  let raw:string;
  if(css[cursor]==='"'||css[cursor]==="'"){
   const end=stringEnd(cursor);raw=css.slice(cursor+1,end);cursor=end+1;while(/\s/.test(css[cursor]||'')&&cursor<css.length)cursor+=1;
   if(css[cursor]!==')'){index=cursor;continue;}
  }else{
   const start=cursor;while(cursor<css.length){if(css[cursor]==='\\'){cursor+=2;continue;}if(css[cursor]===')')break;cursor+=1;}
   raw=css.slice(start,cursor).trim();
   if(cursor===css.length||/[\s"'()]/.test(raw.replace(/\\(?:[\da-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[\s\S])/gi,'x'))){index=cursor+1;continue;}
  }
  found.push(decode(raw));index=cursor+1;
 }
 return found;
}
// Follow only explicit local redirects, recording each hop. A redirect is a
// distinct URL, never a retry of a failed request. Do not follow remote targets.
async function followLocalRedirects(path:string){
 const redirects:RedirectHop[]=[];const visited=new Set<string>();let current=path;
 for(let hop=0;hop<8;hop++){
  if(visited.has(current))throw new Error(`Redirect loop at ${current}`);visited.add(current);
  const response=await request(current);const location=response.headers.get('location');
  if(![301,302,303,307,308].includes(response.status)||!location)return {response,redirects,path:current};
  const target=new URL(location,base+current);await response.arrayBuffer();
  if(target.origin!==base)throw new Error(`Refused non-local redirect to ${target.origin}`);
  const next=target.pathname+target.search;redirects.push({path:current,status:response.status,target:next});current=next;
 }
 throw new Error(`Redirect chain exceeds eight hops from ${path}`);
}
const describeError=(error:unknown)=>{
 if(!(error instanceof Error))return String(error);
 const cause=error.cause as {code?:string;message?:string}|undefined;
 return [error.message,cause?.code,cause?.message].filter(Boolean).join(': ');
};
async function checked(path:string,phase:string,operation:()=>Promise<void>){
 try{await operation();}catch(error){
  const reason=describeError(error);failures.push({path,phase,reason});console.error(`${phase} ${path}: ${reason}`);
  if(phase==='html'||phase==='captured-route')results.push({path,kind:phase==='html'?(unique.has(path)?'article':'page'):phase,status:0,title:'',error:reason});
 }
}
await mkdir('docs/validation',{recursive:true});
async function checkpoint(){
 const report={startedAt,checkedAt:new Date().toISOString(),buildId,completed,origin:base,source:'Initial HTTP HTML and referenced CSS as data, without executing JavaScript',transport:{connection:'close',timeoutMs,automaticRetries:0},articles:unique.size,pages:pages.length,htmlRequestsAttempted:results.filter(item=>item.kind==='article'||item.kind==='page').length,otherCapturedRoutes:otherRoutes.length,capturedRoutesAttempted:results.filter(item=>item.kind==='captured-route').length,stylesheetsDiscovered:stylesheets.size,stylesheetsAttempted:inspectedStylesheets.size,cssAssetsDiscovered:cssAssets.size,externalCssReferences:externalCssReferences.size,externalCssOrigins:[...new Set([...externalCssReferences].map(reference=>new URL(reference).origin))],ignoredCssReferences,stylesheetResults,assetsDiscovered:assets.size,assetsAttempted,largestHtmlBytes:Math.max(0,...results.map(item=>item.htmlBytes||0)),sitemapStatus,unauthenticatedAdminStatus,unauthenticatedAdminRedirects,failures,passed:completed&&failures.length===0,results};
 const temporary=`docs/validation/local-html.json.${process.pid}.tmp`;
 await writeFile(temporary,JSON.stringify(report,null,2)+'\n');await rename(temporary,'docs/validation/local-html.json');return report;
}
async function inspect(item:any) {
 await checked(item.path,'html',async()=>{
 const response=await request(item.path); const html=await response.text();
 // CSS rendering belongs to browser QA. Removing styles here avoids JSDOM
 // parsing modern CSS it cannot render; the original HTTP text is unchanged.
 const dom=new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
 try{
 const doc=dom.window.document;
 const fail=(reason:string)=>failures.push({path:item.path,reason});
 if(response.status!==200)fail(`HTTP ${response.status}`);
 if(doc.documentElement.lang!=='pt-BR')fail('Missing pt-BR language');
 if(!doc.querySelector('main'))fail('Missing main landmark');
 if(!doc.querySelector('h1'))fail('Missing H1');
 const maps=[...doc.querySelectorAll('footer iframe')];
 if(maps.length!==2||maps.some(map=>!/^https:\/\/maps\.google\.com\/maps\?q=/.test(map.getAttribute('src')||'')))fail('Captured footer Maps embeds missing');
 const link=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
 if(link!==`https://clinicadeolhosbenchimol.com.br${item.path}`)fail(`Canonical mismatch: ${link}`);
 if(doc.querySelector('#commentform, .comment-form, #comments'))fail('Comments UI still present');
 if(!doc.querySelector('script[type="application/ld+json"]'))fail('Missing structured data');
 let bodyCharacters:number|undefined;
 if(item.post){
  for(const link of doc.querySelectorAll('.elementor-toc__body a'))if(!link.classList.contains('elementor-toc__list-item-text')||!link.parentElement?.classList.contains('elementor-toc__list-item-text-wrapper'))fail('Article index source styles structure missing');
  const actual=doc.querySelector('.public-article-body');const expectedDom=new JSDOM(item.post.contentHtml);
  try{
  const expected=expectedDom.window.document.body;
  bodyCharacters=text(actual).length;
  if(text(actual)!==text(expected))fail('Article text differs from imported body');
  const expectedImages=[...expected.querySelectorAll('img')].map(x=>x.getAttribute('src'));
  const actualImages=actual?[...actual.querySelectorAll('img')].map(x=>x.getAttribute('src')):[];
  if(JSON.stringify(expectedImages)!==JSON.stringify(actualImages))fail('Article images/order differs');
  }finally{expectedDom.window.close();}
 }
 collectHtmlAssets(doc,item.path);
 results.push({path:item.path,kind:item.kind,status:response.status,title:doc.title,bodyCharacters,htmlBytes:Buffer.byteLength(html)});
 }finally{dom.window.close();}
 });
}
// Bound concurrency limits load on the local Next server.
for(let offset=0;offset<requests.length;offset+=3){await Promise.all(requests.slice(offset,offset+3).map(inspect));if(offset%30===0){console.log(`HTTP HTML: ${Math.min(offset+3,requests.length)}/${requests.length}`);await checkpoint();}}
await checkpoint();
for(let offset=0;offset<otherRoutes.length;offset+=3){await Promise.all(otherRoutes.slice(offset,offset+3).map((route:any)=>checked(route.path,'captured-route',async()=>{
 const terminal=await followLocalRedirects(route.path);const {response,redirects}=terminal;const html=await response.text();
 if(response.status===200){
  const dom=new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
  try{collectHtmlAssets(dom.window.document,terminal.path);}finally{dom.window.close();}
 }
 const expected=new URL(route.finalUrl).pathname;
 if(new URL(terminal.path,base).pathname!==expected)failures.push({path:route.path,reason:`Legacy target mismatch: ${terminal.path}; expected ${expected}`});
 if(expected!==route.path&&(redirects.length===0||redirects.some(hop=>![301,308].includes(hop.status))))failures.push({path:route.path,reason:`Legacy redirect is not permanent: ${JSON.stringify(redirects)}`});
 if(response.status!==200)failures.push({path:route.path,reason:`Captured 200 URL ends in ${response.status}`});
 results.push({path:route.path,kind:'captured-route',status:redirects[0]?.status||response.status,title:route.title,redirects,finalStatus:response.status,finalPath:terminal.path});
})));if(offset%30===0)await checkpoint();}
// Imported local CSS is queued as text too, so its fonts/backgrounds are covered.
while([...stylesheets].some(path=>!inspectedStylesheets.has(path))){
 const pending=[...stylesheets].filter(path=>!inspectedStylesheets.has(path)).slice(0,3);
 await Promise.all(pending.map(path=>checked(path,'stylesheet',async()=>{
  inspectedStylesheets.add(path);const response=await request(path);const css=await response.text();
  const references=response.status===200?cssUrls(css):[];
  stylesheetResults.push({path,status:response.status,bytes:Buffer.byteLength(css),urlReferences:references.length});
  if(response.status!==200){failures.push({path,reason:`Stylesheet HTTP ${response.status}`});return;}
  for(const reference of references){
   const target=localAsset(reference,path,true);if(!target)continue;
   assets.add(target);cssAssets.add(target);if(new URL(target,base).pathname.toLowerCase().endsWith('.css'))stylesheets.add(target);
  }
 })));
 await checkpoint();
}
const assetList=[...assets];
for(let offset=0;offset<assetList.length;offset+=6){await Promise.all(assetList.slice(offset,offset+6).map(path=>checked(path,'asset',async()=>{
 assetsAttempted+=1;const response=await request(path,{method:'HEAD'});await response.arrayBuffer();if(response.status!==200)failures.push({path,reason:`Rendered asset HTTP ${response.status}`});
})));if(offset%60===0)await checkpoint();}
await checked('/sitemap.xml','sitemap',async()=>{
 const response=await request('/sitemap.xml');sitemapStatus=response.status;const sitemap=await response.text();
 if(response.status!==200)failures.push({path:'/sitemap.xml',reason:`HTTP ${response.status}`});
 for(const path of unique.keys())if(!sitemap.includes(`https://clinicadeolhosbenchimol.com.br${path}`))failures.push({path,reason:'Missing from sitemap'});
});
await checked('/robots.txt','robots',async()=>{
 const response=await request('/robots.txt');const robots=await response.text();
 if(response.status!==200)failures.push({path:'/robots.txt',reason:`HTTP ${response.status}`});
 for(const required of ['OAI-SearchBot','GPTBot','Disallow: /admin/'])if(!robots.includes(required))failures.push({path:'/robots.txt',reason:`Missing ${required}`});
});
for(const item of decisions.decisions){if(!unique.has(item.publicPath))failures.push({path:item.publicPath,reason:'Approved alias not audited'});}
await checked('/api/admin/dashboard','admin-auth',async()=>{const terminal=await followLocalRedirects('/api/admin/dashboard');const response=terminal.response;unauthenticatedAdminStatus=response.status;unauthenticatedAdminRedirects=terminal.redirects;await response.arrayBuffer();if(![401,503].includes(response.status))failures.push({path:'/api/admin/dashboard',reason:`Unauthenticated status ${response.status}`});});
await checked('/pagina-inexistente-auditoria/','not-found',async()=>{const response=await request('/pagina-inexistente-auditoria/');await response.arrayBuffer();if(response.status!==404)failures.push({path:'/pagina-inexistente-auditoria/',reason:`Missing-page status ${response.status}`});});
completed=true;
const report=await checkpoint();
console.log(JSON.stringify({...report,results:undefined},null,2));if(failures.length)process.exitCode=1;
