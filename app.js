(() => {
"use strict";

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORE_KEY = "guitarCoachV2";
const defaultState = {
  version:2, days:{}, totalMinutes:0, totalSwitches:0, tunerSessions:0,
  bestSwitch:null, lessons:{}, ear:{correct:0,total:0}, practiceSessions:0,
  createdAt:Date.now(), lastActive:null
};

let state = loadState();
let deferredInstall = null;

function localDateKey(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORE_KEY)||"null");
    if(raw) return deepMerge(structuredClone(defaultState),raw);
    const old=JSON.parse(localStorage.getItem("guitarCoachV1")||"null");
    if(old){
      return deepMerge(structuredClone(defaultState),{
        days:old.days||{}, totalMinutes:old.totalMinutes||0, totalSwitches:old.totalSwitches||0,
        tunerSessions:old.tunerSessions||0, bestSwitch:old.bestSwitch??null, lastActive:old.lastActive||null
      });
    }
  }catch(e){}
  return structuredClone(defaultState);
}
function deepMerge(base,extra){
  for(const k in extra){
    if(extra[k] && typeof extra[k]==="object" && !Array.isArray(extra[k]) && base[k] && typeof base[k]==="object"){
      base[k]=deepMerge(base[k],extra[k]);
    }else base[k]=extra[k];
  }
  return base;
}
function saveState(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); renderShared(); }
function dayState(key=localDateKey()){
  if(!state.days[key]) state.days[key]={tasks:[false,false,false,false],minutes:0,switches:0,sessions:0};
  if(!Array.isArray(state.days[key].tasks)) state.days[key].tasks=[false,false,false,false];
  return state.days[key];
}
function addMinutes(min){
  min=Math.max(0,Math.round(min));
  if(!min) return;
  const d=dayState(); d.minutes=(d.minutes||0)+min; d.sessions=(d.sessions||0)+1;
  state.totalMinutes=(state.totalMinutes||0)+min; state.practiceSessions=(state.practiceSessions||0)+1; state.lastActive=localDateKey();
  saveState();
}
function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),1800);
}
function formatClock(sec){
  sec=Math.max(0,Math.floor(sec)); return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
}
function activeDays(){
  return Object.keys(state.days).filter(k=>{
    const d=state.days[k]; return (d.minutes||0)>0 || (d.tasks&&d.tasks.some(Boolean)) || (d.switches||0)>0;
  });
}
function streak(){
  const keys=new Set(activeDays());
  if(!keys.size) return 0;
  let d=new Date();
  if(!keys.has(localDateKey(d))) d.setDate(d.getDate()-1);
  let n=0;
  while(keys.has(localDateKey(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function level(){
  const xp=(state.totalMinutes||0)*2+(state.totalSwitches||0)+Object.values(state.lessons||{}).filter(Boolean).length*40;
  return Math.max(1,Math.floor(xp/250)+1);
}
function coachAdvice(){
  const done=dayState().tasks.filter(Boolean).length;
  const lessonDone=Object.values(state.lessons||{}).filter(Boolean).length;
  if((state.totalMinutes||0)===0) return "先把吉他調準，今天只要練 20 分鐘。第一週的目標不是快，而是每一個音都乾淨。";
  if(done<2) return "今天先把基本功補齊：調音後練 C、G、Am、Em 的切換，先慢慢換，不要急著跟原曲速度。";
  if((state.bestSwitch||99)>2.5) return "換和弦還在建立肌肉記憶。每次只練兩個和弦來回切換 10 次，比一次練很多種更有效。";
  if(lessonDone<4) return "你的工具練習已經有累積，接下來把「學習」前四課完成，會比較知道為什麼這樣按、怎麼刷。";
  if((state.ear?.total||0)<10) return "可以開始加一點耳訓：每天 5 題辨認空弦音，之後抓走音會更快。";
  if((state.totalMinutes||0)<300) return "目前重點是穩定練習。和弦乾淨、節奏穩定之後，再追求速度與完整歌曲。";
  return "你的基礎練習量已經建立起來。下一階段可以固定一組歌曲和弦進行，搭配節拍器從慢速逐步加速。";
}

const dailyTasks=[
  {title:"調音",desc:"把六條弦調到標準音",min:2,type:"tool",target:"tuner"},
  {title:"和弦暖身",desc:"C / G / Am / Em 各按 5 次",min:5,type:"practice",target:"switch"},
  {title:"換和弦",desc:"完成 20 次連續切換",min:5,type:"practice",target:"switch"},
  {title:"節奏練習",desc:"70 BPM 刷弦 8 分鐘",min:8,type:"practice",target:"rhythm"}
];

const lessons=[
  {id:"hold",stage:"第 1 階段",title:"拿琴與基本姿勢",desc:"先讓身體放鬆，避免一開始就養成手腕與肩膀出力過度的習慣。",practice:"tuner",steps:[
    ["坐姿","琴身凹槽放在大腿上，琴頸微微抬高，不要低頭追著琴。"],
    ["左手","拇指自然放在琴頸後方，手掌不要整片貼死琴頸。"],
    ["右手","手臂自然搭在琴身，手腕放鬆，先不要用力甩。"]
  ]},
  {id:"tune",stage:"第 1 階段",title:"認識六條弦與調音",desc:"從最粗的第 6 弦到最細的第 1 弦：E、A、D、G、B、E。",practice:"tuner",steps:[
    ["六條弦","由粗到細記成 E A D G B E。"],
    ["一次一條","調音時只撥一條弦，等聲音穩定再轉弦鈕。"],
    ["小幅調整","越接近正確音高，弦鈕轉動幅度越小。"]
  ]},
  {id:"first-chords",stage:"第 2 階段",title:"第一組四個和弦",desc:"先把 C、G、Am、Em 練乾淨，已經能組成大量常見和弦進行。",practice:"switch",steps:[
    ["按在品格後方","手指靠近品絲但不要壓在品絲正上方。"],
    ["指尖立起來","避免碰到隔壁弦造成悶音。"],
    ["逐弦檢查","按好和弦後，六條弦逐一撥，找出哪條沒有清楚發聲。"]
  ]},
  {id:"switch",stage:"第 2 階段",title:"換和弦不要一根一根找",desc:"目標是讓手指形成一個形狀一起移動，而不是每根手指各自找位置。",practice:"switch",steps:[
    ["兩個一組","先練 C↔G、Am↔Em，每組 10 次。"],
    ["先慢再快","每次確定壓準再換下一個，速度自然會上來。"],
    ["記錄時間","用換和弦訓練看平均秒數，不用跟別人比較。"]
  ]},
  {id:"rhythm",stage:"第 3 階段",title:"四拍與基本刷弦",desc:"先把右手像鐘擺一樣保持動作，再決定哪些拍真正碰到弦。",practice:"rhythm",steps:[
    ["四拍","跟著節拍器數 1、2、3、4。"],
    ["八分音符","加入 &：1 & 2 & 3 & 4 &。"],
    ["手不停","即使某一拍不刷到弦，右手仍維持上下擺動。"]
  ]},
  {id:"progression",stage:"第 3 階段",title:"把和弦放進循環",desc:"把 C G Am F 放進固定拍數裡循環，開始從『會按』變成『會彈』。",practice:"progression",steps:[
    ["每個 4 拍","一開始每個和弦停留四拍。"],
    ["先 60–70 BPM","穩定比快重要。"],
    ["不中斷","彈錯先繼續走，不要每次錯一個音就全部停下來。"]
  ]},
  {id:"ear",stage:"第 4 階段",title:"開始訓練耳朵",desc:"不用學樂理才開始耳訓。先從六條空弦辨認聲音就很有用。",practice:"ear",steps:[
    ["先熟悉低高","比較第 6 弦 E2 與第 1 弦 E4 的差異。"],
    ["每天五題","少量但持續，效果比一次做很多題好。"],
    ["答錯重聽","答錯不是扣分，而是在建立聲音記憶。"]
  ]},
  {id:"self-review",stage:"第 4 階段",title:"錄音自我檢查",desc:"錄下 20–60 秒，回放時只檢查一件事：節奏、雜音或換和弦其中一項。",practice:"record",steps:[
    ["短錄音","不要一次錄整首，先錄一小段。"],
    ["一次一個問題","第一次只聽節奏，第二次才檢查雜音。"],
    ["再錄一次","修正後立刻錄第二次，比較差異。"]
  ]}
];

const chords={
  C:{frets:["x",3,2,0,1,0],f:[0,3,2,0,1,0],level:"easy",tip:"初學核心和弦。第 1 指壓 B 弦第 1 格，注意不要碰到最細 E 弦。"},
  Cm:{frets:["x",3,5,5,4,3],f:[0,1,3,4,2,1],barre:3,level:"barre",tip:"從第 5 弦開始刷，食指橫按第 3 格。"},
  C7:{frets:["x",3,2,3,1,0],f:[0,3,2,4,1,0],level:"easy",tip:"在 C 和弦上增加 G 弦第 3 格。"},
  D:{frets:["x","x",0,2,3,2],f:[0,0,0,1,3,2],level:"easy",tip:"只刷下面四條弦，三根手指靠近但不要互相壓住。"},
  Dm:{frets:["x","x",0,2,3,1],f:[0,0,0,2,3,1],level:"easy",tip:"第 1 弦第 1 格是常見悶音點，食指要立起來。"},
  D7:{frets:["x","x",0,2,1,2],f:[0,0,0,2,1,3],level:"easy",tip:"三根手指形成小三角形，只刷下面四條弦。"},
  E:{frets:[0,2,2,1,0,0],f:[0,2,3,1,0,0],level:"easy",tip:"六條弦都可以刷，注意 G 弦第 1 格要清楚。"},
  Em:{frets:[0,2,2,0,0,0],f:[0,2,3,0,0,0],level:"easy",tip:"最適合第一天學的和弦之一，六條弦都可以刷。"},
  E7:{frets:[0,2,0,1,0,0],f:[0,2,0,1,0,0],level:"easy",tip:"從 E 和弦拿掉 D 弦上的手指即可。"},
  F:{frets:[1,3,3,2,1,1],f:[1,3,4,2,1,1],barre:1,level:"barre",tip:"完整 F 需要食指橫按第 1 格。初期可以先練小 F：只按最細四條弦。"},
  Fmaj7:{frets:["x","x",3,2,1,0],f:[0,0,3,2,1,0],level:"easy",tip:"比完整 F 友善，適合還沒練好大橫按時使用。"},
  G:{frets:[3,2,0,0,0,3],f:[2,1,0,0,0,3],level:"easy",tip:"六條弦都可刷。移到 C 時盡量讓手指一起移動。"},
  G7:{frets:[3,2,0,0,0,1],f:[3,2,0,0,0,1],level:"easy",tip:"最細 E 弦第 1 格要用食指，六條弦都可刷。"},
  A:{frets:["x",0,2,2,2,0],f:[0,0,1,2,3,0],level:"easy",tip:"三根手指集中在第 2 格，從第 5 弦開始刷。"},
  Am:{frets:["x",0,2,2,1,0],f:[0,0,2,3,1,0],level:"easy",tip:"形狀像 E 和弦整體往下移一條弦。"},
  A7:{frets:["x",0,2,0,2,0],f:[0,0,2,0,3,0],level:"easy",tip:"只需要兩根手指，從第 5 弦開始刷。"},
  B7:{frets:["x",2,1,2,0,2],f:[0,2,1,3,0,4],level:"easy",tip:"常用在 E 調歌曲，四根手指較擠，先慢慢定位。"}
};

function drawChord(canvas,name){
  const d=chords[name]; if(!d||!canvas)return;
  const ctx=canvas.getContext("2d"), W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const L=65,T=42,w=190,h=160,sg=w/5,fg=h/5;
  ctx.strokeStyle="#16181d";ctx.fillStyle="#16181d";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineCap="round";
  for(let i=0;i<6;i++){const x=L+i*sg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+h);ctx.stroke()}
  for(let i=0;i<=5;i++){const y=T+i*fg;ctx.lineWidth=i===0?5:2;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(L+w,y);ctx.stroke()}
  ctx.font="16px sans-serif";
  d.frets.forEach((fr,i)=>{
    const x=L+i*sg;
    if(fr==="x")ctx.fillText("×",x,18);
    else if(fr===0){ctx.beginPath();ctx.arc(x,18,7,0,Math.PI*2);ctx.stroke()}
    else{
      const y=T+(fr-.5)*fg;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();
      if(d.f[i]){ctx.fillStyle="#fff";ctx.font="12px sans-serif";ctx.fillText(d.f[i],x,y+1);ctx.fillStyle="#16181d";ctx.font="16px sans-serif"}
    }
  });
  if(d.barre){
    const y=T+(d.barre-.5)*fg;ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(L+2,y);ctx.lineTo(L+w-2,y);ctx.stroke()
  }
  ctx.fillStyle="#737780";ctx.font="11px sans-serif";["6","5","4","3","2","1"].forEach((s,i)=>ctx.fillText(s,L+i*sg,T+h+24));
}

function route(name){
  stopTransientAudio();
  $$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));
  $$("[data-route]").forEach(b=>b.classList.toggle("active",b.dataset.route===name));
  if(name==="progress") renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-route]").forEach(b=>b.addEventListener("click",()=>route(b.dataset.route)));

function renderDaily(){
  const d=dayState();
  $("#dailyList").innerHTML=dailyTasks.map((t,i)=>`
    <div class="daily-item ${d.tasks[i]?"done":""}">
      <button class="daily-check" data-daily-check="${i}" aria-label="完成 ${t.title}">${d.tasks[i]?"✓":i+1}</button>
      <button class="daily-open" data-daily-open="${i}" style="border:0;background:none;text-align:left;padding:0">
        <div class="daily-title">${t.title}</div><div class="daily-desc">${t.desc}</div>
      </button>
      <span class="daily-time">${t.min} 分</span>
    </div>`).join("");
  $$("[data-daily-check]").forEach(b=>b.onclick=()=>toggleDaily(+b.dataset.dailyCheck));
  $$("[data-daily-open]").forEach(b=>b.onclick=()=>openDaily(+b.dataset.dailyOpen));
  const done=d.tasks.filter(Boolean).length,pct=Math.round(done/dailyTasks.length*100);
  $("#dailyPercent").textContent=pct+"%";$("#dailyRing").style.setProperty("--p",pct);$("#dailyTime").textContent="約 "+dailyTasks.reduce((a,t)=>a+(d.tasks[dailyTasks.indexOf(t)]?0:t.min),0)+" 分鐘";
}
function toggleDaily(i){
  const d=dayState(),was=d.tasks[i];d.tasks[i]=!was;
  if(!was){d.minutes=(d.minutes||0)+dailyTasks[i].min;state.totalMinutes=(state.totalMinutes||0)+dailyTasks[i].min;state.lastActive=localDateKey();toast("完成："+dailyTasks[i].title)}
  else{d.minutes=Math.max(0,(d.minutes||0)-dailyTasks[i].min);state.totalMinutes=Math.max(0,(state.totalMinutes||0)-dailyTasks[i].min)}
  saveState();renderDaily();
}
function openDaily(i){
  const t=dailyTasks[i];
  if(t.type==="tool") openTool(t.target); else openPractice(t.target);
}
$("#startDailyBtn").onclick=()=>{const d=dayState(),i=d.tasks.findIndex(x=>!x);openDaily(i<0?0:i)};

function renderLessons(){
  $("#learningPath").innerHTML=lessons.map((l,i)=>`
    <button class="lesson-card ${state.lessons[l.id]?"done":""}" data-lesson="${l.id}">
      <span class="lesson-num">${state.lessons[l.id]?"✓":String(i+1).padStart(2,"0")}</span>
      <span><h3>${l.title}</h3><p>${l.desc}</p></span><i>→</i>
    </button>`).join("");
  $$("[data-lesson]").forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));
}
let currentLesson=null;
function openLesson(id){
  const l=lessons.find(x=>x.id===id); if(!l)return; currentLesson=l;
  $("#learningPath").classList.add("hidden");$("#lessonPanel").classList.remove("hidden");
  $("#lessonStage").textContent=l.stage;$("#lessonTitle").textContent=l.title;$("#lessonIntro").textContent=l.desc;
  $("#lessonSteps").innerHTML=l.steps.map((s,i)=>`<div class="lesson-step"><b>${i+1}</b><div><strong>${s[0]}</strong><span>${s[1]}</span></div></div>`).join("");
  $("#completeLessonBtn").textContent=state.lessons[l.id]?"已完成":"完成這一課";
}
$("#closeLesson").onclick=()=>{$("#lessonPanel").classList.add("hidden");$("#learningPath").classList.remove("hidden")};
$("#lessonPracticeBtn").onclick=()=>{if(!currentLesson)return;["tuner","metronome"].includes(currentLesson.practice)?openTool(currentLesson.practice):openPractice(currentLesson.practice)};
$("#completeLessonBtn").onclick=()=>{if(!currentLesson)return;state.lessons[currentLesson.id]=true;saveState();renderLessons();$("#completeLessonBtn").textContent="已完成";toast("課程完成："+currentLesson.title)};

