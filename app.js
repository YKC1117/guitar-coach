(() => {
  "use strict";
  const base=document.createElement("script");
  base.src="./app-v310.js?v=3.10.0";
  base.onload=()=>{
    ["./classroom-grid.js?v=3.11.4","./classroom-staff-guard.js?v=3.11.4","./classroom-fast-staff.js?v=3.11.4","./classroom-note-lock.js?v=3.11.4","./classroom-theme-export.js?v=3.11.4","./classroom-clean-start.js?v=3.11.4"].forEach(src=>{
      const addon=document.createElement("script");
      addon.src=src;
      addon.onerror=()=>console.error("Guitar Coach classroom enhancement failed to load:",src);
      document.head.appendChild(addon);
    });
  };
  base.onerror=()=>console.error("Guitar Coach v3.10 baseline failed to load");
  document.head.appendChild(base);
})();
