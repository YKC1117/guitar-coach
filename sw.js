const CACHE="guitar-coach-navigation-20261010-4";
const RELEASE="navigation-20261010-4";
const FILES=["index.html","styles.css","styles-v310.css","classroom-v311.css","classroom-theme-export.css","styles-core.css","app.js","app-core.js","app-v310.js","classroom-grid.js","classroom-theme-export.js","manifest.webmanifest","icon.svg"];
const BASE=new URL("./",self.location.href);
const ASSET_PATHS=new Set(FILES.map(name=>new URL(name,BASE).pathname));
self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const freshUrls=FILES.map(name=>{const fresh=new URL(name,BASE);fresh.searchParams.set("v",RELEASE);return fresh});
    await cache.addAll(freshUrls.map(url=>new Request(url,{cache:"reload"})));
    await Promise.all(FILES.map(async(name,index)=>{
      const canonical=new URL(name,BASE),response=await cache.match(freshUrls[index].href);
      if(!usable(response,canonical.pathname))throw new Error("Invalid offline asset: "+name);
      await cache.put(canonical.href,response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    // This origin can host other projects; only retire Guitar Coach caches.
    const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith("guitar-coach-")&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
function usable(response,path){
  if(!response||!response.ok)return false;
  const type=(response.headers.get("Content-Type")||"").toLowerCase();
  if(path.endsWith(".js"))return /(?:javascript|ecmascript)/.test(type);
  if(path.endsWith(".css"))return type.includes("text/css");
  if(path.endsWith(".html"))return type.includes("text/html");
  return true;
}
self.addEventListener("fetch",e=>{
  const request=e.request;if(request.method!=="GET")return;
  const url=new URL(request.url);if(url.origin!==BASE.origin)return;
  const navigation=request.mode==="navigate"&&url.pathname.startsWith(BASE.pathname);
  const asset=ASSET_PATHS.has(url.pathname);if(!navigation&&!asset)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(e.request);
      if(usable(response,navigation?"index.html":url.pathname)){
        const canonical=new URL(navigation?"index.html":url.pathname,BASE);
        // Cache updates must finish before a worker may be terminated.
        e.waitUntil(cache.put(canonical.href,response.clone()));return response;
      }
    }catch(e){}
    const canonical=new URL(navigation?"index.html":url.pathname,BASE);
    const cached=await cache.match(canonical.href);
    if(usable(cached,navigation?"index.html":url.pathname))return cached;
    // Never return HTML as a JavaScript or stylesheet response.
    return new Response("Offline asset unavailable",{status:503,headers:{"Content-Type":"text/plain"}});
  })());
});
