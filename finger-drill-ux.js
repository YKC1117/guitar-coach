(() => {
  "use strict";

  const LESSON_ID="chromatic";
  const DEFAULT_BPM=55;
  let timer=null;
  let running=false;
  let index=0;
  let mode="down";

  const fingerNames={1:"食指",2:"中指",3:"無名指",4:"小指"};
  const strings=[6,5,4,3,2,1];
  const frets=[5,6,7,8];

  function card(){return document.querySelector(`#page-beginner .bz-lesson[data-lesson="${LESSON_ID}"]`)}
  function coach(){return document.getElementById("gcFingerDrill")}

  function sequence(){
    const down=[];
    for(const stringNo of strings){
      frets.forEach((fret,i)=>down.push({stringNo,fret,finger:i+1}));
    }
    if(mode==="roundtrip"){
      const up=[];
      for(const stringNo of [...strings].reverse()){
        [...frets].reverse().forEach((fret,i)=>up.push({stringNo,fret,finger:4-i}));
      }
      return down.concat(up);
    }
    return down;
  }

  function stop(){
    running=false;
    clearInterval(timer);timer=null;
    coach()?.classList.remove("is-running");
    const btn=coach()?.querySelector("[data-fd-play]");
    if(btn)btn.textContent="開始播放";
  }

  function renderStep(){
    const root=coach();if(!root)return;
    const seq=sequence();
    if(index>=seq.length)index=0;
    const step=seq[index];
    root.querySelectorAll("[data-fd-cell]").forEach(el=>el.classList.remove("active","passed"));
    seq.slice(0,index).forEach(s=>root.querySelector(`[data-fd-cell="${s.stringNo}-${s.fret}"]`)?.classList.add("passed"));
    root.querySelector(`[data-fd-cell="${step.stringNo}-${step.fret}"]`)?.classList.add("active");
    root.querySelectorAll("[data-fd-string]").forEach(el=>el.classList.toggle("active",Number(el.dataset.fdString)===step.stringNo));
    root.querySelectorAll("[data-fd-finger]").forEach(el=>el.classList.toggle("active",Number(el.dataset.fdFinger)===step.finger));
    const cue=root.querySelector("[data-fd-cue]");
    if(cue)cue.innerHTML=`<strong>現在：第 ${step.stringNo} 弦・第 ${step.fret} 品</strong><span>用 ${step.finger} 號 ${fingerNames[step.finger]}，指尖靠近品絲後方。</span>`;
    const progress=root.querySelector("[data-fd-progress]");
    if(progress){progress.textContent=`${index+1} / ${seq.length}`;progress.style.setProperty("--p",`${Math.round((index+1)/seq.length*100)}%`)}
  }

  function next(){const seq=sequence();index=(index+1)%seq.length;renderStep()}
  function prev(){const seq=sequence();index=(index-1+seq.length)%seq.length;renderStep()}
  function restart(){index=0;renderStep()}

  function intervalMs(){
    const bpm=Math.max(35,Math.min(120,Number(coach()?.querySelector("[data-fd-bpm]")?.value)||DEFAULT_BPM));
    return Math.round(60000/bpm);
  }

  function play(){
    if(running){stop();return}
    running=true;
    const root=coach();root?.classList.add("is-running");
    const btn=root?.querySelector("[data-fd-play]");if(btn)btn.textContent="暫停";
    renderStep();
    timer=setInterval(next,intervalMs());
  }

  function rebuildTimer(){if(running){clearInterval(timer);timer=setInterval(next,intervalMs())}}

  function gridHtml(){
    return strings.map(stringNo=>`<div class="fd-string-row" data-fd-string="${stringNo}"><b>${stringNo}弦</b>${frets.map((fret,i)=>`<button type="button" class="fd-cell" data-fd-cell="${stringNo}-${fret}"><span>${fret}品</span><i>${i+1}</i></button>`).join("")}</div>`).join("");
  }

  function createCoach(){
    const root=document.createElement("section");
    root.id="gcFingerDrill";root.className="gc-finger-drill";
    root.innerHTML=`
      <div class="fd-head">
        <div><span class="kicker">STEP BY STEP</span><h3>爬格子指法教練</h3><p>先不用背 TAB。看哪一格亮起，就用指定手指按那一格，再撥一次。</p></div>
        <span class="fd-progress" data-fd-progress>1 / 24</span>
      </div>
      <div class="fd-fingers" aria-label="左手手指">
        ${[1,2,3,4].map(n=>`<span data-fd-finger="${n}"><b>${n}</b>${fingerNames[n]}</span>`).join("")}
      </div>
      <div class="fd-cue" data-fd-cue></div>
      <div class="fd-grid-wrap">
        <div class="fd-grid-head"><span>弦</span>${frets.map(f=>`<span>${f}品</span>`).join("")}</div>
        <div class="fd-grid">${gridHtml()}</div>
      </div>
      <div class="fd-direction"><strong>走法</strong><span>6弦 → 1弦，每條弦都是 1-2-3-4</span></div>
      <div class="fd-controls">
        <label>速度<select data-fd-bpm><option value="45">45 BPM</option><option value="55" selected>55 BPM</option><option value="60">60 BPM</option><option value="70">70 BPM</option></select></label>
        <label>模式<select data-fd-mode><option value="down">6弦 → 1弦</option><option value="roundtrip">來回 6弦 → 1弦 → 6弦</option></select></label>
      </div>
      <div class="fd-actions">
        <button type="button" data-fd-prev>上一格</button>
        <button type="button" class="primary" data-fd-play>開始播放</button>
        <button type="button" data-fd-next>下一格</button>
        <button type="button" data-fd-restart>重新開始</button>
      </div>
      <div class="fd-tips"><strong>新手先做到這 3 點</strong><span>每顆音清楚、手指不要飛太高、換弦時節拍不要停。速度慢沒關係。</span></div>`;
    root.querySelector("[data-fd-play]").onclick=play;
    root.querySelector("[data-fd-prev]").onclick=()=>{stop();prev()};
    root.querySelector("[data-fd-next]").onclick=()=>{stop();next()};
    root.querySelector("[data-fd-restart]").onclick=()=>{stop();restart()};
    root.querySelector("[data-fd-bpm]").onchange=rebuildTimer;
    root.querySelector("[data-fd-mode]").onchange=e=>{stop();mode=e.target.value;restart();const desc=root.querySelector(".fd-direction span");if(desc)desc.textContent=mode==="roundtrip"?"6弦 → 1弦，再從 1 弦倒著回到 6 弦":"6弦 → 1弦，每條弦都是 1-2-3-4"};
    root.addEventListener("click",e=>{
      const cell=e.target.closest("[data-fd-cell]");if(!cell)return;
      stop();
      const [stringNo,fret]=cell.dataset.fdCell.split("-").map(Number);
      const found=sequence().findIndex(s=>s.stringNo===stringNo&&s.fret===fret);
      if(found>=0){index=found;renderStep()}
    });
    return root;
  }

  function enhance(){
    const c=card();if(!c)return;
    const body=c.querySelector(".bz-lesson-body");if(!body||body.querySelector("#gcFingerDrill"))return;
    const visual=body.querySelector(".bz-tab,.bz-sequence")||body.firstElementChild;
    const root=createCoach();
    if(visual)visual.insertAdjacentElement("afterend",root);else body.prepend(root);
    renderStep();
  }

  function mount(){
    if(document.documentElement.dataset.gcFingerDrill==="1")return;
    document.documentElement.dataset.gcFingerDrill="1";
    enhance();
    document.addEventListener("click",e=>{
      if(e.target.closest("[data-bz-stage],[data-bz-done],[data-bz-back]"))stop();
      if(e.target.closest("[data-bz-stage],.bz-entry,[data-gc-hub='beginner'],[data-gc-next],[data-bz-done]"))setTimeout(enhance,40);
    });
    document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
  }

  window.gcFingerDrillUX={mount,enhance,stop};
})();