function openPractice(mode){
  route("practice");setPracticeMode(mode);
}
function setPracticeMode(mode){
  $$("#practiceTabs button").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $$(".practice-mode").forEach(v=>v.classList.toggle("active",v.id==="practice-"+mode));
  if(mode==="switch") startSwitchClock();
}
$$("#practiceTabs button").forEach(b=>b.onclick=()=>{stopTransientAudio();setPracticeMode(b.dataset.mode)});
$$("[data-practice]").forEach(b=>b.onclick=()=>openPractice(b.dataset.practice));

function openTool(tool){
  route("tools");setTool(tool);
}
function setTool(tool){
  $$(".tool-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tooltab===tool));
  $$(".tool-view").forEach(v=>v.classList.toggle("active",v.id==="tool-"+tool));
  if(tool==="chords")renderChordLibrary();
  if(tool==="fretboard")renderFretboard();
}
$$(".tool-tabs button").forEach(b=>b.onclick=()=>{stopTransientAudio();setTool(b.dataset.tooltab)});
$$("[data-tool]").forEach(b=>b.onclick=()=>openTool(b.dataset.tool));

let switchSeq=[],switchIndex=0,switchTimes=[],switchCount=0,switchLast=performance.now(),switchStarted=null,switchClockTimer=null;
const switchPool=["C","G","Am","Em","Fmaj7","Dm","D","A","E"];
function newSwitchSequence(){
  switchSeq=[];
  while(switchSeq.length<4){
    const c=switchPool[Math.floor(Math.random()*switchPool.length)];
    if(!switchSeq.length||switchSeq.at(-1)!==c)switchSeq.push(c);
  }
  switchIndex=0;switchTimes=[];switchCount=0;switchLast=performance.now();switchStarted=Date.now();renderSwitch();
}
function renderSwitch(){
  const name=switchSeq[switchIndex]||"C";$("#switchChord").textContent=name;drawChord($("#switchChordCanvas"),name);
  $("#switchSequence").innerHTML=switchSeq.map((c,i)=>`<span class="${i===switchIndex?"active":""}">${c}</span>`).join("");
  $("#switchSessionCount").textContent=switchCount;
  $("#switchAvg").textContent=(switchTimes.length?switchTimes.reduce((a,b)=>a+b,0)/switchTimes.length:0).toFixed(1)+"s";
  $("#switchBest").textContent=state.bestSwitch?state.bestSwitch.toFixed(1)+"s":"—";
}
function startSwitchClock(){
  if(!switchStarted)switchStarted=Date.now();
  clearInterval(switchClockTimer);switchClockTimer=setInterval(()=>$("#switchTimer").textContent=formatClock((Date.now()-switchStarted)/1000),500)
}
function finishSwitchSession(){
  if(!switchStarted)return;
  const min=Math.floor((Date.now()-switchStarted)/60000); if(min>0)addMinutes(min);
  switchStarted=null;clearInterval(switchClockTimer);
}
$("#switchNextBtn").onclick=()=>{
  const now=performance.now(),sec=(now-switchLast)/1000;switchLast=now;
  if(switchCount>0&&sec<20){switchTimes.push(sec);if(state.bestSwitch===null||sec<state.bestSwitch)state.bestSwitch=sec}
  switchCount++;state.totalSwitches=(state.totalSwitches||0)+1;dayState().switches=(dayState().switches||0)+1;state.lastActive=localDateKey();
  switchIndex=(switchIndex+1)%switchSeq.length;saveState();renderSwitch()
};
$("#switchNewBtn").onclick=()=>{finishSwitchSession();newSwitchSequence();startSwitchClock();toast("已換一組和弦")};

let sharedAudioCtx=null;
function audioContext(){if(!sharedAudioCtx)sharedAudioCtx=new(window.AudioContext||window.webkitAudioContext)();return sharedAudioCtx}
function tone(freq,duration=.08,volume=.25,type="sine"){
  const ctx=audioContext(),o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)
}

