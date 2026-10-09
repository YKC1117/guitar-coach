const CACHE="guitar-coach-v3-11-2-theme-export-20261010";
const ASSETS=["./","./index.html","./styles.css","./styles-v310.css","./classroom-v311.css","./classroom-theme-export.css","./styles-core.css","./app.js","./app-v310.js","./classroom-grid.js","./classroom-note-lock.js","./classroom-theme-export.js","./app-core.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))});
