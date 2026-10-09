(() => {
  "use strict";
  const files=["app-v310.js","classroom-grid.js","classroom-theme-export.js"];
  function next(){const file=files.shift();if(!file)return;const script=document.createElement("script");script.src="./"+file+"?v=review-20261010-1";script.onload=next;script.onerror=()=>console.error("Guitar Coach script load failed:",file);document.head.appendChild(script)}
  next();
})();