let progressionTimer=null,progressionBeat=0,progressionChordIndex=0,progressionStartTime=null;
function parseProgression(){
  const raw=$("#progressionInput").value.trim().replace(/[,|]+/g," ");
  return raw.split(/\s+/).filter(Boolean).filter(c=>chords[c]);
}

const keyProfiles={
  "C 大調 / Am 小調":["C","Dm","Em","F","G","Am"],
  "G 大調 / Em 小調":["G","Am","B7","C","D","Em"],
  "D 大調 / Bm 小調":["D","Em","F#m","G","A","Bm"],
  "A 大調 / F#m 小調":["A","Bm","C#m","D","E","F#m"],
  "E 大調 / C#m 小調":["E","F#m","G#m","A","B7","C#m"],
  "F 大調 / Dm 小調":["F","Gm","Am","A7","Bb","C","Dm"]
};
function estimateKey(arr){
  if(!arr.length)return null;
  let best=null,bestScore=-1;
  for(const [name,profile] of Object.entries(keyProfiles)){
    let score=0;
    arr.forEach(ch=>{if(profile.includes(ch))score+=1});
    if(score>bestScore){bestScore=score;best=name}
  }
  return {name:best,confidence:Math.round(bestScore/arr.length*100)}
}
function renderProgressionPreview(){
  const arr=parseProgression();$("#progressionPreview").innerHTML=arr.map((c,i)=>`<span class="${i===progressionChordIndex?"active":""}">${c}</span>`).join("");
  if(arr.length)$("#currentProgressionChord").textContent=arr[progressionChordIndex%arr.length];
  const key=estimateKey(arr);$("#detectedKey").textContent=key?key.name:"—";$("#keyConfidence").textContent=key?"（符合度 "+key.confidence+"%）":"";
}
$("#progressionInput").oninput=()=>{progressionChordIndex=0;renderProgressionPreview()};
$("#progressionStart").onclick=()=>{
  stopProgression(false);const arr=parseProgression();if(!arr.length){toast("請輸入可辨識的和弦，例如 C G Am F");return}
  const bpm=Math.max(40,Math.min(220,+$("#progressionBpm").value||70)),beats=+$("#beatsPerChord").value||4,ms=60000/bpm;
  progressionBeat=0;progressionChordIndex=0;progressionStartTime=Date.now();renderProgressionPreview();
  const tick=()=>{
    tone(progressionBeat%beats===0?920:680,.06,progressionBeat%beats===0?.25:.14,"square");
    $("#progressionBeat").textContent="第 "+((progressionBeat%beats)+1)+" / "+beats+" 拍";
    if(progressionBeat>0&&progressionBeat%beats===0){progressionChordIndex=(progressionChordIndex+1)%arr.length;renderProgressionPreview()}
    progressionBeat++;
  };tick();progressionTimer=setInterval(tick,ms);$("#progressionStart").textContent="重新開始"
};
function stopProgression(save=true){
  if(progressionTimer){clearInterval(progressionTimer);progressionTimer=null}
  if(save&&progressionStartTime){const min=Math.floor((Date.now()-progressionStartTime)/60000);if(min>0)addMinutes(min)}
  progressionStartTime=null;$("#progressionBeat").textContent="準備開始";$("#progressionStart").textContent="開始循環"
}
$("#progressionStop").onclick=()=>stopProgression(true);

