(() => {
  "use strict";
  const chordInfo={
    Em:{play:"6 弦開始，六條都可以刷",anchor:"先放中指到 5 弦 2 品，再放無名指到 4 弦 2 品。",fingers:[[2,"中指",5,2],[3,"無名指",4,2]]},
    Am:{play:"5 弦開始刷，第 6 弦先不要碰",anchor:"先放食指到 2 弦 1 品，再把中指、無名指排到 4、3 弦 2 品。",fingers:[[1,"食指",2,1],[2,"中指",4,2],[3,"無名指",3,2]]},
    E:{play:"6 弦開始，六條都可以刷",anchor:"先放食指到 3 弦 1 品，再放中指、無名指到 5、4 弦 2 品。",fingers:[[1,"食指",3,1],[2,"中指",5,2],[3,"無名指",4,2]]},
    C:{play:"5 弦開始刷，第 6 弦不要刷",anchor:"先找無名指的 5 弦 3 品，再放中指 4 弦 2 品，最後食指 2 弦 1 品。",fingers:[[3,"無名指",5,3],[2,"中指",4,2],[1,"食指",2,1]]},
    G:{play:"6 弦開始，六條都可以刷",anchor:"先把中指放到最粗的 6 弦 3 品，再放食指到 5 弦 2 品，最後無名指到最細的 1 弦 3 品。",fingers:[[2,"中指",6,3],[1,"食指",5,2],[3,"無名指",1,3]]},
    D:{play:"4 弦開始刷，第 6、5 弦先不要刷",anchor:"三根手指都集中在細弦區；先放食指 3 弦 2 品，再放中指 1 弦 2 品，最後無名指 2 弦 3 品。",fingers:[[1,"食指",3,2],[2,"中指",1,2],[3,"無名指",2,3]]},
    Dm:{play:"4 弦開始刷，第 6、5 弦先不要刷",anchor:"先放食指到最細的 1 弦 1 品，再放中指 3 弦 2 品、無名指 2 弦 3 品。",fingers:[[1,"食指",1,1],[2,"中指",3,2],[3,"無名指",2,3]]},
    Fmaj7:{play:"4 弦開始刷，第 6、5 弦先不要刷",anchor:"它是完整 F 前很好的過渡：先放食指 2 弦 1 品，再依序補中指 3 弦 2 品、無名指 4 弦 3 品。",fingers:[[1,"食指",2,1],[2,"中指",3,2],[3,"無名指",4,3]]},
    Cadd9:{play:"5 弦開始刷，第 6 弦先不要刷",anchor:"手型接近 G。先固定高音側兩根手指，再補 5 弦 3 品與 4 弦 2 品。",fingers:[[2,"中指",5,3],[1,"食指",4,2],[3,"無名指",2,3],[4,"小指",1,3]]},
    Dsus4:{play:"4 弦開始刷，第 6、5 弦先不要刷",anchor:"先擺好 D 的核心，再把高音側手指移到 1 弦 3 品。",fingers:[[1,"食指",3,2],[2,"中指",2,3],[3,"無名指",1,3]]}
  };
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function enhanceChord(wrap){
    if(!wrap||wrap.dataset.gcChordCoach==="1")return;
    const name=wrap.querySelector(".bz-chord-name")?.textContent?.trim();
    const info=chordInfo[name];if(!info)return;
    wrap.dataset.gcChordCoach="1";
    const panel=document.createElement("section");panel.className="gc-chord-coach";
    const rows=info.fingers.map(([n,label,string,fret])=>`<div class="gc-finger-step"><b>${n}</b><span><strong>${esc(label)}</strong><small>第 ${string} 弦 · 第 ${fret} 品</small></span></div>`).join("");
    panel.innerHTML=`
      <div class="gc-chord-orientation"><span>看圖方向</span><strong>左邊＝6 弦最粗　→　右邊＝1 弦最細</strong></div>
      <div class="gc-chord-strum"><span class="gc-strum-arrow">↓</span><div><small>右手從哪裡開始</small><strong>${esc(info.play)}</strong></div></div>
      <div class="gc-chord-steps"><div class="gc-chord-steps-head"><span>左手照這個順序放</span><small>圓圈數字就是你的手指編號</small></div>${rows}</div>
      <div class="gc-chord-anchor"><strong>新手技巧</strong><span>${esc(info.anchor)}</span></div>
      <details class="gc-clean-check"><summary>按好了但聲音悶？照這 4 步檢查</summary><ol><li>每條應該要響的弦，先一條一條撥。</li><li>悶音時先把指尖立起來，不要立刻更用力。</li><li>手指靠近品絲後方，但不要壓在金屬品絲正上方。</li><li>確認手掌或其他手指沒有碰到旁邊的弦。</li></ol></details>`;
    wrap.appendChild(panel);
  }

  function enhanceAll(){
    const page=document.getElementById("page-beginner");if(!page)return;
    page.querySelectorAll(".bz-chord-wrap").forEach(enhanceChord);
  }

  function mount(){
    if(document.documentElement.dataset.gcChordCoach==="1")return;
    document.documentElement.dataset.gcChordCoach="1";
    enhanceAll();
    document.addEventListener("click",e=>{
      if(e.target.closest(".bz-entry,[data-gc-hub='beginner'],[data-gc-next],[data-bz-stage],.bz-lesson-head,[data-bz-done]"))setTimeout(enhanceAll,45);
    });
  }
  window.gcChordCoachUX={mount,refresh:enhanceAll};
})();
