(() => {
"use strict";
const localStorage=window.gcProfiles?.store||{getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value),removeItem:key=>window.localStorage.removeItem(key)};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORE_KEY = "guitarCoachV2";
const TEACHER_DRAFT_KEY = "guitarCoachTeacherDraftV1";
// Storage restrictions must not stop navigation or notebook initialization.
const storage=window.gcStorage={
  warn(){
    if(document.getElementById("gcStorageFailure"))return;
    const banner=document.createElement("section");banner.id="gcStorageFailure";banner.setAttribute("role","alert");
    banner.textContent="本機儲存目前無法使用。操作可以繼續，但新增內容可能無法保留；關閉頁面前請匯出備份。";
    document.body.prepend(banner);
  },
  getItem(key){try{return localStorage.getItem(key)}catch(e){this.warn();return null}},
  setPreference(key,value){try{localStorage.setItem(key,value);return true}catch(e){this.warn();return false}},
  removePreference(key){try{localStorage.removeItem(key);return true}catch(e){this.warn();return false}}
};

// Validate imported structures before merging or rendering; preserve safe unknown fields.
const UNSAFE_KEYS=new Set(['__proto__','constructor','prototype']);
function assertSafeData(root){let visited=0;function visit(value,depth){if(++visited>100000||depth>40)throw new Error('資料結構過大');if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(UNSAFE_KEYS.has(key))throw new Error('不安全的資料欄位');visit(value[key],depth+1)}}visit(root,0);return root}
function parseSafeData(text){return assertSafeData(JSON.parse(text))}
window.gcSecurity={parse:parseSafeData,validate:assertSafeData};
function validateStateShape(obj){assertSafeData(obj);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('學習資料格式錯誤');for(const k of ['days','lessons','ear'])if(k in obj&&(!obj[k]||typeof obj[k]!=='object'||Array.isArray(obj[k])))throw new Error('練習資料格式錯誤');for(const k of ['teacherLessons','teacherPrepQuestions'])if(k in obj&&!Array.isArray(obj[k]))throw new Error('課堂格式錯誤');for(const r of obj.teacherLessons||[]){if(!r||typeof r!=='object')throw new Error('課堂格式錯誤');for(const k of ['homework','questions','tags'])if(k in r&&!Array.isArray(r[k]))throw new Error('課堂格式錯誤');for(const k of ['homework','questions'])if((r[k]||[]).some(x=>!x||typeof x!=='object'))throw new Error('課堂項目格式錯誤')}return obj}
function cloneData(value){return typeof window.structuredClone==="function"?window.structuredClone(value):JSON.parse(JSON.stringify(value))}
const defaultState = {
  version:2, days:{}, totalMinutes:0, totalSwitches:0, tunerSessions:0,
  bestSwitch:null, lessons:{}, ear:{correct:0,total:0}, practiceSessions:0,
  teacherLessons:[], teacherPrepQuestions:[],
  createdAt:Date.now(), lastActive:null
};

let state = loadState();
let deferredInstall = null;

const MEDIA_DB_NAME=window.gcProfiles?.dbName||"guitarCoachMediaV1";
const MEDIA_STORE="lessonMedia";
let mediaDbPromise=null;
const mediaUrls=new Map();

function openMediaDb(){
  if(window.gcProfiles&&!window.gcProfiles.canRead())return Promise.reject(new Error("Profile is locked"));
  if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB unavailable"));
  if(mediaDbPromise)return mediaDbPromise;
  mediaDbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(MEDIA_DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(MEDIA_STORE)){
        const store=db.createObjectStore(MEDIA_STORE,{keyPath:"id"});
        store.createIndex("lessonId","lessonId",{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("IndexedDB open failed"));
  });
  return mediaDbPromise;
}
async function putLessonMedia(item){
  const db=await openMediaDb();
  if(window.gcProfiles&&!window.gcProfiles.canWrite())throw new Error("Profile data has been cleared");
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    tx.objectStore(MEDIA_STORE).put(item);
    tx.oncomplete=()=>resolve(item);
    tx.onerror=()=>reject(tx.error);
  });
}
async function getLessonMedia(lessonId){
  if(!lessonId)return[];
  const db=await openMediaDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readonly");
    const req=tx.objectStore(MEDIA_STORE).index("lessonId").getAll(lessonId);
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)));
    req.onerror=()=>reject(req.error);
  });
}
async function getAllLessonMedia(){
  const db=await openMediaDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readonly");
    const req=tx.objectStore(MEDIA_STORE).getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}
async function deleteLessonMediaItem(id){
  const db=await openMediaDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.oncomplete=()=>{
      const url=mediaUrls.get(id);if(url)URL.revokeObjectURL(url);mediaUrls.delete(id);resolve();
    };
    tx.onerror=()=>reject(tx.error);
  });
}
async function deleteLessonMediaForLesson(lessonId){
  const items=await getLessonMedia(lessonId);
  await Promise.all(items.map(x=>deleteLessonMediaItem(x.id)));
}
async function clearAllLessonMedia(){
  try{
    const db=await openMediaDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(MEDIA_STORE,"readwrite");
      tx.objectStore(MEDIA_STORE).clear();
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    mediaUrls.forEach(url=>URL.revokeObjectURL(url));mediaUrls.clear();
  }catch(e){}
}
function mediaUrl(item){
  if(mediaUrls.has(item.id))return mediaUrls.get(item.id);
  const url=URL.createObjectURL(item.blob);mediaUrls.set(item.id,url);return url;
}
async function compressTeacherPhoto(file){
  try{
    const bitmap=await createImageBitmap(file);
    const max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));
    return blob||file;
  }catch(e){return file}
}

function localDateKey(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
function loadState(){
  try{
    const raw=parseSafeData(storage.getItem(STORE_KEY)||"null");
    if(raw) return deepMerge(cloneData(defaultState),validateStateShape(raw));
    const old=parseSafeData(storage.getItem("guitarCoachV1")||"null");
    if(old){
      return deepMerge(cloneData(defaultState),{
        days:old.days||{}, totalMinutes:old.totalMinutes||0, totalSwitches:old.totalSwitches||0,
        tunerSessions:old.tunerSessions||0, bestSwitch:old.bestSwitch??null, lastActive:old.lastActive||null
      });
    }
  }catch(e){}
  return cloneData(defaultState);
}
function deepMerge(base,extra){
  for(const k of Object.keys(extra)){
    if(UNSAFE_KEYS.has(k))throw new Error("不安全的資料欄位");
    if(extra[k] && typeof extra[k]==="object" && !Array.isArray(extra[k]) && base[k] && typeof base[k]==="object"){
      base[k]=deepMerge(base[k],extra[k]);
    }else base[k]=extra[k];
  }
  return base;
}
function saveState(){ try{localStorage.setItem(STORE_KEY,JSON.stringify(state))}catch(e){storage.warn()} renderShared(); }
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
  if(!["home","learn","practice","tools","progress"].includes(name))return;
  if(name!=="learn"&&!$("#teacherLessonForm")?.classList.contains("hidden"))closeTeacherForm();
  stopTransientAudio();
  $$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));
  $$("[data-route]").forEach(b=>b.classList.toggle("active",b.dataset.route===name));
  if(name==="progress") renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-route]").forEach(b=>b.addEventListener("click",()=>route(b.dataset.route)));

