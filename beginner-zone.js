(() => {
  "use strict";
  const STORAGE_KEY="guitarCoachBeginnerV1";
  const store=window.gcProfiles?.store||window.localStorage;
  const stages=[
    {id:"start",label:"今天開始",range:"第 1 天",goal:"先會拿琴、調音、知道手指怎麼按，不急著彈歌。",lessons:[
      {id:"tune",title:"每次先調音",minutes:2,kind:"基礎",summary:"標準調音由第 6 弦到第 1 弦是 E A D G B E。",tips:["夾式調音器先切到 Guitar 或 Chromatic。","一次只撥一條弦；指針置中再換下一條。","新弦前幾天比較容易跑音，練習前重新確認。"],visual:"tuning"},
      {id:"hold",title:"拿琴與左手姿勢",minutes:3,kind:"姿勢",summary:"肩膀放鬆、琴身靠穩；左手不是用虎口死夾琴頸。",tips:["左手拇指自然放在琴頸後方。","用指尖按弦，手指盡量立起來。","按在品絲後方，不要正壓在金屬品絲上。"],visual:"hand"},
      {id:"strings",title:"認識六條弦",minutes:3,kind:"基礎",summary:"面向你時最粗的是第 6 弦，最細的是第 1 弦。",tips:["6弦 E、5弦 A、4弦 D、3弦 G、2弦 B、1弦 E。","先練 6→1，再練 1→6，每次只撥指定那條。"],visual:"strings"},
      {id:"clean-note",title:"第一個乾淨單音",minutes:4,kind:"按弦",summary:"先把一個音按乾淨，比一次學很多和弦重要。",tips:["先在第 5 品附近練，手比較不需要張太開。","聲音悶掉時先檢查指尖位置，不要先加大力氣。","成功標準：音能清楚延續、沒有打品雜音。"],visual:"single"}
    ]},
    {id:"week12",label:"第 1～2 週",range:"建立手感",goal:"建立四指獨立、認識第一批簡單和弦，開始讓左右手同步。",lessons:[
      {id:"chromatic",title:"爬格子 1-2-3-4",minutes:5,kind:"基本功",summary:"食指、中指、無名指、小指依序走相鄰四格，再換下一條弦。",tips:["1=食指、2=中指、3=無名指、4=小指。","先從 5-6-7-8 品開始，比第 1 品更容易張手。","每一顆音乾淨再加速；新手先 50～60 BPM。"],visual:"chromatic",timer:true},
      {id:"em",title:"Em 和弦",minutes:4,kind:"和弦",summary:"只用兩根手指，是很適合第一顆學會的開放和弦。",chord:"Em",tips:["六條弦都可以刷。","中指與無名指各自立起來，不要碰到其他弦。"]},
      {id:"am",title:"Am 和弦",minutes:4,kind:"和弦",summary:"開始練三指靠近排列，也是之後很多和弦的基礎。",chord:"Am",tips:["從第 5 弦開始刷，第 6 弦先不要刷。","每根弦分開撥一次，確認沒有被其他手指碰悶。"]},
      {id:"e",title:"E 和弦",minutes:4,kind:"和弦",summary:"手型和 Am 很像，可以拿來練手型整體移動。",chord:"E",tips:["六條弦都可以刷。","試著讓三根手指一起落下，不要永遠一根一根找。"]},
      {id:"down4",title:"四拍下刷",minutes:4,kind:"節奏",summary:"先不要追求花俏刷法，穩穩把 1 2 3 4 刷完整。",tips:["右手保持擺動，不要每一下都停住。","先 60 BPM，一拍一下，下 下 下 下。"],visual:"down4",metronome:true}
    ]},
    {id:"month1",label:"第 1 個月",range:"和弦真的能用",goal:"把基本和弦按乾淨，開始練『換過去還能保持節奏』。",lessons:[
      {id:"c",title:"C 和弦",minutes:5,kind:"和弦",summary:"新手很常卡在 C；重點是三根手指分開、第一弦不要被碰到。",chord:"C",tips:["從第 5 弦開始刷。","無名指去第 5 弦 3 品時，手掌不要貼住琴頸。","先逐弦檢查 5→1，再整體刷。"]},
      {id:"g",title:"G 和弦",minutes:5,kind:"和弦",summary:"手需要比 C 張得更開，先求穩定，不急著換很快。",chord:"G",tips:["六條弦都可以刷。","手指靠近品絲後方，能減少需要的按壓力量。"]},
      {id:"d",title:"D 和弦",minutes:5,kind:"和弦",summary:"三根手指集中在高音弦，最常出現互相碰弦。",chord:"D",tips:["從第 4 弦開始刷。","三根手指都要立起來，特別注意第 1 弦。"]},
      {id:"em-am-switch",title:"60 秒：Em ↔ Am",minutes:3,kind:"換和弦",summary:"一分鐘只做兩顆和弦，計算乾淨成功的換法。",tips:["先慢慢放好兩個手型，再開始計時。","只計算兩顆都有清楚出聲的成功次數。","今天的目標是比昨天穩，不是硬追速度。"],visual:"switch",timer:true},
      {id:"c-g-switch",title:"60 秒：C ↔ G",minutes:3,kind:"換和弦",summary:"這組距離比較大，專門練整個手型離開再落下。",tips:["先做『空中換和弦』：不刷弦，只練手型一起移動。","換和弦時右手節奏不要跟著停。"],visual:"switch-cg",timer:true},
      {id:"gd-em-c",title:"G - D - Em - C 循環",minutes:6,kind:"和弦循環",summary:"每顆先四拍，讓你第一次把和弦變成連續的音樂。",tips:["G 四拍 → D 四拍 → Em 四拍 → C 四拍。","先用全下刷，能不中斷跑完再加其他刷法。"],visual:"progression",metronome:true}
    ]},
    {id:"month23",label:"第 2～3 個月",range:"開始像在彈歌",goal:"加入八拍節奏、分解和弦與完整循環，練習不停拍地伴奏。",lessons:[
      {id:"strum8",title:"八拍刷法入門",minutes:7,kind:"節奏",summary:"先把右手規律擺動建立起來，再決定哪些拍真正碰到弦。",tips:["嘴巴先念拍子，再拿琴。","右手上下持續擺，『不刷』也不要把手停住。","先慢速 60 BPM。"],visual:"strum8",metronome:true},
      {id:"arp",title:"分解和弦 5-3-2-3",minutes:6,kind:"指法",summary:"從低音到高音分開撥，先練準確再練速度。",tips:["C、Am 類和弦可先從第 5 弦當低音。","每次只找下一條弦，不要整隻右手僵住。"],visual:"arpeggio",metronome:true},
      {id:"dm",title:"Dm 和弦",minutes:5,kind:"和弦",summary:"補齊常見的新手開放和弦，開始感受大調與小調色彩。",chord:"Dm",tips:["從第 4 弦開始刷。","第一弦 1 品用食指，注意不要碰到第 2 弦。"]},
      {id:"progression-loop",title:"四和弦不中斷",minutes:8,kind:"實戰",summary:"選 G-D-Em-C 或 C-G-Am-Em，連續循環 3～5 分鐘。",tips:["換錯不要停，下一拍繼續。","能維持節奏比每顆都完美更接近真正伴奏。"],visual:"progression",timer:true},
      {id:"song-section",title:"完成一段歌曲",minutes:10,kind:"歌曲",summary:"不要一次挑整首；先把主歌或副歌的一段彈順。",tips:["先只彈和弦順序，再加入刷法。","最後才跟原曲或伴奏。","錄 30 秒回放，比邊彈邊猜自己有沒有進步更準。"],visual:"song"}
    ]},
    {id:"month46",label:"第 4～6 個月",range:"穩定新手期",goal:"開始處理橫按前置能力、Capo、常用裝飾和弦與讀 TAB。",lessons:[
      {id:"fmaj7",title:"F 的前置：Fmaj7",minutes:6,kind:"和弦",summary:"先不用硬衝完整大橫按；把 C 附近常用的 Fmaj7 練乾淨。",chord:"Fmaj7",tips:["從第 4 弦開始刷。","先建立食指壓第 2 弦 1 品的角度，再逐步準備完整 F。"]},
      {id:"cadd9",title:"Cadd9 / Dsus4 裝飾和弦",minutes:6,kind:"和弦",summary:"這兩顆常出現在木吉他伴奏，能讓基本和弦循環更有變化。",chord:"Cadd9",altChord:"Dsus4",tips:["先看哪些手指可以留在原位，再移其他手指。","目的不是背更多名字，而是減少換和弦動作。"]},
      {id:"capo",title:"Capo 移調夾怎麼用",minutes:5,kind:"工具",summary:"夾上 Capo 後仍可以用熟悉的開放和弦手型，快速換到適合唱歌的調。",tips:["Capo 要靠近品絲但不要壓在品絲上。","夾好後重新確認調音。","同一個 C 手型，Capo 位置改變後實際音高也會改變。"],visual:"capo"},
      {id:"tab",title:"看懂基本 TAB",minutes:7,kind:"讀譜",summary:"TAB 的六條線代表六條弦，數字代表要按第幾品。",tips:["TAB 最上面通常是第 1 弦（最細），最下面是第 6 弦（最粗）。","0 代表空弦。","先看順序與節奏，不要只追著數字按。"],visual:"tab"},
      {id:"record",title:"每週錄一次 30 秒",minutes:5,kind:"檢查",summary:"固定錄同一個和弦循環，回頭比較節奏、雜音與換和弦是否進步。",tips:["每週同一速度、同一段最容易比較。","只挑一個問題改善：節奏、雜音或換和弦。"],visual:"record"}
    ]}
  ];
  const chords={
    Em:{frets:[0,2,2,0,0,0],fingers:[0,2,3,0,0,0],from:6},
    Am:{frets:["x",0,2,2,1,0],fingers:[0,0,2,3,1,0],from:5},
    E:{frets:[0,2,2,1,0,0],fingers:[0,2,3,1,0,0],from:6},
    C:{frets:["x",3,2,0,1,0],fingers:[0,3,2,0,1,0],from:5},
    G:{frets:[3,2,0,0,0,3],fingers:[2,1,0,0,0,3],from:6},
    D:{frets:["x","x",0,2,3,2],fingers:[0,0,0,1,3,2],from:4},
    Dm:{frets:["x","x",0,2,3,1],fingers:[0,0,0,2,3,1],from:4},
    Fmaj7:{frets:["x","x",3,2,1,0],fingers:[0,0,3,2,1,0],from:4},
    Cadd9:{frets:["x",3,2,0,3,3],fingers:[0,2,1,0,3,4],from:5},
    Dsus4:{frets:["x","x",0,2,3,3],fingers:[0,0,0,1,2,3],from:4}
  };
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  function readState(){try{const v=JSON.parse(store.getItem(STORAGE_KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(e){return {}}}
  function writeState(value){try{store.setItem(STORAGE_KEY,JSON.stringify(value))}catch(e){console.warn("Beginner progress unavailable",e)}}
  let state=readState(),activeStage=state.stage&&stages.some(s=>s.id===state.stage)?state.stage:"start",timerId=null,timerEnd=0;
  function chordDiagram(name){const c=chords[name];if(!c)return "";const marks=c.frets.map((f,i)=>`<div class="bz-string-state ${f==='x'?'muted':f===0?'open':''}">${f==='x'?'×':f===0?'○':''}</div>`).join("");const cells=[];for(let fret=1;fret<=3;fret++)for(let s=0;s<6;s++){const hit=c.frets[s]===fret;cells.push(`<div class="bz-fret-cell">${hit?`<i>${c.fingers[s]||''}</i>`:""}</div>`)}return `<div class="bz-chord-wrap"><div class="bz-chord-name">${esc(name)}</div><div class="bz-chord-chart"><div class="bz-state-row">${marks}</div><div class="bz-fret-grid">${cells.join("")}</div><div class="bz-string-labels"><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div></div><small>數字圓點＝手指：1 食指・2 中指・3 無名指・4 小指</small></div>`}
  function visual(type){switch(type){
    case"tuning":return `<div class="bz-tuning"><span>6<small>E</small></span><i>→</i><span>5<small>A</small></span><i>→</i><span>4<small>D</small></span><i>→</i><span>3<small>G</small></span><i>→</i><span>2<small>B</small></span><i>→</i><span>1<small>E</small></span></div>`;
    case"hand":return `<div class="bz-hand"><div><b>1</b><span>食指</span></div><div><b>2</b><span>中指</span></div><div><b>3</b><span>無名指</span></div><div><b>4</b><span>小指</span></div><p>指尖立起來 → 按在品絲後方</p></div>`;
    case"strings":return `<div class="bz-strings"><div><b>6</b><span>E</span></div><div><b>5</b><span>A</span></div><div><b>4</b><span>D</span></div><div><b>3</b><span>G</span></div><div><b>2</b><span>B</span></div><div><b>1</b><span>E</span></div><small>粗　　　　　　　　　　　　細</small></div>`;
    case"single":return `<div class="bz-single"><span>指尖</span><b>●</b><i></i><em>品絲</em><strong>按這裡</strong></div>`;
    case"chromatic":return `<div class="bz-tab"><div><b>1弦</b><code>5—6—7—8</code><span>1 2 3 4</span></div><div><b>2弦</b><code>5—6—7—8</code><span>1 2 3 4</span></div><div><b>…</b><code>每條弦相同</code><span>↓</span></div><div><b>6弦</b><code>5—6—7—8</code><span>1 2 3 4</span></div></div>`;
    case"down4":return `<div class="bz-rhythm"><span>1</span><span>2</span><span>3</span><span>4</span><b>↓</b><b>↓</b><b>↓</b><b>↓</b></div>`;
    case"strum8":return `<div class="bz-rhythm eight"><span>1 &</span><span>2 &</span><span>3 &</span><span>4 &</span><b>↓　</b><b>↓ ↑</b><b>　 ↑</b><b>↓ ↑</b></div>`;
    case"arpeggio":return `<div class="bz-sequence"><strong>5</strong><i>→</i><strong>3</strong><i>→</i><strong>2</strong><i>→</i><strong>3</strong><small>弦號</small></div>`;
    case"switch":return `<div class="bz-switch"><b>Em</b><i>↔</i><b>Am</b><span>60 秒・只算乾淨的</span></div>`;
    case"switch-cg":return `<div class="bz-switch"><b>C</b><i>↔</i><b>G</b><span>60 秒・手型一起移動</span></div>`;
    case"progression":return `<div class="bz-progression"><b>G</b><i>→</i><b>D</b><i>→</i><b>Em</b><i>→</i><b>C</b></div>`;
    case"song":return `<div class="bz-song"><span>① 和弦</span><i>→</i><span>② 節奏</span><i>→</i><span>③ 跟歌</span></div>`;
    case"capo":return `<div class="bz-capo"><div class="bz-neck"><i></i><i></i><i></i><i></i><b>CAPO</b></div><span>靠近品絲夾緊，不要壓在金屬品絲上</span></div>`;
    case"tab":return `<div class="bz-tab mini"><code>e|—0—1—3—</code><code>B|—1—3———</code><code>G|———————</code><small>0＝空弦；數字＝品格</small></div>`;
    case"record":return `<div class="bz-record"><i></i><strong>00:30</strong><span>每週固定錄同一段</span></div>`;
    default:return"";
  }}
  function lessonVisual(l){return `${l.chord?chordDiagram(l.chord):""}${l.altChord?chordDiagram(l.altChord):""}${l.visual?visual(l.visual):""}`}
  function lessonCard(l){const done=!!state.done?.[l.id];return `<article class="bz-lesson ${done?'done':''}" data-lesson="${l.id}"><button class="bz-lesson-head" type="button" aria-expanded="false"><span class="bz-check" aria-hidden="true">${done?'✓':'○'}</span><span><small>${esc(l.kind)}・約 ${l.minutes} 分鐘</small><strong>${esc(l.title)}</strong><em>${esc(l.summary)}</em></span><b>展開</b></button><div class="bz-lesson-body" hidden>${lessonVisual(l)}<ul>${l.tips.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="bz-actions">${l.timer?'<button type="button" data-bz-timer="60">60 秒練習</button>':''}${l.metronome?'<button type="button" data-bz-metronome>開節拍器</button>':''}<button type="button" class="primary" data-bz-done>${done?'取消完成':'完成這項'}</button></div></div></article>`}
  function stageProgress(stage){const total=stage.lessons.length,done=stage.lessons.filter(l=>state.done?.[l.id]).length;return {total,done,pct:Math.round(done/total*100)}}
  function render(){const page=document.getElementById("page-beginner");if(!page)return;const stage=stages.find(s=>s.id===activeStage)||stages[0],p=stageProgress(stage),all=stages.flatMap(s=>s.lessons),allDone=all.filter(l=>state.done?.[l.id]).length,overall=Math.round(allDone/all.length*100);page.innerHTML=`
    <div class="bz-top"><button type="button" class="bz-back" data-bz-back>← 學習</button><div><span class="kicker">BEGINNER</span><h1>新手區</h1><p>不用猜今天該練什麼。照階段練，圖看懂了就直接拿琴做。</p></div><div class="bz-overall"><strong>${overall}%</strong><span>總進度</span></div></div>
    <div class="bz-stage-tabs" role="tablist">${stages.map(s=>`<button type="button" role="tab" aria-selected="${s.id===activeStage}" class="${s.id===activeStage?'active':''}" data-bz-stage="${s.id}"><b>${esc(s.label)}</b><span>${esc(s.range)}</span></button>`).join("")}</div>
    <section class="bz-stage-intro"><div><span class="kicker">CURRENT STAGE</span><h2>${esc(stage.label)}</h2><p>${esc(stage.goal)}</p></div><div class="bz-stage-progress"><strong>${p.done}/${p.total}</strong><span>本階段完成</span><i><b style="width:${p.pct}%"></b></i></div></section>
    <section class="bz-finger-guide"><div><span class="kicker">FINGER GUIDE</span><h2>先記這四根手指</h2></div><div class="bz-fingers"><span><b>1</b>食指</span><span><b>2</b>中指</span><span><b>3</b>無名指</span><span><b>4</b>小指</span></div></section>
    <section class="bz-lessons">${stage.lessons.map(lessonCard).join("")}</section>
    <section class="bz-routine"><div><span class="kicker">TODAY</span><h2>不知道怎麼排？直接照這個</h2></div><div class="bz-routine-grid"><article><strong>15 分鐘</strong><p>調音 2・基本功 3・和弦 5・換和弦/節奏 5</p></article><article><strong>30 分鐘</strong><p>調音 3・基本功 5・和弦 7・換和弦 5・節奏 5・歌曲 5</p></article><article><strong>45 分鐘</strong><p>熱身 5・基本功 10・和弦 10・轉換 10・節奏 5・歌曲 5</p></article></div></section>
    <div class="bz-timer" id="bzTimer" hidden><span>練習計時</span><strong>01:00</strong><button type="button" data-bz-stop>停止</button></div>`;
  }
  function open(){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById("page-beginner")?.classList.add("active");document.querySelectorAll(".bottom-nav [data-route]").forEach(b=>b.classList.remove("active"));window.scrollTo({top:0,behavior:"auto"})}
  function back(){const learn=document.querySelector('[data-route="learn"]');if(learn)learn.click();else{document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById("page-learn")?.classList.add("active")}}
  function startTimer(seconds){clearInterval(timerId);timerEnd=Date.now()+seconds*1000;const box=document.getElementById("bzTimer"),out=box?.querySelector("strong");if(!box||!out)return;box.hidden=false;const tick=()=>{const left=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));out.textContent=`${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`;if(!left){clearInterval(timerId);timerId=null;box.classList.add("finished");setTimeout(()=>box.classList.remove("finished"),1200)}};tick();timerId=setInterval(tick,250)}
  function mount(){if(document.getElementById("page-beginner"))return;const main=document.querySelector("main");if(!main)return;const page=document.createElement("section");page.className="page bz-page";page.id="page-beginner";main.appendChild(page);
    const home=document.querySelector("#page-home .quick-rail");if(home){const btn=document.createElement("button");btn.type="button";btn.className="quick-tile bz-entry";btn.innerHTML='<span class="quick-icon">1</span><div><strong>新手區</strong><small>從零開始照著練</small></div>';btn.onclick=open;home.prepend(btn)}
    const learn=document.getElementById("learn-self");if(learn){const banner=document.createElement("section");banner.className="bz-learn-entry";banner.innerHTML='<div><span class="kicker">BEGINNER ROADMAP</span><h2>剛開始學？先走新手區</h2><p>從拿琴、爬格子、C / G / Em 到 3～6 個月練習，按圖直接做。</p></div><button type="button" class="primary">打開新手區</button>';banner.querySelector("button").onclick=open;learn.prepend(banner)}
    page.addEventListener("click",e=>{const stageBtn=e.target.closest("[data-bz-stage]");if(stageBtn){activeStage=stageBtn.dataset.bzStage;state.stage=activeStage;writeState(state);render();return}if(e.target.closest("[data-bz-back]")){back();return}const head=e.target.closest(".bz-lesson-head");if(head){const body=head.nextElementSibling,openNow=body.hidden;body.hidden=!openNow;head.setAttribute("aria-expanded",String(openNow));head.querySelector(":scope > b").textContent=openNow?"收合":"展開";return}const done=e.target.closest("[data-bz-done]");if(done){const card=done.closest("[data-lesson]"),id=card.dataset.lesson;state.done=state.done||{};state.done[id]=!state.done[id];writeState(state);render();document.querySelector(`[data-lesson="${CSS.escape(id)}"] .bz-lesson-head`)?.click();return}const timer=e.target.closest("[data-bz-timer]");if(timer){startTimer(Number(timer.dataset.bzTimer)||60);return}if(e.target.closest("[data-bz-stop]")){clearInterval(timerId);timerId=null;document.getElementById("bzTimer").hidden=true;return}if(e.target.closest("[data-bz-metronome]")){const existing=document.querySelector('[data-tool="metronome"]');if(existing)existing.click();return}});
    render();window.gcBeginner={open,render};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
