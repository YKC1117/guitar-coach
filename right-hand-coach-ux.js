(() => {
  "use strict";

  const LESSONS={
    down4:{title:"右手下刷教練",subtitle:"先把右手擺動做穩。每一拍往下刷一次，不要刷完就停在弦上。",steps:[
      {label:"1",dir:"↓",text:"第 1 拍：往下刷"},{label:"2",dir:"↓",text:"第 2 拍：往下刷"},{label:"3",dir:"↓",text:"第 3 拍：往下刷"},{label:"4",dir:"↓",text:"第 4 拍：往下刷"}
    ],bpms:[50,60,70,80],defaultBpm:60,tip:"手腕放鬆，讓 Pick 輕輕穿過弦，不要整條手臂用力砍下去。"},
    strum8:{title:"八拍上下刷教練",subtitle:"右手持續上下擺動，就算某一拍不碰弦，手也不要停。",steps:[
      {label:"1",dir:"↓",text:"1：下刷"},{label:"&",dir:"↑",text:"&：上刷"},{label:"2",dir:"↓",text:"2：下刷"},{label:"&",dir:"↑",text:"&：上刷"},
      {label:"3",dir:"↓",text:"3：下刷"},{label:"&",dir:"↑",text:"&：上刷"},{label:"4",dir:"↓",text:"4：下刷"},{label:"&",dir:"↑",text:"&：上刷"}
    ],bpms:[50,60,70,80],defaultBpm:60,tip:"先練完整 ↓↑↓↑↓↑↓↑。等手穩了，再進入有『空刷』的節奏型。"},
    arp:{title:"分解和弦撥弦教練",subtitle:"一次只找下一條弦，先準確，再追速度。",steps:[
      {label:"5",dir:"●",text:"第 5 弦：低音"},{label:"3",dir:"●",text:"第 3 弦"},{label:"2",dir:"●",text:"第 2 弦"},{label:"3",dir:"●",text:"回第 3 弦"}
    ],bpms:[45,55,60,70],defaultBpm:55,tip:"C、Am 可先從第 5 弦開始。拇指負責低音弦，其餘手指自然放鬆。"}
  };

  const states=new Map();
  const page=()=>document.getElementById("page-beginner");
  const card=id=>page()?.querySelector(`.bz-lesson[data-lesson="${id}"]`);

  function stateFor(id){
    if(!states.has(id))states.set(id,{index:0,running:false,timer:null});
    return states.get(id);
  }

  function stop(id){
    const s=stateFor(id);s.running=false;clearInterval(s.timer);s.timer=null;
    const root=document.querySelector(`[data-rh-coach="${id}"]`);
    root?.classList.remove("is-running");
    const play=root?.querySelector("[data-rh-play]");if(play)play.textContent="開始播放";
  }

  function stopAll(){Object.keys(LESSONS).forEach(stop)}

  function render(id){
    const cfg=LESSONS[id],s=stateFor(id),root=document.querySelector(`[data-rh-coach="${id}"]`);if(!cfg||!root)return;
    if(s.index>=cfg.steps.length)s.index=0;
    const step=cfg.steps[s.index];
    root.querySelectorAll("[data-rh-step]").forEach((el,i)=>{
      el.classList.toggle("active",i===s.index);
      el.classList.toggle("passed",i<s.index);
    });
    const cue=root.querySelector("[data-rh-cue]");if(cue)cue.innerHTML=`<strong>${step.text}</strong><span>${cfg.tip}</span>`;
    const count=root.querySelector("[data-rh-count]");if(count)count.textContent=`${s.index+1} / ${cfg.steps.length}`;
  }

  function interval(id){
    const cfg=LESSONS[id],root=document.querySelector(`[data-rh-coach="${id}"]`);
    const bpm=Math.max(35,Math.min(120,Number(root?.querySelector("[data-rh-bpm]")?.value)||cfg.defaultBpm));
    return Math.round(60000/bpm);
  }

  function next(id){const s=stateFor(id),cfg=LESSONS[id];s.index=(s.index+1)%cfg.steps.length;render(id)}
  function prev(id){const s=stateFor(id),cfg=LESSONS[id];s.index=(s.index-1+cfg.steps.length)%cfg.steps.length;render(id)}
  function restart(id){const s=stateFor(id);s.index=0;render(id)}

  function play(id){
    const s=stateFor(id),root=document.querySelector(`[data-rh-coach="${id}"]`);if(!root)return;
    if(s.running){stop(id);return}
    s.running=true;root.classList.add("is-running");root.querySelector("[data-rh-play]").textContent="暫停";render(id);
    s.timer=setInterval(()=>next(id),interval(id));
  }

  function rebuild(id){const s=stateFor(id);if(s.running){clearInterval(s.timer);s.timer=setInterval(()=>next(id),interval(id))}}

  function coachHtml(id){
    const cfg=LESSONS[id];
    return `<section class="gc-rh-coach" data-rh-coach="${id}">
      <div class="rh-head"><div><span class="kicker">RIGHT HAND</span><h3>${cfg.title}</h3><p>${cfg.subtitle}</p></div><span class="rh-count" data-rh-count>1 / ${cfg.steps.length}</span></div>
      <div class="rh-pick-hint"><span class="rh-pick">Pick</span><div><strong>拿 Pick</strong><small>拇指與食指輕夾，只露出一小段尖端；不要握到手指僵硬。</small></div></div>
      <div class="rh-steps">${cfg.steps.map((s,i)=>`<button type="button" data-rh-step="${i}"><small>${s.label}</small><b>${s.dir}</b><span>${s.text.replace(/^.*：/,"")}</span></button>`).join("")}</div>
      <div class="rh-cue" data-rh-cue></div>
      <div class="rh-controls"><label>速度<select data-rh-bpm>${cfg.bpms.map(b=>`<option value="${b}" ${b===cfg.defaultBpm?'selected':''}>${b} BPM</option>`).join("")}</select></label></div>
      <div class="rh-actions"><button type="button" data-rh-prev>上一拍</button><button type="button" class="primary" data-rh-play>開始播放</button><button type="button" data-rh-next>下一拍</button><button type="button" data-rh-restart>重新開始</button></div>
      <div class="rh-check"><strong>自我檢查</strong><span>聲音太硬：Pick 角度再斜一點。容易卡弦：露出的 Pick 太多。手臂很酸：放鬆手腕與肩膀。</span></div>
    </section>`;
  }

  function bind(root,id){
    root.querySelector("[data-rh-play]").onclick=()=>play(id);
    root.querySelector("[data-rh-prev]").onclick=()=>{stop(id);prev(id)};
    root.querySelector("[data-rh-next]").onclick=()=>{stop(id);next(id)};
    root.querySelector("[data-rh-restart]").onclick=()=>{stop(id);restart(id)};
    root.querySelector("[data-rh-bpm]").onchange=()=>rebuild(id);
    root.querySelectorAll("[data-rh-step]").forEach((btn,i)=>btn.onclick=()=>{stop(id);stateFor(id).index=i;render(id)});
  }

  function enhanceOne(id){
    const c=card(id);if(!c)return;
    const body=c.querySelector(".bz-lesson-body");if(!body||body.querySelector(`[data-rh-coach="${id}"]`))return;
    const anchor=body.querySelector(".bz-rhythm,.bz-sequence,.bz-tab,.bz-progression")||body.firstElementChild;
    const wrap=document.createElement("div");wrap.innerHTML=coachHtml(id);const root=wrap.firstElementChild;
    if(anchor)anchor.insertAdjacentElement("afterend",root);else body.prepend(root);
    bind(root,id);render(id);
  }

  function enhance(){Object.keys(LESSONS).forEach(enhanceOne)}

  function mount(){
    if(document.documentElement.dataset.gcRightHand==="1")return;
    document.documentElement.dataset.gcRightHand="1";enhance();
    document.addEventListener("click",e=>{
      if(e.target.closest("[data-bz-stage],.bz-entry,[data-gc-hub='beginner'],[data-gc-next],[data-bz-done]"))setTimeout(enhance,40);
    });
    document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAll()});
  }

  window.gcRightHandCoachUX={mount,enhance,stopAll};
})();
