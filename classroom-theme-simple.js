(() => {
  "use strict";
  const KEY="guitarCoachColorPresetV1";
  const presets=[
    ["black","黑色"],["white","白色"],["blue","藍色"],["green","綠色"],["violet","紫色"],["orange","橘色"],["rose","玫瑰"]
  ];
  const $=(s,r=document)=>r.querySelector(s);
  function apply(id,save=true){
    if(!presets.some(x=>x[0]===id))id="black";
    document.documentElement.dataset.gcPreset=id;
    if(save)localStorage.setItem(KEY,id);
    const meta=$("meta[name='theme-color']");
    const colors={black:"#0a0c10",white:"#f7f8fb",blue:"#0b1730",green:"#0b2018",violet:"#171127",orange:"#2a1709",rose:"#291018"};
    if(meta)meta.content=colors[id]||colors.black;
    render();
  }
  function render(){
    const panel=$("#gcThemePanel");if(!panel)return;
    const active=localStorage.getItem(KEY)||"black";
    panel.innerHTML=`<div class="gc-simple-title">頁面顏色</div><div class="gc-simple-colors">${presets.map(([id,label])=>`<button type="button" class="${active===id?"active":""}" data-gc-color="${id}"><i></i><span>${label}</span></button>`).join("")}</div>`;
    panel.querySelectorAll('[data-gc-color]').forEach(b=>b.onclick=()=>apply(b.dataset.gcColor));
  }
  function init(){
    const btn=$("#gcThemeButton"),panel=$("#gcThemePanel");
    if(!btn||!panel)return false;
    btn.innerHTML="<span>◐</span><b>顏色</b>";
    btn.setAttribute("aria-label","切換頁面顏色");
    btn.onclick=e=>{e.stopPropagation();const open=panel.classList.toggle("hidden")===false;btn.setAttribute("aria-expanded",String(open));if(open)render()};
    render();
    apply(localStorage.getItem(KEY)||"black",false);
    return true;
  }
  let tries=0;
  function boot(){if(init())return;if(++tries<30)requestAnimationFrame(boot)}
  boot();
})();
