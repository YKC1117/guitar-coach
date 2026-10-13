(() => {
  "use strict";
  const BEGINNER_KEY="guitarCoachBeginnerV1";
  const CORE_KEY="guitarCoachV2";
  const TOTAL_BEGINNER=25;
  const stageNames={start:"今天開始",week12:"第 1～2 週",month1:"第 1 個月",month23:"第 2～3 個月",month46:"第 4～6 個月"};

  function safeJson(raw,fallback={}){try{const v=JSON.parse(raw||"null");return v&&typeof v==="object"?v:fallback}catch(e){return fallback}}
  function store(){return window.gcProfiles?.store||window.localStorage}
  function beginnerState(){try{return safeJson(store().getItem(BEGINNER_KEY),{})}catch(e){return {}}}
  function coreState(){try{return safeJson(store().getItem(CORE_KEY),{})}catch(e){return {}}}
  function dateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
  function beginnerProgress(){const s=beginnerState(),done=Object.values(s.done||{}).filter(Boolean).length;return {done,total:TOTAL_BEGINNER,pct:Math.round(done/TOTAL_BEGINNER*100),stage:stageNames[s.stage]||"今天開始"}}
  function dailyProgress(){const s=coreState(),tasks=s.days?.[dateKey()]?.tasks;const arr=Array.isArray(tasks)?tasks:[false,false,false,false],done=arr.filter(Boolean).length;return {done,total:4,pct:Math.round(done/4*100)}}
  function hasTeacherHomework(){const section=document.getElementById("teacherHomeworkSection");return !!section&&!section.classList.contains("hidden")}
  function route(name){document.querySelector(`.bottom-nav [data-route="${name}"]`)?.click()||document.querySelector(`[data-route="${name}"]`)?.click()}
  function openBeginner(){if(window.gcBeginner?.open)window.gcBeginner.open();else document.querySelector(".bz-entry")?.click()}
  function openLearn(view){route("learn");queueMicrotask(()=>document.querySelector(`[data-learn-view="${view}"]`)?.click())}

  function nextStep(){
    const bp=beginnerProgress(),dp=dailyProgress();
    if(hasTeacherHomework())return {eyebrow:"老師作業",title:"先把老師交代的內容完成",desc:"上課後的指定練習優先，不用再自己猜今天該練什麼。",button:"開始老師作業",action:()=>document.getElementById("startTeacherHomework")?.click(),side:`新手進度 ${bp.pct}%`};
    if(bp.done<8)return {eyebrow:"新手導引",title:bp.done?`繼續「${bp.stage}」`:`第一次使用，從新手區開始`,desc:"先把姿勢、調音、爬格子與第一批和弦打穩，再進每日自由練習。",button:bp.done?"繼續新手課程":"開始新手課程",action:openBeginner,side:`已完成 ${bp.done}/${bp.total}`};
    if(dp.done<dp.total)return {eyebrow:"今日練習",title:`今天還有 ${dp.total-dp.done} 項`,desc:"直接接著未完成的項目，不用重新找工具或課程。",button:"繼續今日練習",action:()=>document.getElementById("startDailyBtn")?.click(),side:`今日 ${dp.done}/${dp.total}`};
    if(bp.done<bp.total)return {eyebrow:"下一階段",title:`回到「${bp.stage}」繼續`,desc:"今天的固定練習完成了，再補一個新手課程就好。",button:"繼續新手課程",action:openBeginner,side:`新手進度 ${bp.pct}%`};
    return {eyebrow:"今天完成",title:"今天的主要任務已完成",desc:"想再練就選一個工具；不需要為了打卡硬加練習量。",button:"查看練習工具",action:()=>route("practice"),side:"可以收琴了"};
  }

  function mountHome(){
    const home=document.getElementById("page-home"),hero=home?.querySelector(".home-hero");
    if(!home||!hero||document.getElementById("gcNextStep"))return;
    const card=document.createElement("section");card.id="gcNextStep";card.className="gc-next-step";
    hero.insertAdjacentElement("afterend",card);
    const render=()=>{
      const n=nextStep(),bp=beginnerProgress(),dp=dailyProgress();
      card.innerHTML=`<div class="gc-next-main"><div><span class="kicker">NEXT STEP · ${n.eyebrow}</span><h2>${n.title}</h2><p>${n.desc}</p></div><div class="gc-next-actions"><button type="button" class="primary" data-gc-next>${n.button}</button><button type="button" class="gc-next-link" data-gc-map>全部學習入口</button></div></div><div class="gc-next-meta"><span><b>${bp.pct}%</b> 新手路線</span><span><b>${dp.done}/${dp.total}</b> 今日練習</span><span>${n.side}</span></div>`;
      card.querySelector("[data-gc-next]").onclick=n.action;
      card.querySelector("[data-gc-map]").onclick=()=>openLearn("self");
    };
    render();
    document.addEventListener("click",e=>{if(e.target.closest("[data-daily-check],[data-bz-done],#startTeacherHomework"))setTimeout(render,50)});
  }

  function mountLearnHub(){
    const page=document.getElementById("page-learn"),intro=page?.querySelector(".page-intro");
    if(!page||!intro||document.getElementById("gcLearningHub"))return;
    const hub=document.createElement("section");hub.id="gcLearningHub";hub.className="gc-learning-hub";
    hub.innerHTML=`<button type="button" data-gc-hub="beginner"><span class="gc-hub-num">1</span><span><strong>新手路線</strong><small>從拿琴、爬格子到 3～6 個月</small></span><i>›</i></button><button type="button" data-gc-hub="self"><span class="gc-hub-num">2</span><span><strong>自學課程</strong><small>照網站課程逐步學習</small></span><i>›</i></button><button type="button" data-gc-hub="teacher"><span class="gc-hub-num">3</span><span><strong>課堂筆記</strong><small>老師教過的、作業、下次要問的</small></span><i>›</i></button>`;
    intro.insertAdjacentElement("afterend",hub);
    hub.querySelector('[data-gc-hub="beginner"]').onclick=openBeginner;
    hub.querySelector('[data-gc-hub="self"]').onclick=()=>openLearn("self");
    hub.querySelector('[data-gc-hub="teacher"]').onclick=()=>openLearn("teacher");
  }

  function mountPracticeGuide(){
    const page=document.getElementById("page-practice"),intro=page?.querySelector(".page-intro");
    if(!page||!intro||document.getElementById("gcPracticeGuide"))return;
    const guide=document.createElement("section");guide.id="gcPracticeGuide";guide.className="gc-practice-guide";
    guide.innerHTML='<div><span class="kicker">QUICK GUIDE</span><strong>不知道要練哪個？</strong><p>新手先照「調音 → 基本功 → 和弦 → 節奏」；一次只專心練一件。</p></div><button type="button">打開新手區</button>';
    guide.querySelector("button").onclick=openBeginner;
    intro.insertAdjacentElement("afterend",guide);
  }

  function improveLabels(){
    const learnTab=document.querySelector('[data-learn-view="self"]');if(learnTab)learnTab.textContent="自學課程";
    const teacherTab=document.querySelector('[data-learn-view="teacher"]');if(teacherTab)teacherTab.textContent="課堂筆記";
    const learnNav=document.querySelector('.bottom-nav [data-route="learn"] b');if(learnNav)learnNav.textContent="學習";
  }

  function mount(){
    if(document.documentElement.dataset.gcNavUx==="1")return;
    document.documentElement.dataset.gcNavUx="1";
    mountHome();mountLearnHub();mountPracticeGuide();improveLabels();
  }
  window.gcNavUX={mount,refresh:()=>{document.documentElement.dataset.gcNavUx="";mount()}};
})();
