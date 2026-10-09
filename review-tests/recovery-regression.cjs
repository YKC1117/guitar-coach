const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {JSDOM}=require('jsdom');const root=path.resolve(__dirname,'..');
(async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://ykc1117.github.io/guitar-coach/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:t=>({width:t.length*12})},{get:(t,k)=>t[k]||(()=>{})});
 assert.equal(typeof w.structuredClone,'undefined');w.eval(fs.readFileSync(path.join(root,'app-core.js'),'utf8'));assert.equal(w.document.documentElement.dataset.gcCoreReady,'true');
 w.document.querySelector('[data-route="learn"]').click();assert(w.document.querySelector('#page-learn').classList.contains('active'));
 w.eval(fs.readFileSync(path.join(root,'app-v310.js'),'utf8'));assert(w.document.querySelector('#classroomNotebook'));dom.window.close();
 const events={},stores=new Map(),deleted=[];let offline=false;
 const mime=p=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream';
 const key=r=>typeof r==='string'?new URL(r,'https://ykc1117.github.io/guitar-coach/').href:r.url;
 const network=async req=>{if(offline)throw Error('offline');const url=new URL(key(req));const filename=path.basename(url.pathname);return new Response(fs.readFileSync(path.join(root,filename)),{headers:{'Content-Type':mime(filename)}})};
 const caches={keys:async()=>['cola-go-do-not-delete','guitar-coach-old','guitar-coach-recovery-20261010-2'],delete:async name=>{deleted.push(name);return true},open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return{addAll:async reqs=>{for(const req of reqs)store.set(key(req),await network(req))},put:async(req,res)=>store.set(key(req),res.clone()),match:async req=>store.get(key(req))?.clone()}}};
 const self={location:{href:'https://ykc1117.github.io/guitar-coach/sw.js'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self,caches,fetch:network,URL,Request,Response,console});
 let task;events.install({waitUntil:p=>task=p});await task;events.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['guitar-coach-old']);
 const fetchAsset=async(file,mode)=>{let result;const pending=[];events.fetch({request:{method:'GET',url:'https://ykc1117.github.io/guitar-coach/'+file,mode:mode||'cors'},respondWith:p=>result=p,waitUntil:p=>pending.push(p)});const response=await result;await Promise.all(pending);return response};
 offline=true;
 for(const file of ['app.js?v=old','app-core.js?v=new','app-v310.js?v=new','classroom-grid.js?v=new','classroom-theme-export.js?v=new','styles.css?v=new','classroom-theme-export.css?v=new']){const r=await fetchAsset(file);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),mime(file.split('?')[0]));assert(!(await r.text()).startsWith('<!doctype'))}
 const nav=await fetchAsset('?old=version','navigate');assert.equal(nav.status,200);assert((await nav.text()).includes('Guitar Coach'));
 const store=stores.get('guitar-coach-recovery-20261010-2');for(const k of [...store.keys()])if(new URL(k).pathname.endsWith('app-core.js'))store.delete(k);
 const missing=await fetchAsset('app-core.js?v=missing');assert.equal(missing.status,503);assert(!missing.headers.get('Content-Type').includes('html'));
 store.set('https://ykc1117.github.io/guitar-coach/app-core.js',new Response('<html>bad</html>',{headers:{'Content-Type':'text/html'}}));const poison=await fetchAsset('app-core.js?v=bad');assert.equal(poison.status,503);
 // A failed core startup must be visible, not silently advance to notebook scripts.
 const failed=new JSDOM(html,{url:'https://ykc1117.github.io/guitar-coach/',runScripts:'outside-only'});failed.window.eval(fs.readFileSync(path.join(root,'app.js'),'utf8'));const script=failed.window.document.querySelector('script[src*="app-core.js"]');assert(script);script.dispatchEvent(new failed.window.Event('load'));assert(failed.window.document.querySelector('#gcLoadFailure'));assert(!failed.window.document.querySelector('script[src*="app-v310.js"]'));failed.window.close();
 console.log('RECOVERY PASS: core without structuredClone; explicit core-before-notebook ordering; offline versioned JS/CSS; navigation fallback; missing and HTML-poisoned scripts rejected; unrelated caches preserved; visible startup failure');
})().catch(e=>{console.error(e);process.exit(1)});