const patterns=[
  {name:"全下刷",pattern:["↓","·","↓","·","↓","·","↓","·"],hint:"最基礎"},
  {name:"流行基本",pattern:["↓","·","↓","↑","·","↑","↓","↑"],hint:"常見八拍"},
  {name:"連續八拍",pattern:["↓","↑","↓","↑","↓","↑","↓","↑"],hint:"手不停"},
  {name:"留空拍",pattern:["↓","·","·","↑","↓","·","↓","↑"],hint:"練控制"},
  {name:"反拍",pattern:["·","↑","·","↑","·","↑","·","↑"],hint:"練 & 拍"},
  {name:"慢歌型",pattern:["↓","·","↓","↑","↓","·","↓","↑"],hint:"穩定優先"}
];
let rhythmPattern=1,rhythmStep=0,rhythmTimer=null,rhythmStarted=null;
function renderPatterns(){
  $("#patternPicker").innerHTML=patterns.map((p,i)=>`<button class="${i===rhythmPattern?"active":""}" data-pattern="${i}"><strong>${p.name}</strong><span>${p.hint}</span></button>`).join("");
  $("#strumPattern").innerHTML=patterns[rhythmPattern].pattern.map(x=>`<span>${x}</span>`).join("");
  $$("[data-pattern]").forEach(b=>b.onclick=()=>{rhythmPattern=+b.dataset.pattern;renderPatterns()})
}
function startRhythm(){
  const bpm=+$("#rhythmBpm").value||70,ms=60000/bpm/2;rhythmStep=0;rhythmStarted=Date.now();
  const tick=()=>{const pat=patterns[rhythmPattern].pattern;const mark=pat[rhythmStep];if(mark!=="·")tone(rhythmStep%2===0?820:670,.05,.18,"square");$("#beatCursor").style.transform="translateX("+rhythmStep*100+"%)";rhythmStep=(rhythmStep+1)%8};
  tick();rhythmTimer=setInterval(tick,ms);$("#rhythmToggle").textContent="停止節奏"
}
function stopRhythm(save=true){
  if(rhythmTimer){clearInterval(rhythmTimer);rhythmTimer=null}
  if(save&&rhythmStarted){const min=Math.floor((Date.now()-rhythmStarted)/60000);if(min>0)addMinutes(min)}
  rhythmStarted=null;$("#rhythmToggle").textContent="開始節奏"
}
$("#rhythmToggle").onclick=()=>rhythmTimer?stopRhythm(true):startRhythm();
$("#rhythmSlower").onclick=()=>{let v=+$("#rhythmBpm").value||70;v=Math.max(40,v-5);if(![...$("#rhythmBpm").options].some(o=>+o.value===v)){const o=document.createElement("option");o.value=o.textContent=v;$("#rhythmBpm").appendChild(o)}$("#rhythmBpm").value=v;if(rhythmTimer){stopRhythm(false);startRhythm()}toast("已調慢到 "+v+" BPM")};

