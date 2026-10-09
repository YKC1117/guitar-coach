(() => {
  "use strict";

  const core=document.createElement("script");
  core.src="./app-core.js?v=3.7.2-core";
  core.onload=initClassroomNotebook;
  core.onerror=()=>console.error("Guitar Coach core failed to load");
  document.head.appendChild(core);

  function initClassroomNotebook(){
    const $=(s,r=document)=>r.querySelector(s);
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];
    const STORE="guitarCoachClassroomNotebookV1";
    const ACTIVE="guitarCoachClassroomActiveV1";
    const TAB_KEY="guitarCoachNotebookTabV2";
    const PALETTE_KEY="guitarCoachStaffPaletteV2";

    let activeTab=localStorage.getItem(TAB_KEY)||"quick";
    let paletteTab=localStorage.getItem(PALETTE_KEY)||"common";
    let selectedTabFret="0";
    let staffTool={kind:"none",duration:"quarter",accidental:"",dot:0,mark:"",label:"請先選擇符號"};
    let spanStart=null;
    const historyMap=new Map();
    const futureMap=new Map();

    const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
    const uid=()=>"nb-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
    let notebookCache=null,saveTimer=null,dirty=false;
    const load=()=>{if(notebookCache)return notebookCache;try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");notebookCache=Array.isArray(v)?v:[]}catch(e){notebookCache=[]}return notebookCache};
    function flush(){clearTimeout(saveTimer);saveTimer=null;if(!dirty)return;try{localStorage.setItem(STORE,JSON.stringify(load()));dirty=false;const status=$("#classroomAutoSave");if(status)status.textContent="已暫存 "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}catch(e){const status=$("#classroomAutoSave");if(status)status.textContent="暫存失敗，請先匯出備份";console.error("Notebook storage failed",e)}}
    const persist=list=>{notebookCache=list;dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(flush,180)};
    window.gcNotebook={list:load,replace:list=>{persist(list);flush()},flush};
    window.addEventListener("pagehide",flush);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)flush()});
    window.addEventListener("storage",e=>{if(e.key===STORE){if(dirty)flush();notebookCache=null}});
    const sig=()=>({date:$("#teacherLessonDate")?.value||"",teacher:$("#teacherName")?.value.trim()||"",song:$("#teacherSong")?.value.trim()||"",topic:$("#teacherTopic")?.value.trim()||""});
    const same=(a,b)=>a&&b&&a.date===b.date&&a.teacher===b.teacher&&a.song===b.song&&a.topic===b.topic;

    function getCurrent(create=true){
      const form=$("#teacherLessonForm");if(!form)return null;
      const list=load();
      const id=form.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
      let item=list.find(x=>x.id===id)||list.find(x=>same(x.signature,sig()));
      if(!item&&create){item={id:uid(),signature:sig(),blocks:[],createdAt:Date.now(),updatedAt:Date.now()};list.push(item);persist(list)}
      if(item){form.dataset.classroomNotebookId=item.id;localStorage.setItem(ACTIVE,item.id)}
      return item||null;
    }
    function saveCurrent(blocks){
      const form=$("#teacherLessonForm");if(!form)return;
      const list=load(),item=getCurrent(true);if(!item)return;
      const idx=list.findIndex(x=>x.id===item.id);
      const next={...item,signature:sig(),blocks:blocks??item.blocks,updatedAt:Date.now()};
      if(idx>=0)list[idx]=next;else list.push(next);
      persist(list);form.dataset.classroomNotebookId=next.id;localStorage.setItem(ACTIVE,next.id);
      const status=$("#classroomAutoSave");
      if(status)status.textContent="待暫存"
    }
    function currentBlocks(){return getCurrent(true)?.blocks||[]}
    function setBlocks(blocks){saveCurrent(blocks);renderWorkspace()}
    function blocksOf(type){return currentBlocks().filter(b=>b.type===type)}
    function makeBlock(type){
      const b={id:uid(),type,memo:"",createdAt:Date.now()};
      if(type==="text")Object.assign(b,{text:""});
      if(type==="staff")Object.assign(b,{items:[],notes:[],clef:"treble",meter:"",key:"C"});
      if(type==="tab")Object.assign(b,{cells:Array.from({length:6},()=>Array(16).fill(""))});
      if(type==="chords")Object.assign(b,{items:[]});
      if(type==="rhythm")Object.assign(b,{bpm:70,meter:"4/4",beats:Array(8).fill("")});
      return b;
    }
    function addBlock(type){
      const b=makeBlock(type),blocks=currentBlocks().slice();blocks.push(b);saveCurrent(blocks);renderWorkspace();
      requestAnimationFrame(()=>$("[data-block-id='"+b.id+"']")?.scrollIntoView({behavior:"smooth",block:"center"}));
    }
    function updateBlock(id,patch){saveCurrent(currentBlocks().map(b=>b.id===id?{...b,...patch}:b))}
    function removeBlock(id){if(confirm("刪除這段課堂內容？")){saveCurrent(currentBlocks().filter(b=>b.id!==id));renderWorkspace()}}
    function cloneBlock(id){const blocks=currentBlocks().slice(),i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy=clone(blocks[i]);copy.id=uid();copy.createdAt=Date.now();blocks.splice(i+1,0,copy);saveCurrent(blocks);renderWorkspace()}
    function setFocus(on){document.body.classList.toggle("classroom-focus",on);const b=$("#classroomFocusBtn");if(b)b.textContent=on?"結束專注":"上課專注";if(on)$("#classroomNotebook")?.scrollIntoView({block:"start"})}

    const tabs=[
      ["quick","速記","✎"],["staff","五線譜","𝄞"],["tab","TAB","TAB"],["chords","和弦","C"],["rhythm","節奏","♩"],["summary","整理","✓"]
    ];
    function setTab(tab){
      if(!tabs.some(x=>x[0]===tab))tab="quick";
      activeTab=tab;localStorage.setItem(TAB_KEY,tab);spanStart=null;staffTool={...staffTool,kind:"none",label:"請先選擇符號"};renderWorkspace();
    }

    function injectUI(){
      const form=$("#teacherLessonForm");if(!form||$("#classroomNotebook"))return;
      const anchor=$("#teacherTopic")?.closest(".field");if(!anchor)return;
      const box=document.createElement("section");box.id="classroomNotebook";box.className="classroom-notebook";
      box.innerHTML=`
        <div class="classroom-head compact-head">
          <div><span class="kicker">CLASSROOM</span><h2>數位課堂筆記本</h2><p>上課只看現在需要的工具；內容會自動暫存。</p></div>
          <span id="classroomAutoSave">自動暫存</span>
        </div>
        <div class="classroom-session-actions">
          <button type="button" class="focus-btn" id="classroomFocusBtn">上課專注</button>
          <button type="button" class="organize-btn" id="classroomOrganizeBtn">結束課堂整理</button>
        </div>
        <nav class="notebook-tabs" id="notebookTabs" aria-label="課堂筆記功能分頁"></nav>
        <div id="classroomWorkspace" class="classroom-workspace"></div>`;
      anchor.insertAdjacentElement("afterend",box);
      $("#classroomFocusBtn").onclick=()=>setFocus(!document.body.classList.contains("classroom-focus"));
      $("#classroomOrganizeBtn").onclick=()=>{setTab("summary");setTimeout(()=>$("#classroomWorkspace")?.scrollIntoView({behavior:"smooth",block:"start"}),50)};

      const quick=document.createElement("button");quick.type="button";quick.className="secondary classroom-open";quick.id="openClassroomNotebook";quick.textContent="上課筆記本";
      quick.onclick=()=>{$("#newTeacherLesson")?.click();setTimeout(()=>{$("#classroomNotebook")?.scrollIntoView({behavior:"smooth",block:"start"});setFocus(true)},70)};
      $(".teacher-summary-actions")?.prepend(quick);
      bindOpenHooks();renderWorkspace();
    }

    function bindOpenHooks(){
      ["newTeacherLesson","emptyNewTeacherLesson","repeatLastTeacherLesson"].forEach(id=>$("#"+id)?.addEventListener("click",()=>setTimeout(()=>prepareNotebook(id==="repeatLastTeacherLesson"?"seed":"new"),0)));
      document.addEventListener("click",e=>{if(e.target.closest("[data-teacher-edit]"))setTimeout(()=>prepareNotebook("edit"),0)});
      $("#saveTeacherLesson")?.addEventListener("click",()=>{saveCurrent();flush();setFocus(false)},true);
      $("#closeTeacherForm")?.addEventListener("click",()=>setFocus(false));
      $("#cancelTeacherLesson")?.addEventListener("click",()=>setFocus(false));
      $("#teacherLessonForm")?.addEventListener("input",()=>{const item=getCurrent(false);if(item)saveCurrent(item.blocks)});
    }
    function prepareNotebook(mode){
      const form=$("#teacherLessonForm");if(!form||form.classList.contains("hidden"))return;
      staffTool={...staffTool,kind:"none",label:"請先選擇符號"};spanStart=null;
      if(mode==="new"||mode==="seed"){form.dataset.classroomNotebookId="";localStorage.removeItem(ACTIVE)}
      const list=load(),match=list.find(x=>same(x.signature,sig()));
      if(match){form.dataset.classroomNotebookId=match.id;localStorage.setItem(ACTIVE,match.id)}else getCurrent(true);
      renderWorkspace();
      if(mode==="new"&&currentBlocks().length===0)addBlock("text");
    }

    function renderTabs(){
      const nav=$("#notebookTabs");if(!nav)return;
      nav.innerHTML=tabs.map(([id,label,icon])=>`<button type="button" class="${activeTab===id?"active":""}" data-nb-tab="${id}"><b>${icon}</b><span>${label}</span></button>`).join("");
      $$("[data-nb-tab]",nav).forEach(b=>b.onclick=()=>setTab(b.dataset.nbTab));
    }
    function blockShell(b,title,body){return `<article class="classroom-block" data-block-id="${b.id}"><header><strong>${title}</strong><div class="block-actions"><button type="button" data-clone-block="${b.id}" aria-label="複製">⧉</button><button type="button" class="block-delete" data-delete-block="${b.id}" aria-label="刪除">×</button></div></header>${body}</article>`}
    const memoHtml=b=>`<label class="block-memo"><span>備註</span><input data-block-memo="${b.id}" value="${esc(b.memo||"")}" placeholder="老師補充、練習重點…"></label>`;
    function pageHead(title,desc,type,label){return `<div class="workspace-head"><div><h3>${title}</h3><p>${desc}</p></div>${type?`<button type="button" class="workspace-add" data-page-add="${type}">＋ ${label}</button>`:""}</div>`}

    function renderWorkspace(){
      renderTabs();
      const host=$("#classroomWorkspace");if(!host)return;
      if(activeTab==="quick")host.innerHTML=pageHead("上課速記","老師邊講邊打；一段一個主題，之後再整理。","text","新增速記")+renderTextBlocks();
      if(activeTab==="staff")host.innerHTML=pageHead("五線譜","常用符號固定在前面；進階記號依類別分頁。","staff","新增五線譜")+renderStaffBlocks();
      if(activeTab==="tab")host.innerHTML=pageHead("TAB 六線譜","格數先選一次，再連續點弦位。","tab","新增 TAB")+renderTabBlocks();
      if(activeTab==="chords")host.innerHTML=pageHead("和弦","快速記和弦進行與老師指定順序。","chords","新增和弦段")+renderChordBlocks();
      if(activeTab==="rhythm")host.innerHTML=pageHead("節奏","記 BPM、拍號與上下刷節奏。","rhythm","新增節奏")+renderRhythmBlocks();
      if(activeTab==="summary")host.innerHTML=renderSummary();
      $$('[data-page-add]',host).forEach(b=>b.onclick=()=>addBlock(b.dataset.pageAdd));
      bindCommonBlockEvents(host);
      if(activeTab==="staff")bindStaffEvents(host);
      if(activeTab==="tab")bindTabEvents(host);
      if(activeTab==="chords")bindChordEvents(host);
      if(activeTab==="rhythm")bindRhythmEvents(host);
      if(activeTab==="summary")bindSummaryEvents(host);
      document.dispatchEvent(new CustomEvent("gc:workspace-rendered"));
    }
    function emptyState(type,label){return `<div class="classroom-empty"><strong>還沒有${label}</strong><span>按右上角「＋ 新增」開始。</span><button type="button" data-page-add="${type}">＋ 新增${label}</button></div>`}

    function renderTextBlocks(){const list=blocksOf("text");return list.length?`<div class="classroom-blocks">${list.map(b=>blockShell(b,"快速筆記",`<textarea data-text-block="${b.id}" rows="6" placeholder="老師現在講什麼就直接打…">${esc(b.text||"")}</textarea>`)).join("")}</div>`:emptyState("text","速記")}

    const noteGlyph={whole:"𝅝",half:"𝅗𝅥",quarter:"♩",eighth:"♪",sixteenth:"♬",thirtysecond:"♬"};
    const restGlyph={whole:"𝄻",half:"𝄼",quarter:"𝄽",eighth:"𝄾",sixteenth:"𝄿",thirtysecond:"𝄿"};
    const pitchSlots=["C6","B5","A5","G5","F5","E5","D5","C5","B4","A4","G4","F4","E4","D4","C4","B3","A3","G3"];
    const staffYs=pitchSlots.map((_,i)=>10+i*4.75);
    const keyLabels={C:"C / Am",G:"G / Em",D:"D / Bm",A:"A / F♯m",E:"E / C♯m",B:"B / G♯m","F#":"F♯ / D♯m","C#":"C♯ / A♯m",F:"F / Dm",Bb:"B♭ / Gm",Eb:"E♭ / Cm",Ab:"A♭ / Fm",Db:"D♭ / B♭m",Gb:"G♭ / E♭m",Cb:"C♭ / A♭m"};
    function normalizeStaffItems(b){
      if(Array.isArray(b.items)&&b.items.length)return b.items;
      return (b.notes||[]).map(n=>({id:uid(),kind:"note",duration:"quarter",x:n.x,y:n.y,accidental:"",dot:0,pitch:""}));
    }
    function snapshotStaff(id){const b=currentBlocks().find(x=>x.id===id);if(!b)return;const items=clone(normalizeStaffItems(b));const h=historyMap.get(id)||[];h.push(items);if(h.length>40)h.shift();historyMap.set(id,h);futureMap.delete(id)}
    function setStaffItems(id,items,withHistory=true){if(withHistory)snapshotStaff(id);updateBlock(id,{items,notes:[]});refreshStaff(id)}
    function undoStaff(id){const h=historyMap.get(id)||[];if(!h.length)return;const b=currentBlocks().find(x=>x.id===id);if(!b)return;const f=futureMap.get(id)||[];f.push(clone(normalizeStaffItems(b)));futureMap.set(id,f);const prev=h.pop();historyMap.set(id,h);updateBlock(id,{items:prev,notes:[]});refreshStaff(id)}
    function redoStaff(id){const f=futureMap.get(id)||[];if(!f.length)return;const b=currentBlocks().find(x=>x.id===id);if(!b)return;const h=historyMap.get(id)||[];h.push(clone(normalizeStaffItems(b)));historyMap.set(id,h);const next=f.pop();futureMap.set(id,f);updateBlock(id,{items:next,notes:[]});refreshStaff(id)}

    const palettes={
      common:[
        ["♩ 4分","note","quarter"],["♪ 8分","note","eighth"],["♬ 16分","note","sixteenth"],["𝅗𝅥 2分","note","half"],["𝅝 全音","note","whole"],["𝄽 休4","rest","quarter"],["𝄾 休8","rest","eighth"],["⌫ 擦除","erase",""]
      ],
      notes:[
        ["𝅝 全音符","note","whole"],["𝅗𝅥 二分音符","note","half"],["♩ 四分音符","note","quarter"],["♪ 八分音符","note","eighth"],["♬ 十六分","note","sixteenth"],["32 三十二分","note","thirtysecond"],
        ["𝄻 全休止","rest","whole"],["𝄼 二分休止","rest","half"],["𝄽 四分休止","rest","quarter"],["𝄾 八分休止","rest","eighth"],["𝄿 十六休止","rest","sixteenth"],["32R 三十二休止","rest","thirtysecond"]
      ],
      theory:[
        ["│ 小節線","bar","single"],["‖ 雙小節","bar","double"],["𝄂 終止線","bar","final"],["𝄆 反覆開始","bar","repeatStart"],["𝄇 反覆結束","bar","repeatEnd"],
        ["3 三連音","mark","tuplet3"],["5 五連音","mark","tuplet5"],["6 六連音","mark","tuplet6"],["7 七連音","mark","tuplet7"],["8va","mark","8va"],["8vb","mark","8vb"],["15ma","mark","15ma"],
        ["𝄋 Segno","mark","segno"],["𝄌 Coda","mark","coda"],["D.C.","mark","DC"],["D.S.","mark","DS"],["Fine","mark","Fine"],["To Coda","mark","To Coda"]
      ],
      expression:[
        ["• 斷奏","mark","staccato"],["> 重音","mark","accent"],["^ 強重音","mark","marcato"],["— 保持","mark","tenuto"],["𝄐 延長","mark","fermata"],[", 換氣","mark","breath"],["// 停頓","mark","caesura"],
        ["⌒ 延音線","span","tie"],["⌢ 圓滑線","span","slur"],["< 漸強","span","cresc"],["> 漸弱","span","dim"],
        ["ppp","mark","ppp"],["pp","mark","pp"],["p","mark","p"],["mp","mark","mp"],["mf","mark","mf"],["f","mark","f"],["ff","mark","ff"],["fff","mark","fff"],["sfz","mark","sfz"],
        ["tr 顫音","mark","tr"],["turn 回音","mark","turn"],["mord. 波音","mark","mordent"]
      ],
      guitar:[
        ["H 擊弦","mark","H"],["P 勾弦","mark","P"],["B 推弦","mark","B"],["R 放弦","mark","R"],["/ 上滑","mark","/"],["\\ 下滑","mark","\\"],["~ 顫音","mark","~"],["T 點弦","mark","T"],
        ["PM 悶音","mark","PM"],["let ring","mark","let ring"],["Harm. 泛音","mark","Harm."],["x 悶音","mark","x"],["p 拇指","mark","RH-p"],["i 食指","mark","RH-i"],["m 中指","mark","RH-m"],["a 無名指","mark","RH-a"],
        ["0 空弦指法","mark","0"],["1 食指","mark","1"],["2 中指","mark","2"],["3 無名指","mark","3"],["4 小指","mark","4"],["① 1弦","mark","①"],["② 2弦","mark","②"],["③ 3弦","mark","③"],["④ 4弦","mark","④"],["⑤ 5弦","mark","⑤"],["⑥ 6弦","mark","⑥"]
      ]
    };
    const paletteTabs=[["common","常用"],["notes","音符/休止"],["theory","調號/結構"],["expression","表情/力度"],["guitar","吉他技巧"]];
    function toolActive(kind,val){if(kind==="note"||kind==="rest")return staffTool.kind===kind&&staffTool.duration===val;if(kind==="bar"||kind==="mark"||kind==="span")return staffTool.kind===kind&&staffTool.mark===val;return staffTool.kind===kind}
    function paletteButton([label,kind,val]){return `<button type="button" class="${toolActive(kind,val)?"active":""}" data-staff-tool="${kind}" data-tool-value="${esc(val)}" data-tool-label="${esc(label)}">${label}</button>`}
    function staffPalette(){
      return `<div class="staff-palette">
        <div class="staff-palette-tabs">${paletteTabs.map(([id,l])=>`<button type="button" class="${paletteTab===id?"active":""}" data-palette-tab="${id}">${l}</button>`).join("")}</div>
        <div class="staff-tool-grid">${(palettes[paletteTab]||palettes.common).map(paletteButton).join("")}</div>
        <div class="staff-modifiers">
          <span>升降：</span>
          <button type="button" data-accidental="" class="${staffTool.accidental===""?"active":""}">無</button>
          <button type="button" data-accidental="sharp" class="${staffTool.accidental==="sharp"?"active":""}">♯</button>
          <button type="button" data-accidental="flat" class="${staffTool.accidental==="flat"?"active":""}">♭</button>
          <button type="button" data-accidental="natural" class="${staffTool.accidental==="natural"?"active":""}">♮</button>
          <button type="button" data-accidental="doubleSharp" class="${staffTool.accidental==="doubleSharp"?"active":""}">×</button>
          <button type="button" data-accidental="doubleFlat" class="${staffTool.accidental==="doubleFlat"?"active":""}">♭♭</button>
          <span>附點：</span>
          <button type="button" data-dot-count="0" class="${staffTool.dot===0?"active":""}">無</button>
          <button type="button" data-dot-count="1" class="${staffTool.dot===1?"active":""}">·</button>
          <button type="button" data-dot-count="2" class="${staffTool.dot===2?"active":""}">··</button>
        </div>
        <div class="selected-tool"><span>目前工具</span><strong>${esc(staffTool.label||"工具")}</strong><small>${spanStart?"已選起點，請點終點":"選一次後可連續輸入"}</small></div>
      </div>`;
    }
    function keySymbol(key){const sharps={G:"♯",D:"♯♯",A:"♯♯♯",E:"♯♯♯♯",B:"♯♯♯♯♯","F#":"♯♯♯♯♯♯","C#":"♯♯♯♯♯♯♯"},flats={F:"♭",Bb:"♭♭",Eb:"♭♭♭",Ab:"♭♭♭♭",Db:"♭♭♭♭♭",Gb:"♭♭♭♭♭♭",Cb:"♭♭♭♭♭♭♭"};return sharps[key]||flats[key]||""}
    function accidentalGlyph(a){return {sharp:"♯",flat:"♭",natural:"♮",doubleSharp:"×",doubleFlat:"♭♭"}[a]||""}
    function markGlyph(mark){const map={staccato:"•",accent:">",marcato:"^",tenuto:"—",fermata:"𝄐",breath:",",caesura:"//",tuplet3:"3",tuplet5:"5",tuplet6:"6",tuplet7:"7",segno:"𝄋",coda:"𝄌",mordent:"mord.",turn:"turn",DC:"D.C.",DS:"D.S.","RH-p":"p","RH-i":"i","RH-m":"m","RH-a":"a"};return map[mark]||mark}
    function itemHtml(it,i){
      if(it.kind==="bar")return `<i class="staff-symbol barline ${esc(it.mark||"single")}" data-staff-item="${i}" style="left:${it.x}%"></i>`;
      if(it.kind==="span"){const left=Math.min(it.x,it.x2),right=Math.max(it.x,it.x2),top=(it.y+it.y2)/2;return `<i class="staff-span ${esc(it.mark)}" data-staff-item="${i}" style="left:${left}%;width:${Math.max(3,right-left)}%;top:${top}%"><span>${it.mark==="cresc"?"<":it.mark==="dim"?">":""}</span></i>`}
      if(it.kind==="mark")return `<i class="staff-symbol staff-mark" data-staff-item="${i}" style="left:${it.x}%;top:${it.y}%">${esc(markGlyph(it.mark))}</i>`;
      const glyph=it.kind==="rest"?(restGlyph[it.duration]||"𝄽"):(noteGlyph[it.duration]||"♩");
      return `<i class="staff-symbol ${it.kind} dur-${it.duration}" data-staff-item="${i}" style="left:${it.x}%;top:${it.y}%"><span class="acc">${accidentalGlyph(it.accidental)}</span><span class="glyph">${glyph}</span>${it.dot?`<span class="dot">${"•".repeat(it.dot)}</span>`:""}</i>`;
    }
    function staffHtml(b){
      const items=normalizeStaffItems(b),clef=b.clef||"treble",meter=b.meter??"",key=b.key||"C";
      return blockShell(b,"五線譜",`${staffPalette()}
        <div class="staff-settings">
          <label>譜號<select data-staff-clef="${b.id}"><option value="treble" ${clef==="treble"?"selected":""}>高音譜號</option><option value="bass" ${clef==="bass"?"selected":""}>低音譜號</option></select></label>
          <label>調號<select data-staff-key="${b.id}">${Object.entries(keyLabels).map(([k,l])=>`<option value="${k}" ${key===k?"selected":""}>${l}</option>`).join("")}</select></label>
          <label>拍號<select data-staff-meter="${b.id}"><option value="" ${meter===""?"selected":""}>未設定</option>${["4/4","3/4","2/4","6/8","9/8","12/8","5/4","7/8","C","¢"].map(x=>`<option ${meter===x?"selected":""}>${x}</option>`).join("")}</select></label>
          <div class="staff-history"><button type="button" data-staff-undo="${b.id}">↶ 復原</button><button type="button" data-staff-redo="${b.id}">↷ 重做</button><button type="button" data-clear-staff="${b.id}">清空</button></div>
        </div>
        <div class="staff-help">先選工具，再直接連點譜面。音符會吸附在線／間；擦除模式點符號即可刪除。</div>
        <div class="staff-canvas advanced" data-staff="${b.id}">
          <span class="clef">${clef==="bass"?"𝄢":"𝄞"}</span><span class="key-signature">${keySymbol(key)}</span><span class="time-signature">${esc(meter)}</span>
          ${items.map(itemHtml).join("")}
        </div>${memoHtml(b)}`);
    }
    function renderStaffBlocks(){const list=blocksOf("staff");return list.length?`<div class="classroom-blocks staff-blocks">${list.map(staffHtml).join("")}</div>`:emptyState("staff","五線譜")}

    function selectStaffTool(kind,val,label){
      if(kind==="note"||kind==="rest")staffTool={...staffTool,kind,duration:val,mark:"",label};
      else if(kind==="bar"||kind==="mark"||kind==="span")staffTool={...staffTool,kind,mark:val,label};
      else staffTool={...staffTool,kind,mark:"",label};
      spanStart=null;syncStaffToolbar();
    }
    function syncStaffToolbar(){
      const host=$("#classroomWorkspace");if(!host)return;
      $$('[data-staff-tool]',host).forEach(x=>x.classList.toggle("active",toolActive(x.dataset.staffTool,x.dataset.toolValue)));
      $$('[data-accidental]',host).forEach(x=>x.classList.toggle("active",x.dataset.accidental===staffTool.accidental));
      $$('[data-dot-count]',host).forEach(x=>x.classList.toggle("active",+x.dataset.dotCount===staffTool.dot));
      $$('.selected-tool strong',host).forEach(x=>x.textContent=staffTool.label);
      $$('.selected-tool small',host).forEach(x=>x.textContent=spanStart?"已選起點，請點終點":"選一次後可連續輸入");
    }
    const moveDeadlines=new Map();
    function armNote(el,it){
      if(it.kind!=="note")return;
      const remain=(moveDeadlines.get(it.id)||0)-Date.now();
      el.classList.toggle("note-movable",remain>0);
      if(remain>0)setTimeout(()=>{el.classList.remove("note-movable");if(moveDeadlines.get(it.id)<=Date.now())moveDeadlines.delete(it.id)},remain);
    }
    function appendStaffItem(canvas,it,index){canvas.insertAdjacentHTML("beforeend",itemHtml(it,index));armNote(canvas.lastElementChild,it)}
    function staffCanvas(id){return $$('.staff-canvas[data-staff]').find(x=>x.dataset.staff===id)}
    function refreshStaff(id){
      const canvas=staffCanvas(id),b=currentBlocks().find(x=>x.id===id);if(!canvas||!b)return;
      $$('[data-staff-item]',canvas).forEach(x=>x.remove());
      normalizeStaffItems(b).forEach((it,i)=>appendStaffItem(canvas,it,i));
      canvas.querySelector('.clef').textContent=b.clef==='bass'?'𝄢':'𝄞';
      canvas.querySelector('.key-signature').textContent=keySymbol(b.key||'C');
      canvas.querySelector('.time-signature').textContent=b.meter??'';
    }
    function bindStaffEvents(host){
      bindStaffControls(host);
      $$('[data-staff]',host).forEach(canvas=>{
        normalizeStaffItems(currentBlocks().find(b=>b.id===canvas.dataset.staff)).forEach((it,i)=>armNote(canvas.querySelector(`[data-staff-item="${i}"]`),it));
        canvas.onpointerdown=e=>{
          if(e.button!==0||!e.isPrimary)return;
          const id=canvas.dataset.staff,b=currentBlocks().find(x=>x.id===id);if(!b)return;
          const target=e.target.closest('[data-staff-item]'),items=normalizeStaffItems(b).slice();
          if(target){
            const i=+target.dataset.staffItem,it=items[i];if(!it)return;
            if(staffTool.kind==='erase'){snapshotStaff(id);items.splice(i,1);updateBlock(id,{items,notes:[]});target.remove();$$('[data-staff-item]',canvas).forEach((el,j)=>el.dataset.staffItem=j);return}
            if(it.kind==='note'&&Date.now()<(moveDeadlines.get(it.id)||0))beginDrag(e,canvas,target,id,it,i);
            return;
          }
          if(staffTool.kind==='none')return;
          const {x,y}=staffPoint(canvas,e);
          if(staffTool.kind==='erase')return;
          if(staffTool.kind==='span'&&(!spanStart||spanStart.id!==id)){spanStart={id,x,y};syncStaffToolbar();return}
          snapshotStaff(id);
          let it={id:uid(),kind:staffTool.kind,x,y};
          if(it.kind==='span'){Object.assign(it,{mark:staffTool.mark,x:spanStart.x,y:spanStart.y,x2:x,y2:y});spanStart=null;syncStaffToolbar()}
          else if(it.kind==='bar'||it.kind==='mark')it.mark=staffTool.mark;
          else Object.assign(it,{duration:staffTool.duration,accidental:staffTool.accidental,dot:staffTool.dot,pitch:pitchSlots[staffYs.indexOf(y)]||''});
          if(it.kind==='note')moveDeadlines.set(it.id,Date.now()+3000);
          items.push(it);updateBlock(id,{items,notes:[]});appendStaffItem(canvas,it,items.length-1);
        };
      });
    }
    function bindStaffControls(host){
      $$('[data-palette-tab]',host).forEach(b=>b.onclick=()=>{paletteTab=b.dataset.paletteTab;localStorage.setItem(PALETTE_KEY,paletteTab);$$('.staff-palette',host).forEach(x=>x.outerHTML=staffPalette());bindStaffControls(host)});
      $$('[data-staff-tool]',host).forEach(b=>b.onclick=()=>selectStaffTool(b.dataset.staffTool,b.dataset.toolValue,b.dataset.toolLabel));
      $$('[data-accidental]',host).forEach(b=>b.onclick=()=>{staffTool={...staffTool,accidental:b.dataset.accidental};syncStaffToolbar()});
      $$('[data-dot-count]',host).forEach(b=>b.onclick=()=>{staffTool={...staffTool,dot:+b.dataset.dotCount};syncStaffToolbar()});
      for(const [attr,key] of [['staffClef','clef'],['staffKey','key'],['staffMeter','meter']]){
        const selector=attr.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
        $$('[data-'+selector+']',host).forEach(x=>x.onchange=()=>{updateBlock(x.dataset[attr],{[key]:x.value});refreshStaff(x.dataset[attr])});
      }
      $$('[data-staff-undo]',host).forEach(b=>b.onclick=()=>undoStaff(b.dataset.staffUndo));
      $$('[data-staff-redo]',host).forEach(b=>b.onclick=()=>redoStaff(b.dataset.staffRedo));
      $$('[data-clear-staff]',host).forEach(b=>b.onclick=()=>{if(confirm('清空這一段五線譜？'))setStaffItems(b.dataset.clearStaff,[])});
    }
    function staffPoint(canvas,e){const r=canvas.getBoundingClientRect(),rx=(e.clientX-r.left)/r.width*100,ry=(e.clientY-r.top)/r.height*100;return{x:Math.max(16,Math.min(98,Math.round(rx/2)*2)),y:staffYs.reduce((a,v)=>Math.abs(v-ry)<Math.abs(a-ry)?v:a,staffYs[0])}}
    function beginDrag(e,canvas,el,id,it,index){
      e.preventDefault();const pointer=e.pointerId,original={x:it.x,y:it.y};let point=original,done=false;
      canvas.setPointerCapture(pointer);el.classList.add('note-dragging');
      const move=ev=>{if(ev.pointerId!==pointer)return;if(Date.now()>=(moveDeadlines.get(it.id)||0)){finish();return}point=staffPoint(canvas,ev);el.style.left=point.x+'%';el.style.top=point.y+'%'};
      const finish=ev=>{if(done||(ev&&ev.pointerId!==pointer))return;done=true;clearTimeout(deadline);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',finish);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);el.classList.remove('note-dragging');
        const b=currentBlocks().find(x=>x.id===id);if(b&&(point.x!==original.x||point.y!==original.y)){snapshotStaff(id);const items=normalizeStaffItems(b).slice();const i=items.findIndex(x=>x.id===it.id);if(i>=0){items[i]={...items[i],...point,pitch:pitchSlots[staffYs.indexOf(point.y)]||''};updateBlock(id,{items,notes:[]});flush()}}
        if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
      };
      const cancel=ev=>{if(ev.pointerId!==pointer)return;point=original;el.style.left=original.x+'%';el.style.top=original.y+'%';finish(ev)};
      const deadline=setTimeout(()=>finish(),Math.max(0,(moveDeadlines.get(it.id)||0)-Date.now()));
      canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
    }

    function tabHtml(b){
      const labels=["e","B","G","D","A","E"],cells=b.cells||Array.from({length:6},()=>Array(16).fill(""));
      const rows=cells.map((row,r)=>`<div class="tab-row" style="--tab-cols:${row.length}"><b>${labels[r]}</b>${row.map((v,c)=>`<button type="button" data-tab-cell="${b.id}" data-r="${r}" data-c="${c}">${esc(v)}</button>`).join("")}</div>`).join("");
      return blockShell(b,"TAB 六線譜",`<div class="tab-fast-frets"><span>格數</span>${Array.from({length:13},(_,i)=>`<button type="button" class="${selectedTabFret===String(i)?"active":""}" data-tab-quick-fret="${i}">${i}</button>`).join("")}<button type="button" class="${selectedTabFret===""?"active":""}" data-tab-quick-fret="erase">擦</button></div><div class="tab-tools"><label>其他格 <input type="number" min="0" max="24" inputmode="numeric" value="${selectedTabFret===""?"":esc(selectedTabFret)}" data-tab-fret></label><span>選一次後可連續填入</span></div><div class="tab-grid">${rows}</div>${memoHtml(b)}`);
    }
    function renderTabBlocks(){const list=blocksOf("tab");return list.length?`<div class="classroom-blocks">${list.map(tabHtml).join("")}</div>`:emptyState("tab","TAB")}
    function bindTabEvents(host){
      $$('[data-tab-quick-fret]',host).forEach(b=>b.onclick=()=>{selectedTabFret=b.dataset.tabQuickFret==="erase"?"":b.dataset.tabQuickFret;renderWorkspace()});
      $$('[data-tab-fret]',host).forEach(x=>x.oninput=()=>{selectedTabFret=x.value===""?"":String(Math.max(0,Math.min(24,+x.value||0)))});
      $$('[data-tab-cell]',host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.tabCell);if(!b)return;const cells=(b.cells||Array.from({length:6},()=>Array(16).fill(""))).map(r=>r.slice());cells[+x.dataset.r][+x.dataset.c]=selectedTabFret;updateBlock(b.id,{cells});renderWorkspace()});
    }

    function chordsHtml(b){
      const palette=["C","Cm","C7","Cmaj7","D","Dm","D7","E","Em","E7","F","Fm","Fmaj7","G","Gm","G7","A","Am","A7","B","Bm","B7"];
      return blockShell(b,"和弦進行",`<div class="chord-sequence">${(b.items||[]).map((x,i)=>`<button type="button" data-remove-chord="${b.id}" data-index="${i}">${esc(x)}</button>`).join("")||"<span>點下面和弦快速加入</span>"}</div><div class="chord-palette">${palette.map(x=>`<button type="button" data-add-chord="${b.id}" data-chord="${x}">${x}</button>`).join("")}</div><div class="custom-chord"><input placeholder="自訂，例如 Asus4" data-chord-input="${b.id}"><button type="button" data-custom-chord="${b.id}">加入</button></div>${memoHtml(b)}`);
    }
    function renderChordBlocks(){const list=blocksOf("chords");return list.length?`<div class="classroom-blocks">${list.map(chordsHtml).join("")}</div>`:emptyState("chords","和弦段")}
    function bindChordEvents(host){
      $$('[data-add-chord]',host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.addChord);if(!b)return;updateBlock(b.id,{items:[...(b.items||[]),x.dataset.chord]});renderWorkspace()});
      $$('[data-remove-chord]',host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.removeChord);if(!b)return;const items=(b.items||[]).slice();items.splice(+x.dataset.index,1);updateBlock(b.id,{items});renderWorkspace()});
      $$('[data-custom-chord]',host).forEach(x=>x.onclick=()=>{const input=host.querySelector(`[data-chord-input="${x.dataset.customChord}"]`),v=input?.value.trim();if(!v)return;const b=currentBlocks().find(q=>q.id===x.dataset.customChord);if(!b)return;updateBlock(b.id,{items:[...(b.items||[]),v]});renderWorkspace()});
    }

    function rhythmHtml(b){return blockShell(b,"節奏",`<div class="rhythm-settings"><label>BPM <input type="number" min="30" max="240" value="${b.bpm||70}" data-rhythm-bpm="${b.id}"></label><label>拍號 <select data-rhythm-meter="${b.id}">${["4/4","3/4","2/4","6/8","12/8"].map(x=>`<option ${b.meter===x?"selected":""}>${x}</option>`).join("")}</select></label></div><div class="rhythm-beats">${(b.beats||Array(8).fill("")).map((v,i)=>`<button type="button" data-rhythm-beat="${b.id}" data-index="${i}"><small>${i+1}</small><strong>${esc(v)||"○"}</strong></button>`).join("")}</div><small class="rhythm-help">每格連點循環：空白 → ↓ 下刷 → ↑ 上刷 → · 不刷 → × 悶音</small>${memoHtml(b)}`)}
    function renderRhythmBlocks(){const list=blocksOf("rhythm");return list.length?`<div class="classroom-blocks">${list.map(rhythmHtml).join("")}</div>`:emptyState("rhythm","節奏")}
    function bindRhythmEvents(host){
      $$('[data-rhythm-bpm]',host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmBpm,{bpm:Math.max(30,Math.min(240,+x.value||70))}));
      $$('[data-rhythm-meter]',host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmMeter,{meter:x.value}));
      $$('[data-rhythm-beat]',host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.rhythmBeat);if(!b)return;const marks=["","↓","↑","·","×"],beats=(b.beats||Array(8).fill("")).slice(),i=+x.dataset.index;beats[i]=marks[(marks.indexOf(beats[i])+1)%marks.length];updateBlock(b.id,{beats});renderWorkspace()});
    }

    function tabSummary(b){const labels=["e","B","G","D","A","E"],parts=[];(b.cells||[]).forEach((row,i)=>{const used=row.map((v,c)=>v!==""?`${c+1}:${v}`:"").filter(Boolean);if(used.length)parts.push(`${labels[i]}弦 ${used.join(" ")}`)});return parts.join(" / ")}
    function blockSummary(b){
      let text="";
      if(b.type==="text")text=(b.text||"").trim();
      if(b.type==="staff"){const items=normalizeStaffItems(b);text=items.length?`五線譜：${items.length} 個記號、${keyLabels[b.key||"C"]||b.key||"C"}、${b.meter||"未設定拍號"}`:""}
      if(b.type==="tab"){const s=tabSummary(b);if(s)text=`TAB：${s}`}
      if(b.type==="chords"&&(b.items||[]).length)text=`和弦：${b.items.join(" → ")}`;
      if(b.type==="rhythm"){const marks=(b.beats||[]).filter(Boolean).join(" ");text=`節奏：${b.bpm||70} BPM、${b.meter||"未設定拍號"}${marks?"、"+marks:""}`}
      if(b.memo?.trim())text+=(text?"；":"")+b.memo.trim();
      return text;
    }
    function renderSummary(){
      const blocks=currentBlocks(),lines=blocks.map(blockSummary).filter(Boolean);
      const counts={text:blocksOf("text").length,staff:blocksOf("staff").length,tab:blocksOf("tab").length,chords:blocksOf("chords").length,rhythm:blocksOf("rhythm").length};
      return `${pageHead("下課整理","確認今天記下來的內容，再一鍵帶入原本的「老師提醒」。")}
        <div class="summary-stats"><span>速記 <b>${counts.text}</b></span><span>五線譜 <b>${counts.staff}</b></span><span>TAB <b>${counts.tab}</b></span><span>和弦 <b>${counts.chords}</b></span><span>節奏 <b>${counts.rhythm}</b></span></div>
        <div class="summary-preview">${lines.length?lines.map((x,i)=>`<div><b>${i+1}</b><span>${esc(x)}</span></div>`).join(""):'<p>這堂課還沒有可整理的內容。</p>'}</div>
        <div class="summary-actions"><button type="button" class="primary" id="applyNotebookSummary" ${lines.length?"":"disabled"}>整理到老師提醒</button><button type="button" class="secondary" id="backToQuick">回速記</button></div>
        <p class="summary-note">整理後仍可修改「老師提醒、卡住的地方、回家作業」，最後再按原本的「儲存課堂筆記」。</p>`;
    }
    function bindSummaryEvents(host){
      $("#backToQuick",host)?.addEventListener("click",()=>setTab("quick"));
      $("#applyNotebookSummary",host)?.addEventListener("click",organizeToTeacherNotes);
    }
    function organizeToTeacherNotes(){
      const lines=currentBlocks().map(blockSummary).filter(Boolean);if(!lines.length)return;
      const notes=$("#teacherNotes");if(!notes)return;
      const compiled="【課堂筆記整理】\n"+lines.map((x,i)=>`${i+1}. ${x}`).join("\n");
      if(!notes.value.includes(compiled))notes.value=(notes.value.trim()?notes.value.trim()+"\n\n":"")+compiled;
      notes.dispatchEvent(new Event("input",{bubbles:true}));setFocus(false);notes.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>notes.focus(),250);
    }

    function bindCommonBlockEvents(host){
      $$('[data-delete-block]',host).forEach(x=>x.onclick=()=>removeBlock(x.dataset.deleteBlock));
      $$('[data-clone-block]',host).forEach(x=>x.onclick=()=>cloneBlock(x.dataset.cloneBlock));
      $$('[data-block-memo]',host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.blockMemo,{memo:x.value}));
      $$('[data-text-block]',host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.textBlock,{text:x.value}));
    }

    injectUI();
  }
})();