function esc(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

/* Teacher lesson log */
let currentTeacherLessonId=null;
let currentTeacherMediaOwner=null;
let teacherMediaRecorder=null;
let teacherMediaFinished=Promise.resolve(),teacherMediaResolve=null;
let teacherMediaStream=null;
let teacherMediaChunks=[];
let teacherMediaStartedAt=0;
let teacherMediaTimer=null;

function setLearnView(view){
  if(view!=="teacher"&&!$("#teacherLessonForm")?.classList.contains("hidden"))closeTeacherForm();
  $$("#learnTabs button").forEach(b=>b.classList.toggle("active",b.dataset.learnView===view));
  $$(".learn-view").forEach(v=>v.classList.toggle("active",v.id==="learn-"+view));
  $("#lessonPanel").classList.add("hidden");
  $("#learningPath").classList.remove("hidden");
  if(view==="teacher")renderTeacherLessons();
}
$$("[data-learn-view]").forEach(b=>b.onclick=()=>setLearnView(b.dataset.learnView));

function openTeacherLog(){
  route("learn");
  setLearnView("teacher");
}
$("#openTeacherLogFromHome")?.addEventListener("click",openTeacherLog);
$("#openTeacherPrep")?.addEventListener("click",openTeacherLog);

function readTeacherDraft(){
  try{return parseSafeData(storage.getItem(TEACHER_DRAFT_KEY)||"null")}catch(e){return null}
}
function writeTeacherDraft(){
  if(!$("#teacherLessonForm")||$("#teacherLessonForm").classList.contains("hidden"))return;
  const draft={
    date:$("#teacherLessonDate").value||localDateKey(),
    teacher:$("#teacherName").value.trim(),
    duration:+$("#teacherDuration").value||60,
    nextDate:$("#nextLessonDate").value||"",
    song:$("#teacherSong").value.trim(),
    bpm:+$("#teacherBpm").value||null,
    topic:$("#teacherTopic").value.trim(),
    notes:$("#teacherNotes").value.trim(),
    problem:$("#teacherProblem").value.trim(),
    questionText:$("#teacherQuestions").value,
    homeworkText:$("#teacherHomework").value,
    tags:[...teacherSelectedTags],
    mediaOwner:currentTeacherMediaOwner,
    savedAt:Date.now()
  };
  try{localStorage.setItem(TEACHER_DRAFT_KEY,JSON.stringify(draft))}catch(e){storage.warn();const status=$("#teacherDraftStatus");if(status)status.textContent="暫存失敗，請先匯出備份";return}
  const status=$("#teacherDraftStatus");
  if(status){
    const t=new Date();
    status.textContent="已自動暫存 "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");
  }
}
let teacherDraftTimer=null;
let teacherSelectedTags=new Set();
function scheduleTeacherDraft(){
  clearTimeout(teacherDraftTimer);
  teacherDraftTimer=setTimeout(writeTeacherDraft,350);
}
function renderTeacherTags(){
  $$("#lessonTagPicker [data-lesson-tag]").forEach(b=>b.classList.toggle("active",teacherSelectedTags.has(b.dataset.lessonTag)));
}

function fillTeacherForm(data={}){
  $("#teacherLessonDate").value=data.date||localDateKey();
  $("#teacherName").value=data.teacher||"";
  $("#teacherDuration").value=String(data.duration||60);
  $("#nextLessonDate").value=data.nextDate||"";
  $("#teacherSong").value=data.song||"";
  $("#teacherBpm").value=data.bpm||"";
  $("#teacherTopic").value=data.topic||"";
  $("#teacherNotes").value=data.notes||"";
  $("#teacherProblem").value=data.problem||"";
  $("#teacherQuestions").value=data.questionText!==undefined
    ? data.questionText
    : (data.questions||[]).map(x=>x.text).join("\n");
  $("#teacherHomework").value=data.homeworkText!==undefined
    ? data.homeworkText
    : (data.homework||[]).map(x=>x.text).join("\n");
  teacherSelectedTags=new Set(Array.isArray(data.tags)?data.tags:[]);
  renderTeacherTags();
}

function openTeacherForm(id=null,seed=null){
  if(!$("#teacherLessonForm"))return;
  currentTeacherLessonId=id;
  const record=id?(state.teacherLessons||[]).find(x=>x.id===id):null;
  let data=record||seed||null;
  let draft=null;
  if(!data&&!id){
    draft=readTeacherDraft();
    if(draft)data=draft;
  }
  currentTeacherMediaOwner=record?.id||data?.mediaOwner||("class-"+Date.now());
  $("#teacherLessonForm").classList.remove("hidden");
  $("#teacherLessonEmpty").classList.add("hidden");
  $("#teacherFormTitle").textContent=record?"編輯課堂筆記":"新增課堂筆記";
  fillTeacherForm(data||{date:localDateKey()});
  const status=$("#teacherDraftStatus");
  if(status)status.textContent=(!record&&draft)?"已恢復上次未儲存草稿":"會自動暫存，不怕上課中途關掉。";
  renderTeacherMediaPreview();
  refreshTeacherStorageUsage();
  $("#teacherLessonForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeTeacherForm(){
  window.gcNotebook?.flush();
  document.body.classList.remove("classroom-focus");
  const focusButton=$("#classroomFocusBtn");if(focusButton)focusButton.textContent="上課專注";
  if(!$("#teacherLessonForm"))return;
  stopTeacherAudioRecording();
  writeTeacherDraft();
  currentTeacherLessonId=null;
  $("#teacherLessonForm").classList.add("hidden");
  renderTeacherLessons();
}
$("#newTeacherLesson")?.addEventListener("click",()=>openTeacherForm());
$("#emptyNewTeacherLesson")?.addEventListener("click",()=>openTeacherForm());
$("#closeTeacherForm")?.addEventListener("click",closeTeacherForm);
$("#cancelTeacherLesson")?.addEventListener("click",closeTeacherForm);
$("#copyProblemToQuestions")?.addEventListener("click",()=>{
  const problem=$("#teacherProblem").value.trim();
  if(!problem){toast("目前還沒有填寫卡住的地方");return}
  const box=$("#teacherQuestions");
  const lines=box.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  problem.split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!lines.includes(x))lines.push(x)});
  box.value=lines.join("\n");
  scheduleTeacherDraft();
  toast("已加入下次想問老師");
});