const guitarStrings=[{name:"6弦 E",freq:82.41},{name:"5弦 A",freq:110},{name:"4弦 D",freq:146.83},{name:"3弦 G",freq:196},{name:"2弦 B",freq:246.94},{name:"1弦 E",freq:329.63}];
let earMode="strings",earTarget=null;
const intervalChoices=[
  {name:"大二度",semi:2},{name:"大三度",semi:4},{name:"完全四度",semi:5},{name:"完全五度",semi:7},{name:"八度",semi:12}
];
function earBucket(){
  if(!state.ear.modes){
    state.ear.modes={
      strings:{correct:state.ear.correct||0,total:state.ear.total||0},
      intervals:{correct:0,total:0}
    };
  }
  return state.ear.modes[earMode];
}
function renderEarOptions(){
  if(earMode==="strings"){
    $("#earTitle").textContent="聽音找弦";$("#earDescription").textContent="我會播放一個吉他空弦音，猜它是哪一條弦。";
    $("#earOptions").innerHTML=guitarStrings.map((x,i)=>`<button data-ear-answer="${i}">${x.name}</button>`).join("");
  }else{
    $("#earTitle").textContent="兩音音程";$("#earDescription").textContent="會依序播放兩個音，猜第二個音和第一個音相差多遠。";
    $("#earOptions").innerHTML=intervalChoices.map((x,i)=>`<button data-ear-answer="${i}">${x.name}</button>`).join("");
  }
  renderEarStats();
}
function newEarQuestion(){
  earTarget=earMode==="strings"
    ? guitarStrings[Math.floor(Math.random()*guitarStrings.length)]
    : intervalChoices[Math.floor(Math.random()*intervalChoices.length)];
  $("#earFeedback").textContent=earMode==="strings"?"聽完後選一條弦。":"聽兩個音的距離，再選答案。";
  $$(".ear-options button").forEach(b=>b.classList.remove("correct","wrong"));
}
function playEar(){
  if(!earTarget)newEarQuestion();
  if(earMode==="strings"){tone(earTarget.freq,.9,.22,"triangle")}
  else{
    const root=196;
    tone(root,.55,.2,"triangle");
    setTimeout(()=>tone(root*Math.pow(2,earTarget.semi/12),.65,.2,"triangle"),650);
  }
}
$("#playEarTone").onclick=()=>{if(!earTarget)newEarQuestion();playEar()};
$("#earOptions").onclick=e=>{
  const b=e.target.closest("[data-ear-answer]");if(!b)return;
  if(!earTarget){newEarQuestion();playEar();return}
  const idx=+b.dataset.earAnswer;
  const correct=earMode==="strings"?guitarStrings[idx]===earTarget:intervalChoices[idx]===earTarget;
  const bucket=earBucket();bucket.total++;if(correct)bucket.correct++;
  state.ear.correct=(state.ear.modes.strings.correct||0)+(state.ear.modes.intervals.correct||0);
  state.ear.total=(state.ear.modes.strings.total||0)+(state.ear.modes.intervals.total||0);
  b.classList.add(correct?"correct":"wrong");
  const answer=earTarget.name;
  $("#earFeedback").textContent=correct?"答對了："+answer:"答案是 "+answer+"。再聽一次，把聲音差異記起來。";
  renderEarStats();saveState();setTimeout(()=>{newEarQuestion();playEar()},1250)
};
$$("[data-ear-mode]").forEach(b=>b.onclick=()=>{
  earMode=b.dataset.earMode;$$("[data-ear-mode]").forEach(x=>x.classList.toggle("active",x===b));earTarget=null;renderEarOptions();newEarQuestion()
});
function renderEarStats(){
  const bucket=earBucket(),c=bucket.correct||0,t=bucket.total||0;
  $("#earCorrect").textContent=c;$("#earTotal").textContent=t;$("#earRate").textContent=(t?Math.round(c/t*100):0)+"%";
}
let mediaRecorder=null,recordChunks=[],recordTimer=null,recordStarted=null,recordStream=null;
$("#recordBtn").onclick=async()=>{
  try{
    recordStream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];
    mediaRecorder=new MediaRecorder(recordStream);mediaRecorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};
    mediaRecorder.onstop=()=>{const blob=new Blob(recordChunks,{type:mediaRecorder.mimeType||"audio/webm"});$("#recordPlayback").src=URL.createObjectURL(blob);$("#recordPlayback").classList.remove("hidden");recordStream.getTracks().forEach(t=>t.stop());const min=Math.max(1,Math.round((Date.now()-recordStarted)/60000));addMinutes(min);recordStarted=null};
    mediaRecorder.start();recordStarted=Date.now();$("#recordBtn").disabled=true;$("#stopRecordBtn").disabled=false;$("#recDot").classList.add("on");$("#recordStatus").textContent="錄音中";
    recordTimer=setInterval(()=>$("#recordTime").textContent=formatClock((Date.now()-recordStarted)/1000),250)
  }catch(e){toast("請允許瀏覽器使用麥克風")}
};
$("#stopRecordBtn").onclick=()=>{if(mediaRecorder&&mediaRecorder.state!=="inactive")mediaRecorder.stop();clearInterval(recordTimer);$("#recordBtn").disabled=false;$("#stopRecordBtn").disabled=true;$("#recDot").classList.remove("on");$("#recordStatus").textContent="已完成，可直接回放"};

