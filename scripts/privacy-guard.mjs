import fs from "node:fs";

const runtimeFiles=["index.html","app.js","app-core.js","app-v310.js","user-profiles.js","local-admin.js","classroom-grid.js","classroom-theme-export.js","styles.css","styles-core.css","styles-v310.css","classroom-v311.css","classroom-theme-export.css","manifest.webmanifest","sw.js"];
const sources=Object.fromEntries(runtimeFiles.map(file=>[file,fs.readFileSync(file,"utf8")]));
const failures=[];

function add(file,rule,detail){ failures.push({file,rule,detail}); }
function has(file,rule,re){
  const m=sources[file].match(re);
  if(m) add(file,rule,m[0].slice(0,160));
}

for(const file of runtimeFiles){
  has(file,"external http(s) URL",/https?:\/\/\S+/i);
  has(file,"protocol-relative external URL",/["']\/\/[a-z0-9][^"'\s]+/i);
}

for(const file of runtimeFiles.filter(file=>file==="index.html"||file.endsWith(".js")&&file!=="sw.js")){
  has(file,"fetch() is not allowed in app code",/\bfetch\s*\(/);
  has(file,"XMLHttpRequest is not allowed",/\bXMLHttpRequest\b/);
  has(file,"WebSocket is not allowed",/\bWebSocket\s*\(/);
  has(file,"EventSource is not allowed",/\bEventSource\s*\(/);
  has(file,"sendBeacon is not allowed",/\bsendBeacon\s*\(/);
}

has("index.html","form submission is not allowed",/<form\b/i);
has("index.html","iframe embedding is not allowed",/<iframe\b/i);
has("index.html","remote script tag",/<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\//i);
has("styles.css","remote CSS import",/@import\s+(?:url\()?\s*["']?(?:https?:)?\/\//i);

const requiredCsp=[
  "Content-Security-Policy",
  "default-src 'self'",
  "connect-src 'none'",
  "script-src 'self'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "form-action 'none'"
];
for(const token of requiredCsp){
  if(!sources["index.html"].includes(token)) add("index.html","required CSP protection missing",token);
}

const sw=sources["sw.js"];
const swFetches=[...sw.matchAll(/\bfetch\s*\(([^)]*)\)/g)].map(m=>m[1].trim());
for(const arg of swFetches){
  if(arg!=="e.request") add("sw.js","unexpected service-worker fetch target",arg);
}
has("sw.js","XHR in service worker",/\bXMLHttpRequest\b/);
has("sw.js","WebSocket in service worker",/\bWebSocket\s*\(/);
has("sw.js","sendBeacon in service worker",/\bsendBeacon\s*\(/);

if(failures.length){
  console.error("\nPRIVACY GUARD: FAIL\n");
  for(const f of failures){
    console.error("- "+f.file+": "+f.rule+"\n  "+f.detail);
  }
  console.error("\nRuntime code must remain local-first. Review every network or third-party change before deployment.\n");
  process.exit(1);
}

console.log("PRIVACY GUARD: PASS");
console.log("- No external runtime URLs");
console.log("- No app-side fetch/XHR/WebSocket/EventSource/sendBeacon");
console.log("- CSP keeps connect-src disabled");
console.log("- No remote scripts, iframes, forms, or CSS imports");
console.log("- Service worker fetch is limited to fetch(e.request)");