$("#repeatLastTeacherLesson")?.addEventListener("click",()=>{
  const last=teacherRecords()[0];
  if(!last){toast("目前還沒有上一堂課可以帶入");return}
  openTeacherForm(null,{
    date:localDateKey(),
    teacher:last.teacher||"",
    duration:last.duration||60,
    song:last.song||"",
    bpm:last.bpm||"",
    topic:last.topic||"",
    notes:"",
    problem:"",
    tags:last.tags||[],
    homeworkText:(last.homework||[]).filter(x=>!x.done).map(x=>x.text).join("\n")
  });
  toast("已帶入上堂資料，可直接修改");
});

$$("#lessonTagPicker [data-lesson-tag]").forEach(b=>b.addEventListener("click",()=>{
  const tag=b.dataset.lessonTag;
  teacherSelectedTags.has(tag)?teacherSelectedTags.delete(tag):teacherSelectedTags.add(tag);
  renderTeacherTags();scheduleTeacherDraft();
}));

$$("#homeworkPresets [data-homework-preset]").forEach(b=>b.addEventListener("click",()=>{
  const text=b.dataset.homeworkPreset;
  const box=$("#teacherHomework");
  const lines=box.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(!lines.includes(text))lines.push(text);
  box.value=lines.join("\n");
  scheduleTeacherDraft();
}));

$$("#teacherLessonForm input, #teacherLessonForm textarea, #teacherLessonForm select").forEach(el=>{
  el.addEventListener("input",scheduleTeacherDraft);
  el.addEventListener("change",scheduleTeacherDraft);
});


async function renderTeacherMediaPreview(){
  const box=$("#teacherMediaPreview");
  if(!box||!currentTeacherMediaOwner)return;
  try{
    const items=await getLessonMedia(currentTeacherMediaOwner);
    box.replaceChildren();
    if(!items.length){
      const empty=document.createElement("div");
      empty.className="media-empty";
      empty.textContent="還沒有照片或錄音";
      box.appendChild(empty);
      return;
    }
    items.forEach(item=>{
      const wrap=document.createElement("div");
      wrap.className="media-preview-item "+item.type;
      const url=mediaUrl(item);
      if(item.type==="image"){
        const a=document.createElement("a");
        a.href=url;a.target="_blank";a.rel="noopener";
        const img=document.createElement("img");
        img.src=url;img.alt="課堂照片";
        a.appendChild(img);wrap.appendChild(a);
      }else{
        const audio=document.createElement("audio");
        audio.controls=true;audio.preload="metadata";audio.src=url;
        wrap.appendChild(audio);
      }
      const del=document.createElement("button");
      del.type="button";del.textContent="×";del.setAttribute("aria-label","刪除附件");
      del.addEventListener("click",async()=>{
        await deleteLessonMediaItem(item.id);
        renderTeacherMediaPreview();renderTeacherLessons();refreshTeacherStorageUsage();
        toast("附件已刪除");
      });
      wrap.appendChild(del);
      box.appendChild(wrap);
    });
  }catch(e){
    box.innerHTML='<div class="media-empty">這個瀏覽器目前無法使用本機附件。</div>';
  }
}


async function refreshTeacherStorageUsage(){
  const el=$("#teacherStorageUsage");
  if(!el)return;
  try{
    if(!navigator.storage?.estimate){el.textContent="本機儲存";return}
    const info=await navigator.storage.estimate();
    const used=Number(info.usage||0),quota=Number(info.quota||0);
    const mb=n=>(n/1024/1024).toFixed(n>1024*1024*1024?0:1);
    el.textContent=quota?("本機 "+mb(used)+" / "+mb(quota)+" MB"):("本機 "+mb(used)+" MB");
  }catch(e){
    el.textContent="本機儲存";
  }
}
async function preferPersistentStorage(){
  try{
    if(navigator.storage?.persisted&&await navigator.storage.persisted())return true;
    if(navigator.storage?.persist)return await navigator.storage.persist();
  }catch(e){}
  return false;
}

$("#teacherPhotoInput")?.addEventListener("change",async e=>{
  const files=[...(e.target.files||[])].filter(f=>f.type.startsWith("image/"));
  if(!files.length)return;
  if(!currentTeacherMediaOwner)currentTeacherMediaOwner="class-"+Date.now();
  try{
    await preferPersistentStorage();
    for(const file of files){
      const blob=await compressTeacherPhoto(file);
      await putLessonMedia({
        id:"media-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
        lessonId:currentTeacherMediaOwner,
        type:"image",
        blob,
        mimeType:blob.type||file.type,
        name:file.name||"課堂照片",
        createdAt:Date.now()
      });
    }
    toast("照片已加入這堂課");
    writeTeacherDraft();
    renderTeacherMediaPreview();
    refreshTeacherStorageUsage();
  }catch(err){
    toast("照片儲存失敗，請確認瀏覽器儲存空間");
  }
  e.target.value="";
});