let tunerCtx=null,tunerAnalyser=null,tunerStream=null,tunerRaf=null,tunerBuffer=null,tunerTarget=null;
const noteNames=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
function currentA4(){return Math.max(430,Math.min(450,+$("#a4Calibration").value||440))}
function calibratedFreq(base){return base*(currentA4()/440)}
function updateReferenceLabel(){
  if($("#tunerMode").value==="chromatic"&&!tunerTarget)$("#referenceTone").textContent="播放 A4 "+currentA4()+" Hz";
  else $("#referenceTone").textContent="播放 "+(tunerTarget?tunerTarget.name:"6弦 E")+" 參考音";
}
$("#guitarStrings").innerHTML=guitarStrings.map((x,i)=>`<button data-string="${i}">${x.name.replace("弦 ","")}</button>`).join("");
$("[data-string]").forEach(b=>b.onclick=()=>{tunerTarget=guitarStrings[+b.dataset.string];$("#tunerMode").value="guitar";$("[data-string]").forEach(x=>x.classList.toggle("active",x===b));updateReferenceLabel();toast("目標："+tunerTarget.name)});
$("#a4Calibration").oninput=e=>{$("#a4Value").textContent=e.target.value+" Hz";updateReferenceLabel()};
$("#tunerMode").onchange=()=>{if($("#tunerMode").value==="chromatic"){$("[data-string]").forEach(x=>x.classList.remove("active"));tunerTarget=null}updateReferenceLabel()};
$("#referenceTone").onclick=()=>{const f=tunerTarget?calibratedFreq(tunerTarget.freq):currentA4();tone(f,.9,.2,"triangle")};
function detectPitch(buf,sampleRate){
  let rms=0;for(let i=0;i<buf.length;i++)rms+=buf[i]*buf[i];rms=Math.sqrt(rms/buf.length);if(rms<.012)return-1;
  const minLag=Math.floor(sampleRate/500),maxLag=Math.min(Math.floor(sampleRate/60),buf.length-2);
  let bestLag=-1,best=0;
  for(let lag=minLag;lag<=maxLag;lag++){
    let corr=0;for(let i=0;i<buf.length-lag;i++)corr+=buf[i]*buf[i+lag];
    if(corr>best){best=corr;bestLag=lag}
  }
  if(bestLag<0)return-1;
  return sampleRate/bestLag;
}
function noteFromFreq(freq){
  const exact=69+12*Math.log2(freq/currentA4()),m=Math.round(exact),c=Math.round((exact-m)*100),oct=Math.floor(m/12)-1;
  return {name:noteNames[(m%12+12)%12]+oct,cents:c}
}
function tunerTick(){
  tunerAnalyser.getFloatTimeDomainData(tunerBuffer);const f=detectPitch(tunerBuffer,tunerCtx.sampleRate);
  if(f>60&&f<500){
    const n=noteFromFreq(f);let cents=n.cents,name=n.name;
    let target=$("#tunerMode").value==="guitar"?tunerTarget:null;
    if($("#tunerMode").value==="guitar"&&!target){
      target=guitarStrings.reduce((best,x)=>Math.abs(1200*Math.log2(f/calibratedFreq(x.freq)))<Math.abs(1200*Math.log2(f/calibratedFreq(best.freq)))?x:best,guitarStrings[0]);
    }
    if(target){cents=Math.round(1200*Math.log2(f/calibratedFreq(target.freq)));name=target.name.split(" ").at(-1)}
    cents=Math.max(-50,Math.min(50,cents));$("#tunerNote").textContent=name;$("#tunerFreq").textContent=f.toFixed(1)+" Hz";$("#tunerNeedle").style.transform="translateX("+cents*2+"px)";
    if(Math.abs(cents)<=5){$("#tunerStatus").textContent="音準很好";$("#tunerStatus").style.color="#2f7d5c"}else{$("#tunerStatus").textContent=(cents<0?"偏低 ":"偏高 ")+Math.abs(cents)+" cents";$("#tunerStatus").style.color="#a86b1b"}
  }else{$("#tunerFreq").textContent="請撥一條弦";$("#tunerStatus").textContent="等待聲音"}
  tunerRaf=requestAnimationFrame(tunerTick)
}
$("#tunerStart").onclick=async()=>{
  try{
    tunerCtx=new(window.AudioContext||window.webkitAudioContext)();tunerStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=tunerCtx.createMediaStreamSource(tunerStream);tunerAnalyser=tunerCtx.createAnalyser();tunerAnalyser.fftSize=2048;tunerBuffer=new Float32Array(tunerAnalyser.fftSize);src.connect(tunerAnalyser);
    $("#tunerStart").disabled=true;$("#tunerStop").disabled=false;$("#micNote").classList.add("hidden");state.tunerSessions=(state.tunerSessions||0)+1;saveState();tunerTick()
  }catch(e){toast("請確認瀏覽器已允許麥克風權限")}
};
function stopTuner(){
  cancelAnimationFrame(tunerRaf);if(tunerStream)tunerStream.getTracks().forEach(t=>t.stop());if(tunerCtx)tunerCtx.close();
  tunerCtx=tunerAnalyser=tunerStream=tunerRaf=null;$("#tunerStart").disabled=false;$("#tunerStop").disabled=true;$("#tunerNote").textContent="—";$("#tunerFreq").textContent="等待開始";$("#tunerStatus").textContent="尚未開始";$("#tunerNeedle").style.transform="translateX(0)"
}
$("#tunerStop").onclick=stopTuner;

