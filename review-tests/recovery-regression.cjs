const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {JSDOM}=require('jsdom');const root=path.resolve(__dirname,'..');
(async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://ykc1117.github.io/guitar-coach/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:t=>({width:t.length*12})},{get:(t,k)=>t[k]||(()=>{})});
 assert.equal(typeof w.structuredClone,'undefined');w.eval(fs.readFileSync(path.join(root,'app-core.js'),'utf8'));assert.equal(w.document.documentElement.dataset.gcCoreReady,'true');
 w.document.querySelector('[data-route="learn"]').click();assert(w.document.querySelector('#page-learn').classList.contains('active'));
 w.eval(fs.readFileSync(path.join(root,'app-v310.js'),'utf8'));assert(w.document.querySelector('#classroomNotebook'));dom.window.close();

 // Storage denial and quota failures must leave controls usable without claiming a successful save.
 for(const mode of ['denied','quota']){
  const storageDom=new JSDOM(html,{url:'https://ykc1117.github.io/guitar-coach/',runScripts:'outside-only',pretendToBeVisual:true});const sw=storageDom.window,sd=sw.document;
  sw.HTMLElement.prototype.scrollIntoView=()=>{};sw.scrollTo=()=>{};sw.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:t=>({width:12})},{get:(t,k)=>t[k]||(()=>{})});
  if(mode==='denied')sw.Storage.prototype.getItem=function(){throw new sw.DOMException('Blocked','SecurityError')};
  sw.Storage.prototype.setItem=function(){throw new sw.DOMException('Full','QuotaExceededError')};sw.Storage.prototype.removeItem=function(){throw new sw.DOMException('Blocked','SecurityError')};
  const errors=[];sw.addEventListener('error',e=>errors.push(e.message));sw.console.error=()=>{};
  for(const name of ['app-core.js','app-v310.js','classroom-grid.js','classroom-theme-export.js'])sw.eval(fs.readFileSync(path.join(root,name),'utf8'));
  assert.equal(sd.documentElement.dataset.gcCoreReady,'true');assert(sd.querySelector('#classroomNotebook'));
  sd.querySelector('[data-daily-check]').click();assert(sd.querySelector('.daily-item').classList.contains('done'));
  sd.querySelector('[data-route="learn"]').click();sd.querySelector('#newTeacherLesson').click();await new Promise(r=>setTimeout(r,20));
  sd.querySelector('[data-nb-tab="staff"]').click();sd.querySelector('[data-page-add="staff"]').click();assert(sd.querySelector('.staff-canvas'));
  sd.querySelector('[data-theme-preset="blue"]').click();assert.equal(sd.documentElement.dataset.gcTheme,'blue');
  sw.gcNotebook.flush();assert(sd.querySelector('#classroomAutoSave').textContent.includes('暫存失敗'));assert.equal(sd.querySelectorAll('#gcStorageFailure').length,1);
  sd.querySelector('[data-grid-tab]').click();sd.querySelector('[data-grid-preset="C"]').click();assert(sd.querySelector('.chordgrid-card'));assert(!sd.querySelector('#classroomAutoSave').textContent.includes('已暫存'));
  sd.querySelector('#closeTeacherForm').click();sd.querySelector('[data-route="tools"]').click();assert(sd.querySelector('#page-tools').classList.contains('active'));assert(!sd.body.classList.contains('classroom-focus'));assert.deepEqual(errors,[]);
  storageDom.window.close();
 }
 const events={},stores=new Map(),deleted=[];let offline=false;
 const mime=p=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream';
 const key=r=>typeof r==='string'?new URL(r,'https://ykc1117.github.io/guitar-coach/').href:r.url;
 const network=async req=>{if(offline)throw Error('offline');const url=new URL(key(req));const filename=path.basename(url.pathname);return new Response(fs.readFileSync(path.join(root,filename)),{headers:{'Content-Type':mime(filename)}})};
 const caches={keys:async()=>['cola-go-do-not-delete','guitar-coach-old','guitar-coach-navigation-20261010-4'],delete:async name=>{deleted.push(name);return true},open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return{addAll:async reqs=>{for(const req of reqs)store.set(key(req),await network(req))},put:async(req,res)=>store.set(key(req),res.clone()),match:async req=>store.get(key(req))?.clone()}}};
 const self={location:{href:'https://ykc1117.github.io/guitar-coach/sw.js'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self,caches,fetch:network,URL,Request,Response,console});
 let task;events.install({waitUntil:p=>task=p});await task;events.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['guitar-coach-old']);
 const fetchAsset=async(file,mode)=>{let result;const pending=[];events.fetch({request:{method:'GET',url:'https://ykc1117.github.io/guitar-coach/'+file,mode:mode||'cors'},respondWith:p=>result=p,waitUntil:p=>pending.push(p)});const response=await result;await Promise.all(pending);return response};
 offline=true;
 for(const file of ['app.js?v=old','app-core.js?v=new','app-v310.js?v=new','classroom-grid.js?v=new','classroom-theme-export.js?v=new','styles.css?v=new','classroom-theme-export.css?v=new']){const r=await fetchAsset(file);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),mime(file.split('?')[0]));assert(!(await r.text()).startsWith('<!doctype'))}
 const nav=await fetchAsset('?old=version','navigate');assert.equal(nav.status,200);assert((await nav.text()).includes('Guitar Coach'));
 const store=stores.get('guitar-coach-navigation-20261010-4');for(const k of [...store.keys()])if(new URL(k).pathname.endsWith('app-core.js'))store.delete(k);
 const missing=await fetchAsset('app-core.js?v=missing');assert.equal(missing.status,503);assert(!missing.headers.get('Content-Type').includes('html'));
 store.set('https://ykc1117.github.io/guitar-coach/app-core.js',new Response('<html>bad</html>',{headers:{'Content-Type':'text/html'}}));const poison=await fetchAsset('app-core.js?v=bad');assert.equal(poison.status,503);
 // A failed core startup must be visible, not silently advance to notebook scripts.
 const failed=new JSDOM(html,{url:'https://ykc1117.github.io/guitar-coach/',runScripts:'outside-only'});failed.window.eval(fs.readFileSync(path.join(root,'app.js'),'utf8'));const script=failed.window.document.querySelector('script[src*="app-core.js"]');assert(script);script.dispatchEvent(new failed.window.Event('load'));assert(failed.window.document.querySelector('#gcLoadFailure'));assert(!failed.window.document.querySelector('script[src*="app-v310.js"]'));failed.window.close();
 console.log('RECOVERY PASS: denied storage and quota preserve navigation, staff, grid, themes and honest save status; core without structuredClone; explicit core-before-notebook ordering; offline versioned JS/CSS; navigation fallback; missing and HTML-poisoned scripts rejected; unrelated caches preserved; visible startup failure');
})().catch(e=>{console.error(e);process.exit(1)});