function stopTeacherAudioRecording(){
  if(teacherMediaRecorder&&teacherMediaRecorder.state!=="inactive")teacherMediaRecorder.stop();
}
$("#teacherAudioRecord")?.addEventListener("click",async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!("MediaRecorder" in window)){
    toast("這個瀏覽器不支援直接錄音");return;
  }
  if(!currentTeacherMediaOwner)currentTeacherMediaOwner="class-"+Date.now();
  try{
    await preferPersistentStorage();
    teacherMediaStream=await navigator.mediaDevices.getUserMedia({audio:true});
    teacherMediaChunks=[];
    const candidates=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
    const mime=candidates.find(x=>MediaRecorder.isTypeSupported?.(x))||"";
    teacherMediaRecorder=new MediaRecorder(teacherMediaStream,mime?{mimeType:mime}:undefined);
    teacherMediaRecorder.ondataavailable=e=>{if(e.data.size)teacherMediaChunks.push(e.data)};
    teacherMediaRecorder.onstop=async()=>{
      clearInterval(teacherMediaTimer);
      teacherMediaStream?.getTracks().forEach(t=>t.stop());
      const blob=new Blob(teacherMediaChunks,{type:teacherMediaRecorder.mimeType||"audio/webm"});
      if(blob.size){
        try{
          await putLessonMedia({
            id:"media-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
            lessonId:currentTeacherMediaOwner,
            type:"audio",
            blob,
            mimeType:blob.type,
            name:"老師示範錄音",
            createdAt:Date.now()
          });
          toast("示範錄音已加入這堂課");
          writeTeacherDraft();
          renderTeacherMediaPreview();
          refreshTeacherStorageUsage();
        }catch(e){
          toast("錄音儲存失敗");
        }
      }
      $("#teacherAudioRecord")?.classList.remove("hidden");
      $("#teacherAudioStop")?.classList.add("hidden");
      $("#teacherRecordingStatus")?.classList.add("hidden");
      if($("#teacherRecordingTime"))$("#teacherRecordingTime").textContent="00:00";
      teacherMediaRecorder=null;teacherMediaStream=null;teacherMediaChunks=[];
      teacherMediaResolve?.();teacherMediaResolve=null;
    };
    teacherMediaFinished=new Promise(resolve=>{teacherMediaResolve=resolve});
    teacherMediaRecorder.start();
    teacherMediaStartedAt=Date.now();
    $("#teacherAudioRecord").classList.add("hidden");
    $("#teacherAudioStop").classList.remove("hidden");
    $("#teacherRecordingStatus").classList.remove("hidden");
    teacherMediaTimer=setInterval(()=>{
      const sec=Math.floor((Date.now()-teacherMediaStartedAt)/1000);
      $("#teacherRecordingTime").textContent=formatClock(sec);
    },250);
  }catch(e){
    toast("請允許瀏覽器使用麥克風");
  }
});
$("#teacherAudioStop")?.addEventListener("click",stopTeacherAudioRecording);

async function renderTeacherRecordMedia(records){
  const list=$("#teacherLessonList");
  if(!list)return;
  for(const r of records){
    const host=$$("[data-lesson-media-id]",list).find(el=>el.dataset.lessonMediaId===r.id);
    if(!host)continue;
    try{
      const items=await getLessonMedia(r.id);
      host.replaceChildren();
      if(!items.length){host.classList.add("hidden");continue}
      host.classList.remove("hidden");
      items.forEach(item=>{
        const url=mediaUrl(item);
        if(item.type==="image"){
          const a=document.createElement("a");
          a.className="record-media-image";a.href=url;a.target="_blank";a.rel="noopener";
          const img=document.createElement("img");
          img.src=url;img.alt="課堂附件";a.appendChild(img);host.appendChild(a);
        }else{
          const wrap=document.createElement("div");
          wrap.className="record-media-audio";
          const label=document.createElement("span");
          label.textContent="老師示範";
          const audio=document.createElement("audio");
          audio.controls=true;audio.preload="metadata";audio.src=url;
          wrap.append(label,audio);host.appendChild(wrap);
        }
      });
    }catch(e){
      host.replaceChildren();
    }
  }
}

$("#saveTeacherLesson")?.addEventListener("click",()=>{
  const date=$("#teacherLessonDate").value||localDateKey();
  const topic=$("#teacherTopic").value.trim();
  const notes=$("#teacherNotes").value.trim();
  const problem=$("#teacherProblem").value.trim();
  const questionLines=$("#teacherQuestions").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const song=$("#teacherSong").value.trim();
  const bpm=+$("#teacherBpm").value||null;
  const homeworkLines=$("#teacherHomework").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(!topic&&!notes&&!problem&&!song&&!homeworkLines.length&&!questionLines.length){toast("至少記一項今天學的內容、問題或回家作業");return}

  const existing=currentTeacherLessonId?(state.teacherLessons||[]).find(x=>x.id===currentTeacherLessonId):null;
  const oldByText=new Map((existing?.homework||[]).map(x=>[x.text,x]));
  const oldQuestionsByText=new Map((existing?.questions||[]).map(x=>[x.text,x]));
  const id=existing?.id||currentTeacherMediaOwner||("class-"+Date.now());
  const homework=homeworkLines.map((text,i)=>{
    const old=oldByText.get(text);
    return {id:old?.id||(id+"-hw-"+i+"-"+Date.now()),text,done:old?.done||false};
  });

  const questions=questionLines.map((text,i)=>{
    const old=oldQuestionsByText.get(text);
    return {id:old?.id||(id+"-q-"+i+"-"+Date.now()),text,done:old?.done||false};
  });

  const record={
    id,date,
    teacher:$("#teacherName").value.trim(),
    duration:+$("#teacherDuration").value||60,
    nextDate:$("#nextLessonDate").value||"",
    song,bpm,topic,notes,problem,
    tags:[...teacherSelectedTags],
    homework,questions,
    createdAt:existing?.createdAt||Date.now(),
    updatedAt:Date.now()
  };
  if(!Array.isArray(state.teacherLessons))state.teacherLessons=[];
  const idx=state.teacherLessons.findIndex(x=>x.id===id);
  if(idx>=0)state.teacherLessons[idx]=record;else state.teacherLessons.push(record);
  storage.removePreference(TEACHER_DRAFT_KEY);
  currentTeacherLessonId=null;
  $("#teacherLessonForm").classList.add("hidden");
  saveState();
  setLearnView("teacher");
  toast(existing?"課堂筆記已更新":"已儲存，回家作業也放到首頁");
});

function teacherRecords(){
  if(!Array.isArray(state.teacherLessons))state.teacherLessons=[];
  return [...state.teacherLessons].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));
}
function toggleTeacherHomework(lessonId,homeworkId){
  const lesson=(state.teacherLessons||[]).find(x=>x.id===lessonId);
  const item=lesson?.homework?.find(x=>x.id===homeworkId);
  if(!item)return;
  item.done=!item.done;
  lesson.updatedAt=Date.now();
  saveState();
  toast(item.done?"作業完成":"已恢復為未完成");
}
function toggleTeacherQuestion(lessonId,questionId){
  const lesson=(state.teacherLessons||[]).find(x=>x.id===lessonId);
  const item=lesson?.questions?.find(x=>x.id===questionId);
  if(!item)return;
  item.done=!item.done;
  lesson.updatedAt=Date.now();
  saveState();
  toast(item.done?"已標記為問過老師":"已恢復為待問");
}
function practiceFromHomework(text=""){
  const t=text.toLowerCase();
  if(/調音|音準/.test(text)){openTool("tuner");return}
  if(/節拍器|bpm/.test(t)){openTool("metronome");return}
  if(/刷弦|節奏|八拍|十六拍/.test(text)){openPractice("rhythm");return}
  if(/和弦切換|換和弦|↔/.test(text)){openPractice("switch");return}
  if(/歌曲|主歌|副歌|和弦進行/.test(text)){openPractice("progression");return}
  openPractice("switch");
}
function lessonSummaryChips(r){
  const chips=[];
  (r.tags||[]).forEach(x=>chips.push(x));
  if(r.song)chips.push(r.song);
  if(r.bpm)chips.push(r.bpm+" BPM");
  return chips.slice(0,6);
}