let metroTimer=null,metroOn=false,metroBeat=0,tapTimes=[];
function currentBpm(){return Math.max(40,Math.min(220,+$("#metroRange").value||70))}
function setMetroBpm(v){v=Math.max(40,Math.min(220,Math.round(v)));$("#metroRange").value=v;$("#metroBpm").textContent=v;if(metroOn){stopMetro();startMetro()}}
function metroClick(){
  const beats=+$("#timeSignature").value||4,accent=metroBeat%beats===0,vol=+$("#metroVolume").value||.35;tone(accent?1050:760,.045,vol*(accent?1:.65),"square");
  $("#metroOrb").classList.add("flash");setTimeout(()=>$("#metroOrb").classList.remove("flash"),70);metroBeat++
}
function startMetro(){metroOn=true;metroBeat=0;$("#metroToggle").textContent="停止";metroClick();metroTimer=setInterval(metroClick,60000/currentBpm())}
function stopMetro(){metroOn=false;clearInterval(metroTimer);metroTimer=null;$("#metroToggle").textContent="開始"}
$("#metroRange").oninput=e=>{const v=+e.target.value;$("#metroBpm").textContent=v;if(metroOn){stopMetro();startMetro()}};
$$("[data-bpm]").forEach(b=>b.onclick=()=>setMetroBpm(+b.dataset.bpm));
$("#metroToggle").onclick=()=>metroOn?stopMetro():startMetro();
$("#tapTempo").onclick=()=>{const now=performance.now();tapTimes.push(now);if(tapTimes.length>6)tapTimes.shift();if(tapTimes.length>=2){const diffs=tapTimes.slice(1).map((t,i)=>t-tapTimes[i]),avg=diffs.reduce((a,b)=>a+b,0)/diffs.length;setMetroBpm(60000/avg)}toast("繼續跟著速度點")};

function renderChordLibrary(){
  const q=$("#chordSearch").value.trim().toLowerCase(),filter=$("#chordDifficulty").value;
  const names=Object.keys(chords).filter(n=>(!q||n.toLowerCase().includes(q))&&(filter==="all"||chords[n].level===filter));
  $("#chordLibrary").innerHTML=names.map(n=>`<button class="chord-tile" data-chord="${n}"><strong>${n}</strong><span>${chords[n].level==="barre"?"橫按":"常用和弦"}</span></button>`).join("");
  $$("[data-chord]").forEach(b=>b.onclick=()=>openChordDetail(b.dataset.chord))
}
function openChordDetail(name){$("#chordLibrary").parentElement.classList.add("hidden");$("#chordDetail").classList.remove("hidden");$("#detailChordName").textContent=name;$("#detailChordTip").textContent=chords[name].tip;drawChord($("#detailChordCanvas"),name)}
$("#closeChordDetail").onclick=()=>{$("#chordDetail").classList.add("hidden");$("#chordLibrary").parentElement.classList.remove("hidden")};
$("#chordSearch").oninput=renderChordLibrary;$("#chordDifficulty").onchange=renderChordLibrary;


