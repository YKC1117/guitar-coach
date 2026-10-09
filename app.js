(() => {
  "use strict";
  const RELEASE="recovery-20261010-2";
  const files=["app-core.js","app-v310.js","classroom-grid.js","classroom-theme-export.js"];
  function showFailure(){
    if(document.getElementById("gcLoadFailure"))return;
    const banner=document.createElement("section");banner.id="gcLoadFailure";banner.setAttribute("role","alert");
    const text=document.createElement("p");text.textContent="頁面尚未完整載入。請確認網路後重新載入；既有筆記不會清除。";
    const retry=document.createElement("button");retry.type="button";retry.textContent="重新載入";retry.onclick=()=>location.reload();banner.append(text,retry);document.body.prepend(banner);
  }
  // Register even when dynamic loading starts after window.load has fired.
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(e=>console.warn("Offline support unavailable",e));
  function next(){
    const file=files.shift();if(!file)return;
    const script=document.createElement("script");script.src="./"+file+"?v="+RELEASE;
    script.onload=()=>{if(file==="app-core.js"&&document.documentElement.dataset.gcCoreReady!=="true"){showFailure();return}next()};
    script.onerror=()=>{console.error("Guitar Coach script load failed:",file);showFailure()};document.head.appendChild(script);
  }
  next();
})();