function renderTeacherQuestionPanels(records,list){
  records.forEach(r=>{
    const questions=r.questions||[];
    if(!questions.length)return;
    const card=$$("[data-teacher-record-id]",list).find(el=>el.dataset.teacherRecordId===r.id);
    if(!card)return;
    const box=document.createElement("div");
    box.className="record-questions";
    const label=document.createElement("span");
    label.className="record-label";
    label.textContent="下次想問老師";
    box.appendChild(label);
    questions.forEach(q=>{
      const row=document.createElement("button");
      row.className="record-question-row"+(q.done?" done":"");
      const mark=document.createElement("i");
      mark.textContent=q.done?"✓":"?";
      const copy=document.createElement("span");
      copy.textContent=q.text;
      row.append(mark,copy);
      row.onclick=()=>toggleTeacherQuestion(r.id,q.id);
      box.appendChild(row);
    });
    const media=card.querySelector(".teacher-record-media");
    const actions=card.querySelector(".record-actions");
    card.insertBefore(box,media||actions||null);
  });
}
function renderTeacherLessons(){
  const records=teacherRecords();
  const list=$("#teacherLessonList"),empty=$("#teacherLessonEmpty");
  if(!list||!empty)return;
  empty.classList.toggle("hidden",records.length>0);
  if(!records.length){list.innerHTML="";return}

  list.innerHTML=records.map(r=>{
    const hw=r.homework||[],done=hw.filter(x=>x.done).length;
    const teacher=r.teacher?esc(r.teacher):"老師課程";
    const chips=lessonSummaryChips(r);
    const firstPending=hw.find(x=>!x.done);
    return `<article class="teacher-record" data-teacher-record-id="${esc(r.id)}">
      <div class="teacher-record-head">
        <div>
          <span class="teacher-date">${esc(r.date||"")}</span>
          <h3>${esc(r.topic||r.song||"課堂筆記")}</h3>
          <p>${teacher} · ${Number(r.duration)||60} 分鐘${r.nextDate?" · 下次 "+esc(r.nextDate):""}</p>
        </div>
        <span class="homework-progress">${done}/${hw.length}</span>
      </div>
      ${chips.length?`<div class="teacher-chips">${chips.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
      ${r.notes?`<div class="teacher-notes"><b>老師提醒</b>${esc(r.notes).replace(/\n/g,"<br>")}</div>`:""}
      ${r.problem?`<div class="teacher-problem"><b>我卡住</b>${esc(r.problem).replace(/\n/g,"<br>")}</div>`:""}
      <div class="teacher-record-media hidden" data-lesson-media-id="${esc(r.id)}"></div>
      ${hw.length?`<div class="record-homework">
        <span class="record-label">回家作業</span>
        ${hw.map(item=>`<div class="record-homework-row ${item.done?"done":""}">
          <button class="homework-check" data-teacher-hw="${esc(r.id)}" data-hw-id="${esc(item.id)}"><i>${item.done?"✓":""}</i></button>
          <span>${esc(item.text)}</span>
          <button class="homework-go" data-homework-practice="${esc(item.text)}">練習</button>
        </div>`).join("")}
      </div>`:""}
      <div class="record-actions">
        ${firstPending?`<button data-teacher-practice-text="${esc(firstPending.text)}">開始未完成作業</button>`:""}
        <button data-teacher-edit="${esc(r.id)}">編輯</button>
        <button class="delete" data-teacher-delete="${esc(r.id)}">刪除</button>
      </div>
    </article>`;
  }).join("");
  renderTeacherRecordMedia(records);
  renderTeacherQuestionPanels(records,list);

  $$("[data-teacher-hw]",list).forEach(b=>b.onclick=()=>toggleTeacherHomework(b.dataset.teacherHw,b.dataset.hwId));
  $$("[data-homework-practice]",list).forEach(b=>b.onclick=()=>practiceFromHomework(b.dataset.homeworkPractice));
  $$("[data-teacher-practice-text]",list).forEach(b=>b.onclick=()=>practiceFromHomework(b.dataset.teacherPracticeText));
  $$("[data-teacher-edit]",list).forEach(b=>b.onclick=()=>openTeacherForm(b.dataset.teacherEdit));
  $$("[data-teacher-delete]",list).forEach(b=>b.onclick=()=>{
    const id=b.dataset.teacherDelete;
    if(confirm("確定刪除這堂課的筆記？")){
      state.teacherLessons=(state.teacherLessons||[]).filter(x=>x.id!==id);
      deleteLessonMediaForLesson(id).catch(()=>{});
      saveState();setLearnView("teacher");toast("課堂筆記與附件已刪除");
    }
  });
}

function renderTeacherHomework(){
  const records=teacherRecords();
  const pending=[];
  let totalHomework=0;
  records.forEach(r=>(r.homework||[]).forEach(item=>{
    totalHomework++;
    if(!item.done)pending.push({lessonId:r.id,homeworkId:item.id,text:item.text,date:r.date,topic:r.topic||r.song});
  }));
  const doneHomework=Math.max(0,totalHomework-pending.length);
  const homeworkPct=totalHomework?Math.round(doneHomework/totalHomework*100):0;
  const today=new Date();today.setHours(0,0,0,0);
  const upcoming=records.filter(r=>r.nextDate).map(r=>{
    const p=r.nextDate.split("-").map(Number);
    const d=new Date(p[0],p[1]-1,p[2]);d.setHours(0,0,0,0);
    return {record:r,days:Math.round((d-today)/86400000)};
  }).filter(x=>x.days>=0).sort((a,b)=>a.days-b.days)[0]||null;
  const section=$("#teacherHomeworkSection"),list=$("#teacherHomeworkList");
  if(!section||!list)return;
  section.classList.toggle("hidden",records.length===0);
  const pctEl=$("#teacherProgressPercent"),summaryEl=$("#teacherPendingSummary"),nextEl=$("#teacherNextLessonSummary"),barEl=$("#teacherProgressBar"),ringEl=$("#teacherProgressRing"),startEl=$("#startTeacherHomework");
  if(pctEl)pctEl.textContent=totalHomework?homeworkPct+"%":"—";
  if(summaryEl)summaryEl.textContent=totalHomework?(pending.length?"還有 "+pending.length+" 項未完成":"老師作業已全部完成"):"這堂課沒有設定回家作業";
  if(nextEl)nextEl.textContent=!upcoming?"尚未設定下次上課日期":upcoming.days===0?"今天上課 · "+upcoming.record.nextDate:upcoming.days===1?"明天上課 · "+upcoming.record.nextDate:"距離下次上課 "+upcoming.days+" 天 · "+upcoming.record.nextDate;
  if(barEl)barEl.style.width=(totalHomework?homeworkPct:0)+"%";
  if(ringEl)ringEl.style.setProperty("--teacher-p",totalHomework?homeworkPct:0);
  if(startEl){startEl.disabled=!pending.length;startEl.textContent=pending.length?"開始老師作業":"作業已完成";startEl.onclick=()=>{if(pending[0])practiceFromHomework(pending[0].text)}}
  if(!pending.length){list.innerHTML='<div class="teacher-homework-empty"><strong>這次老師作業完成了</strong><span>可以在下次上課前再複習一次課堂筆記。</span></div>';return}
  list.innerHTML=pending.slice(0,8).map(item=>`
    <div class="teacher-homework-item">
      <button class="homework-check" data-home-teacher-hw="${esc(item.lessonId)}" data-home-hw-id="${esc(item.homeworkId)}"><i></i></button>
      <span><strong>${esc(item.text)}</strong><small>${esc(item.date)} · ${esc(item.topic||"課堂作業")}</small></span>
      <button class="homework-go" data-home-practice="${esc(item.text)}">練習</button>
    </div>`).join("");
  $$("[data-home-teacher-hw]",list).forEach(b=>b.onclick=()=>toggleTeacherHomework(b.dataset.homeTeacherHw,b.dataset.homeHwId));
  $$("[data-home-practice]",list).forEach(b=>b.onclick=()=>practiceFromHomework(b.dataset.homePractice));
}


function teacherPrepQuestions(){
  if(!Array.isArray(state.teacherPrepQuestions))state.teacherPrepQuestions=[];
  return state.teacherPrepQuestions;
}
function addTeacherPrepQuestion(text){
  const value=String(text||"").trim();
  if(!value)return false;
  const list=teacherPrepQuestions();
  if(list.some(x=>!x.done&&x.text===value)){toast("這個問題已經在清單裡");return false}
  list.unshift({id:"prep-q-"+Date.now(),text:value,done:false,createdAt:Date.now()});
  saveState();
  toast("已加入下次上課問題");
  return true;
}
function toggleTeacherPrepQuestion(id){
  const item=teacherPrepQuestions().find(x=>x.id===id);
  if(!item)return;
  item.done=!item.done;
  saveState();
  toast(item.done?"已標記為問過老師":"已恢復為待問");
}
function addQuickTeacherQuestionFromHome(){
  const input=$("#quickTeacherQuestion");
  if(!input)return;
  if(addTeacherPrepQuestion(input.value))input.value="";
}
$("#addQuickTeacherQuestion")?.addEventListener("click",addQuickTeacherQuestionFromHome);
$("#quickTeacherQuestion")?.addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    addQuickTeacherQuestionFromHome();
  }
});

function renderTeacherPrep(){
  const section=$("#teacherPrepSection");
  const list=$("#teacherQuestionList");
  if(!section||!list)return;

  const records=teacherRecords();
  const pending=[];
  records.forEach(r=>(r.questions||[]).forEach(q=>{
    if(!q.done)pending.push({
      source:"lesson",
      lessonId:r.id,
      questionId:q.id,
      text:q.text,
      nextDate:r.nextDate||"",
      date:r.date||"",
      topic:r.topic||r.song||"課堂筆記"
    });
  }));
  teacherPrepQuestions().forEach(q=>{
    if(!q.done)pending.push({
      source:"quick",
      questionId:q.id,
      text:q.text,
      nextDate:"",
      date:"",
      topic:"首頁快速記下"
    });
  });

  const today=new Date();
  today.setHours(0,0,0,0);
  const upcoming=records.filter(r=>r.nextDate).map(r=>{
    const p=r.nextDate.split("-").map(Number);
    const d=new Date(p[0],p[1]-1,p[2]);
    d.setHours(0,0,0,0);
    return {record:r,days:Math.round((d-today)/86400000)};
  }).filter(x=>x.days>=0).sort((a,b)=>a.days-b.days)[0]||null;

  section.classList.remove("hidden");

  const dateEl=$("#teacherPrepDate");
  const summaryEl=$("#teacherPrepSummary");
  const countEl=$("#teacherPrepCount");

  if(dateEl){
    dateEl.textContent=!upcoming
      ?"尚未設定下次上課"
      :upcoming.days===0
        ?"今天上課 · "+upcoming.record.nextDate
        :upcoming.days===1
          ?"明天上課 · "+upcoming.record.nextDate
          :"距離上課 "+upcoming.days+" 天 · "+upcoming.record.nextDate;
  }
  if(summaryEl)summaryEl.textContent=pending.length?"還有 "+pending.length+" 個問題想問老師":"目前沒有待問問題";
  if(countEl)countEl.textContent=String(pending.length);

  list.replaceChildren();

  if(!pending.length){
    const empty=document.createElement("div");
    empty.className="teacher-question-empty";
    empty.textContent="目前沒有待問問題。想到什麼，直接在上面的輸入框加入就好。";
    list.appendChild(empty);
    return;
  }

  pending.forEach(item=>{
    const row=document.createElement("button");
    row.className="teacher-prep-question";

    const mark=document.createElement("i");
    mark.textContent="?";

    const copy=document.createElement("span");
    const strong=document.createElement("strong");
    strong.textContent=item.text;
    const small=document.createElement("small");
    small.textContent=item.source==="quick"
      ?"首頁快速記下 · 待下次上課"
      :item.nextDate
        ?"下次 "+item.nextDate+" · "+item.topic
        :(item.date+" · "+item.topic);

    copy.append(strong,small);
    row.append(mark,copy);
    row.onclick=()=>item.source==="quick"?toggleTeacherPrepQuestion(item.questionId):toggleTeacherQuestion(item.lessonId,item.questionId);
    list.appendChild(row);
  });

}

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
  setLearnView("self");
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
$$("[data-string]").forEach(b=>b.onclick=()=>{tunerTarget=guitarStrings[+b.dataset.string];$("#tunerMode").value="guitar";$$("[data-string]").forEach(x=>x.classList.toggle("active",x===b));updateReferenceLabel();toast("目標："+tunerTarget.name)});
$("#a4Calibration").oninput=e=>{$("#a4Value").textContent=e.target.value+" Hz";updateReferenceLabel()};
$("#tunerMode").onchange=()=>{if($("#tunerMode").value==="chromatic"){$$("[data-string]").forEach(x=>x.classList.remove("active"));tunerTarget=null}updateReferenceLabel()};
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
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=localDateKey(d),min=Math.max(0,Number(state.days[k]?.minutes)||0);total+=min;days.push({d,k,min,today:i===0})}
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
  $("#streakCount").textContent=streak();$("#levelBadge").textContent="Lv."+level();$("#coachAdvice").textContent=coachAdvice();
  renderDaily();renderLessons();renderTeacherLessons();renderTeacherHomework();renderTeacherPrep();renderEarStats();renderProgress()
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(reader.error||new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}
function dataUrlToBlob(dataUrl){
  const comma=dataUrl.indexOf(",");
  if(comma<0)throw new Error("Invalid media data");
  const head=dataUrl.slice(0,comma);
  const body=dataUrl.slice(comma+1);
  const mime=(head.match(/^data:([^;]+)/)||[])[1]||"application/octet-stream";
  const binary=head.includes(";base64")?atob(body):decodeURIComponent(body);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}
function humanBytes(bytes){
  if(bytes<1024)return bytes+" B";
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";
  if(bytes<1024*1024*1024)return (bytes/1024/1024).toFixed(1)+" MB";
  return (bytes/1024/1024/1024).toFixed(2)+" GB";
}

let pendingFullRestore=null;

async function sha256Hex(text){
  if(!globalThis.crypto?.subtle)return null;
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function dataUrlByteSize(dataUrl){
  if(typeof dataUrl!=="string")return 0;
  const comma=dataUrl.indexOf(",");
  if(comma<0)return 0;
  const head=dataUrl.slice(0,comma),body=dataUrl.slice(comma+1);
  if(head.includes(";base64")){
    const padding=body.endsWith("==")?2:body.endsWith("=")?1:0;
    return Math.max(0,Math.floor(body.length*3/4)-padding);
  }
  try{return new TextEncoder().encode(decodeURIComponent(body)).length}catch(e){return body.length}
}
function validateBackupShape(obj){
  assertSafeData(obj);validateStateShape(obj.appState);
  if(!obj||obj.format!=="guitar-coach-full-backup")throw new Error("不是 Guitar Coach 完整備份");
  if(![1,2].includes(obj.version))throw new Error("不支援的備份版本");
  if(!obj.appState||typeof obj.appState!=="object")throw new Error("缺少學習資料");
  if(!Array.isArray(obj.media))throw new Error("附件格式錯誤");
  if(obj.media.length>2000)throw new Error("附件過多");
  let mediaBytes=0;
  for(const item of obj.media){
    if(!item||typeof item!=="object")throw new Error("附件資料損壞");
    if(!["image","audio"].includes(item.type))throw new Error("附件類型錯誤");
    if(typeof item.data!=="string"||!item.data.startsWith("data:"))throw new Error("附件內容不完整");
    if(typeof item.lessonId!=='string'||!item.lessonId)throw new Error("附件缺少課堂識別");
    const comma=item.data.indexOf(','),head=item.data.slice(0,comma),mime=head.slice(5).split(';')[0].toLowerCase();
    const allowed=item.type==='image'?/^image\/(jpeg|png|webp|gif|avif|bmp|heic|heif)$/:/^audio\/(webm|mp4|mpeg|wav|x-wav|ogg|aac|x-m4a|flac)$/;
    if(comma<0||head.length>256||!head.endsWith(';base64')||!allowed.test(mime)||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.data.slice(comma+1)))throw new Error('附件含不支援或可執行內容');
    const bytes=dataUrlByteSize(item.data);mediaBytes+=bytes;if(bytes>50*1024*1024||mediaBytes>150*1024*1024)throw new Error('附件超過安全容量限制');
  }
  return true;
}
function resetRestorePreview(){
  pendingFullRestore=null;
  $("#restorePreview")?.classList.add("hidden");
  $("#confirmFullRestore").disabled=true;
  $("#importFullBackup").value="";
}
function renderRestorePreview(obj,fileName,integrity,mediaBytes){
  pendingFullRestore=obj;
  $("#restorePreview").classList.remove("hidden");
  $("#restoreFileName").textContent=fileName||"完整備份";
  $("#restoreDate").textContent=obj.createdAt?new Date(obj.createdAt).toLocaleString("zh-TW"):"未記錄";
  $("#restoreLessons").textContent=String((obj.appState.teacherLessons||[]).length);
  $("#restorePhotos").textContent=String(obj.media.filter(x=>x.type==="image").length);
  $("#restoreAudio").textContent=String(obj.media.filter(x=>x.type==="audio").length);
  $("#restoreMediaSize").textContent=humanBytes(mediaBytes);
  $("#restoreMinutes").textContent=String(obj.appState.totalMinutes||0)+" 分";
  const badge=$("#restoreIntegrity"),note=$("#restorePreviewNote"),confirm=$("#confirmFullRestore");
  badge.classList.remove("ok","warn","bad");
  if(integrity==="verified"){
    badge.textContent="內容完整性一致（非來源認證）";
    badge.classList.add("ok");
    note.textContent="備份內容完整。確認內容正確後再還原；按下確認前不會修改目前裝置資料。";
    confirm.disabled=false;
  }else if(integrity==="legacy"){
    badge.textContent="舊版備份";
    badge.classList.add("warn");
    note.textContent="這是舊版完整備份，沒有 SHA-256 完整性碼；格式檢查通過，可以還原。";
    confirm.disabled=false;
  }else{
    badge.textContent="完整性驗證失敗";
    badge.classList.add("bad");
    note.textContent="備份檔可能已損壞或被修改，為避免覆蓋目前資料，已禁止還原。";
    confirm.disabled=true;
  }
}

$("#exportFullBackup")?.addEventListener("click",async()=>{
  const btn=$("#exportFullBackup"),status=$("#fullBackupStatus");
  btn.disabled=true;
  if(status)status.textContent="正在整理文字、照片與錄音…";
  try{
    const items=await getAllLessonMedia();
    const media=[];
    let rawBytes=0;
    for(let i=0;i<items.length;i++){
      const item=items[i];
      rawBytes+=item.blob?.size||0;
      if(status)status.textContent="正在打包附件 "+(i+1)+" / "+items.length+"…";
      media.push({id:item.id,lessonId:item.lessonId,type:item.type,mimeType:item.mimeType||item.blob?.type||"",name:item.name||"",createdAt:item.createdAt||Date.now(),data:await blobToDataUrl(item.blob)});
    }
    if(status)status.textContent="正在建立完整性驗證碼…";
    const signedBody=JSON.stringify({appState:state,media});
    const checksum=await sha256Hex(signedBody);
    const payload={format:"guitar-coach-full-backup",version:2,createdAt:new Date().toISOString(),integrity:{algorithm:checksum?"SHA-256":"none",checksum:checksum||null},appState:state,media};
    const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="guitar-coach-full-"+localDateKey()+".guitarcoach";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    if(status)status.textContent="完整備份完成："+items.length+" 個附件，約 "+humanBytes(rawBytes)+"；"+(checksum?"SHA-256 已驗證":"此瀏覽器未提供 SHA-256");
    toast("完整本機備份已匯出");
  }catch(e){
    if(status)status.textContent="完整備份失敗，請確認裝置可用空間後再試。";
    toast("完整備份失敗");
  }finally{btn.disabled=false}
});

$("#importFullBackup")?.addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  const status=$("#fullBackupStatus");pendingFullRestore=null;$("#confirmFullRestore").disabled=true;
  try{
    if(status)status.textContent="正在檢查完整備份…";
    if(file.size>200*1024*1024)throw new Error("備份檔過大");
    const obj=parseSafeData(await file.text());validateBackupShape(obj);
    let mediaBytes=0;for(const item of obj.media)mediaBytes+=dataUrlByteSize(item.data);
    let integrity="legacy";
    if(obj.version===2&&obj.integrity?.algorithm==="SHA-256"&&obj.integrity?.checksum){
      if(status)status.textContent="正在驗證 SHA-256 完整性…";
      const actual=await sha256Hex(JSON.stringify({appState:obj.appState,media:obj.media}));
      integrity=actual&&actual===obj.integrity.checksum?"verified":"failed";
    }else if(obj.version===2&&obj.integrity?.algorithm==="none")integrity="legacy";
    renderRestorePreview(obj,file.name,integrity,mediaBytes);
    if(status)status.textContent=integrity==="failed"?"備份完整性驗證失敗，未修改任何資料。":"備份檢查完成，請先確認下方內容。";
  }catch(err){
    resetRestorePreview();if(status)status.textContent="這個檔案不是可用的 Guitar Coach 完整備份。";toast("備份檔驗證失敗");
  }
});

$("#cancelFullRestore")?.addEventListener("click",()=>{resetRestorePreview();$("#fullBackupStatus").textContent="已取消完整還原，目前資料沒有變更。"});

$("#confirmFullRestore")?.addEventListener("click",async()=>{
  const obj=pendingFullRestore;if(!obj)return;
  const btn=$("#confirmFullRestore"),status=$("#fullBackupStatus");btn.disabled=true;
  try{
    if(status)status.textContent="正在建立還原安全點…";
    const oldState=cloneData(state),oldMedia=await getAllLessonMedia();
    try{
      await clearAllLessonMedia();
      for(let i=0;i<obj.media.length;i++){
        const item=obj.media[i];if(status)status.textContent="正在還原附件 "+(i+1)+" / "+obj.media.length+"…";
        await putLessonMedia({id:item.id||("media-"+Date.now()+"-"+i),lessonId:item.lessonId,type:item.type,blob:dataUrlToBlob(item.data),mimeType:item.mimeType||"",name:item.name||"",createdAt:item.createdAt||Date.now()});
      }
      state=deepMerge(cloneData(defaultState),obj.appState);localStorage.setItem(STORE_KEY,JSON.stringify(state));storage.removePreference(TEACHER_DRAFT_KEY);
      renderShared();refreshTeacherStorageUsage();if(status)status.textContent="完整還原完成："+obj.media.length+" 個附件。";toast("完整備份已還原");resetRestorePreview();
    }catch(restoreError){
      await clearAllLessonMedia();for(const item of oldMedia)await putLessonMedia(item);state=oldState;localStorage.setItem(STORE_KEY,JSON.stringify(state));renderShared();throw restoreError;
    }
  }catch(err){if(status)status.textContent="還原失敗，已嘗試保留還原前的資料。";toast("完整還原失敗");btn.disabled=false}
});

$("#exportData").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="guitar-coach-backup-"+localDateKey()+".json";a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")
};
$("#importData").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{if(f.size>10*1024*1024)throw new Error("備份檔過大");const obj=validateStateShape(parseSafeData(await f.text()));if(!confirm("只覆蓋目前使用者的練習與課堂紀錄，確定匯入？"))return;state=deepMerge(cloneData(defaultState),obj);saveState();toast("備份已匯入")}catch(err){toast("這個備份檔無法讀取")}
  e.target.value=""
};
$("#resetData").onclick=()=>window.gcProfiles?.openReset();
window.addEventListener("gc:profile-leaving",writeTeacherDraft);
window.gcPrepareProfileSwitch=async()=>{stopTeacherAudioRecording();await teacherMediaFinished;};
window.gcStopForReset=async()=>{clearTimeout(teacherDraftTimer);stopTeacherAudioRecording();teacherMediaStream?.getTracks().forEach(t=>t.stop());await teacherMediaFinished;};

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden")};

function stopTransientAudio(){
  if(metroOn)stopMetro();
  if(rhythmTimer)stopRhythm(true);
  if(progressionTimer)stopProgression(true);
  if(tunerStream)stopTuner();
}
window.addEventListener("pagehide",()=>{finishSwitchSession();stopTransientAudio();stopTeacherAudioRecording();mediaUrls.forEach(url=>URL.revokeObjectURL(url));mediaUrls.clear()});

// Service worker registration belongs to app.js and runs before core startup.

if($("#teacherLessonDate"))$("#teacherLessonDate").value=localDateKey();
newSwitchSequence();
renderPatterns();
renderProgressionPreview();
renderChordLibrary();
renderFretboard();
renderEarOptions();
newEarQuestion();
updateReferenceLabel();
renderShared();
document.documentElement.dataset.gcCoreReady="true";
})();