const scaleRoots=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const scalePatterns={
  major:[0,2,4,5,7,9,11],
  minor:[0,2,3,5,7,8,10],
  pentatonicMajor:[0,2,4,7,9],
  pentatonicMinor:[0,3,5,7,10],
  blues:[0,3,5,6,7,10]
};
const openMidi=[40,45,50,55,59,64];
$("#scaleRoot").innerHTML=scaleRoots.map((n,i)=>`<option value="${i}" ${n==="C"?"selected":""}>${n}</option>`).join("");
function renderFretboard(){
  const root=+$("#scaleRoot").value||0,pattern=scalePatterns[$("#scaleType").value]||scalePatterns.major;
  const pcs=new Set(pattern.map(i=>(root+i)%12));
  $("#scaleNotes").innerHTML=pattern.map(i=>{const pc=(root+i)%12;return `<span class="scale-note ${pc===root?"root":""}">${scaleRoots[pc]}</span>`}).join("");
  let html="";
  const labels=["6E","5A","4D","3G","2B","1E"];
  openMidi.forEach((midi,stringIndex)=>{
    html+=`<div class="fret-string-label">${labels[stringIndex]}</div>`;
    for(let fret=0;fret<=12;fret++){
      const noteMidi=midi+fret,pc=((noteMidi%12)+12)%12,note=scaleRoots[pc],active=pcs.has(pc),rootClass=pc===root;
      html+=`<button class="fret-cell ${fret===0?"open":""} ${active?"in-scale":""} ${rootClass?"root":""}" data-fret-midi="${noteMidi}" title="${note} / 第 ${fret} 格"><span>${note}</span></button>`;
    }
  });
  $("#fretboardGrid").innerHTML=html;
}
$("#scaleRoot").onchange=renderFretboard;$("#scaleType").onchange=renderFretboard;
$("#fretboardGrid").onclick=e=>{const cell=e.target.closest("[data-fret-midi]");if(!cell)return;const midi=+cell.dataset.fretMidi;const freq=currentA4()*Math.pow(2,(midi-69)/12);tone(freq,.7,.16,"triangle")};
function renderWeek(){
  const days=[];let total=0;
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=localDateKey(d),min=state.days[k]?.minutes||0;total+=min;days.push({d,k,min,today:i===0})}
  const max=Math.max(20,...days.map(x=>x.min));
  $("#weekChart").innerHTML=days.map(x=>`<div class="week-day ${x.today?"today":""}"><b>${x.min?x.min+"m":""}</b><div class="bar-track"><div class="bar-fill" style="height:${Math.max(2,x.min/max*100)}%"></div></div><small>${["日","一","二","三","四","五","六"][x.d.getDay()]}</small></div>`).join("");
  $("#weekMinutes").textContent=total+" 分鐘"
}
function renderAchievements(){
  const items=[
    ["第一次拿起吉他",(state.totalMinutes||0)>=1,"完成第一次練習"],
    ["三日習慣",activeDays().length>=3,"累積 3 個練習日"],
    ["一小時",state.totalMinutes>=60,"累積練習 60 分鐘"],
    ["百次切換",state.totalSwitches>=100,"完成 100 次換和弦"],
    ["耳朵開始醒了",(state.ear.total||0)>=10,"完成 10 題耳訓"],
    ["基礎課畢業",Object.values(state.lessons).filter(Boolean).length>=8,"完成全部 8 堂基礎課"]
  ];
  $("#achievements").innerHTML=items.map(a=>`<div class="achievement ${a[1]?"unlocked":""}"><strong>${a[1]?"✓ ":""}${a[0]}</strong><span>${a[2]}</span></div>`).join("")
}
function renderProgress(){
  $("#statStreak").textContent=streak()+" 天";$("#statMinutes").textContent=(state.totalMinutes||0)+" 分";$("#statDays").textContent=activeDays().length+" 天";$("#statSwitches").textContent=(state.totalSwitches||0)+" 次";$("#progressAdvice").textContent=coachAdvice();renderWeek();renderAchievements()
}
function renderShared(){
  $("#streakCount").textContent=streak();$("#levelBadge").textContent="Lv."+level();$("#coachAdvice").textContent=coachAdvice();renderDaily();renderLessons();renderEarStats();renderProgress()
}

$("#exportData").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="guitar-coach-backup-"+localDateKey()+".json";a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")
};
$("#importData").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const obj=JSON.parse(await f.text());state=deepMerge(structuredClone(defaultState),obj);saveState();toast("備份已匯入")}catch(err){toast("這個備份檔無法讀取")}
  e.target.value=""
};
$("#resetData").onclick=()=>{if(confirm("確定清除所有 Guitar Coach 練習紀錄？這無法復原。")){state=structuredClone(defaultState);localStorage.removeItem(STORE_KEY);saveState();toast("紀錄已清除")}};

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden")};

function stopTransientAudio(){
  if(metroOn)stopMetro();
  if(rhythmTimer)stopRhythm(true);
  if(progressionTimer)stopProgression(true);
  if(tunerStream)stopTuner();
}
window.addEventListener("pagehide",()=>{finishSwitchSession();stopTransientAudio()});

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

newSwitchSequence();
renderPatterns();
renderProgressionPreview();
renderChordLibrary();
renderFretboard();
renderEarOptions();
newEarQuestion();
updateReferenceLabel();
renderShared();
})();