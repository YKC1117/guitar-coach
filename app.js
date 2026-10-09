(() => {
  "use strict";
  const base=document.createElement("script");
  base.src="./app-v310.js?v=3.10.0";
  base.onload=()=>{
    const addon=document.createElement("script");
    addon.src="./classroom-v311.js?v=3.11.0";
    addon.onerror=()=>console.error("Guitar Coach classroom v3.11 failed to load");
    document.head.appendChild(addon);
  };
  base.onerror=()=>console.error("Guitar Coach v3.10 baseline failed to load");
  document.head.appendChild(base);
})();
