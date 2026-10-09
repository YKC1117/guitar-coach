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
    let selectedTabFret="0";
    let staffTool={kind:"note",duration:"quarter",accidental:"",dot:false,mark:""};
    const redoMap=new Map();

    const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const uid=()=>"nb-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch(e){return[]}};
    const persist=list=>localStorage.setItem(STORE,JSON.stringify(list));
    const sig=()=>({date:$("#teacherLessonDate")?.value||"",teacher:$("#teacherName")?.value.trim()||"",song:$("#teacherSong")?.value.trim()||"",topic:$("#teacherTopic")?.value.trim()||""});
    const same=(a,b)=>a&&b&&a.date===b.date&&a.teacher===b.teacher&&a.song===b.song&&a.topic===b.topic;

    function getCurrent(create=true){
      const form=$("#teacherLessonForm"); if(!form)return null;
      const list=load();
      let id=form.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
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
      if(status){const d=new Date();status.textContent="已暫存 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
    }
    function currentBlocks(){return getCurrent(true)?.blocks||[]}
    function setBlocks(blocks){saveCurrent(blocks);renderBlocks()}
    function addBlock(type){
      const blocks=currentBlocks().slice(),base={id:uid(),type,memo:""};
      if(type==="text")Object.assign(base,{text:""});
      if(type==="staff")Object.assign(base,{items:[],notes:[],clef:"treble",meter:"4/4"});
      if(type==="tab")Object.assign(base,{cells:Array.from({length:6},()=>Array(12).fill(""))});
      if(type==="chords")Object.assign(base,{items:[]});
      if(type==="rhythm")Object.assign(base,{bpm:70,meter:"4/4",beats:Array(8).fill("")});
      blocks.push(base);setBlocks(blocks);
      requestAnimationFrame(()=>$("[data-block-id='"+base.id+"']")?.scrollIntoView({behavior:"smooth",block:"center"}));
    }
    function updateBlock(id,patch,clearRedo=true){if(clearRedo)redoMap.delete(id);saveCurrent(currentBlocks().map(b=>b.id===id?{...b,...patch}:b))}
    function removeBlock(id){if(confirm("刪除這段課堂筆記？"))setBlocks(currentBlocks().filter(b=>b.id!==id))}
    function moveBlock(id,delta){const blocks=currentBlocks().slice(),i=blocks.findIndex(b=>b.id===id),j=i+delta;if(i<0||j<0||j>=blocks.length)return;[blocks[i],blocks[j]]=[blocks[j],blocks[i]];setBlocks(blocks)}
    function cloneBlock(id){const blocks=currentBlocks().slice(),i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy=structuredClone(blocks[i]);copy.id=uid();blocks.splice(i+1,0,copy);setBlocks(blocks)}
    function setFocus(on){document.body.classList.toggle("classroom-focus",on);const b=$("#classroomFocusBtn");if(b)b.textContent=on?"結束專注":"上課專注模式";if(on)$("#classroomNotebook")?.scrollIntoView({block:"start"})}

    function injectUI(){
      const form=$("#teacherLessonForm");if(!form||$("#classroomNotebook"))return;
      const anchor=$("#teacherTopic")?.closest(".field");if(!anchor)return;
      const box=document.createElement("section");box.id="classroomNotebook";box.className="classroom-notebook";
      box.innerHTML=`<div class="classroom-head"><div><span class="kicker">DIGITAL NOTEBOOK</span><h2>課堂筆記本</h2><p>上課直接打字、記五線譜、TAB、和弦與節奏。</p></div><span id="classroomAutoSave">自動暫存</span></div>
      <div class="classroom-session-actions"><button type="button" class="focus-btn" id="classroomFocusBtn">上課專注模式</button><button type="button" class="organize-btn" id="classroomOrganizeBtn">整理到老師提醒</button></div>
      <div class="classroom-toolbar"><button type="button" data-add-block="text"><b>＋</b>文字</button><button type="button" data-add-block="staff"><b>𝄞</b>五線譜</button><button type="button" data-add-block="tab"><b>TAB</b>六線譜</button><button type="button" data-add-block="chords"><b>C</b>和弦</button><button type="button" data-add-block="rhythm"><b>♩</b>節奏</button></div>
      <div class="classroom-tip">五線譜採「先選符號、再連點譜面」；選一次就能連續輸入，適合老師快速講課。</div><div id="classroomBlocks" class="classroom-blocks"></div>`;
      anchor.insertAdjacentElement("afterend",box);
      $$("[data-add-block]",box).forEach(b=>b.onclick=()=>addBlock(b.dataset.addBlock));
      $("#classroomFocusBtn").onclick=()=>setFocus(!document.body.classList.contains("classroom-focus"));
      $("#classroomOrganizeBtn").onclick=organizeToTeacherNotes;
      const quick=document.createElement("button");quick.type="button";quick.className="secondary classroom-open";quick.id="openClassroomNotebook";quick.textContent="上課筆記本";
      quick.onclick=()=>{$("#newTeacherLesson")?.click();setTimeout(()=>$("#classroomNotebook")?.scrollIntoView({behavior:"smooth",block:"start"}),50)};
      $(".teacher-summary-actions")?.prepend(quick);
      bindOpenHooks();renderBlocks();
    }
    function bindOpenHooks(){
      ["newTeacherLesson","emptyNewTeacherLesson","repeatLastTeacherLesson"].forEach(id=>$("#"+id)?.addEventListener("click",()=>setTimeout(()=>prepareNotebook(id==="repeatLastTeacherLesson"?"seed":"new"),0)));
      document.addEventListener("click",e=>{if(e.target.closest("[data-teacher-edit]"))setTimeout(()=>prepareNotebook("edit"),0)});
      $("#saveTeacherLesson")?.addEventListener("click",()=>{saveCurrent();setFocus(false)},true);
      $("#closeTeacherForm")?.addEventListener("click",()=>setFocus(false));$("#cancelTeacherLesson")?.addEventListener("click",()=>setFocus(false));
      $("#teacherLessonForm")?.addEventListener("input",()=>{const item=getCurrent(false);if(item)saveCurrent(item.blocks)});
    }
    function prepareNotebook(mode){
      const form=$("#teacherLessonForm");if(!form||form.classList.contains("hidden"))return;
      if(mode==="new"||mode==="seed"){form.dataset.classroomNotebookId="";localStorage.removeItem(ACTIVE)}
      const list=load(),match=list.find(x=>same(x.signature,sig()));if(match){form.dataset.classroomNotebookId=match.id;localStorage.setItem(ACTIVE,match.id)}else getCurrent(true);
      renderBlocks();if(mode==="new"&&currentBlocks().length===0)addBlock("text");
    }

    function blockShell(b,title,body){return `<article class="classroom-block" data-block-id="${b.id}"><header><strong>${title}</strong><div class="block-actions"><button type="button" data-move-up="${b.id}">↑</button><button type="button" data-move-down="${b.id}">↓</button><button type="button" data-clone-block="${b.id}">⧉</button><button type="button" class="block-delete" data-delete-block="${b.id}">×</button></div></header>${body}</article>`}
    const memoHtml=b=>`<label class="block-memo"><span>這段備註</span><input data-block-memo="${b.id}" value="${esc(b.memo||"")}" placeholder="例如：這段回家慢練"></label>`;

    const noteGlyph={whole:"𝅝",half:"𝅗𝅥",quarter:"♩",eighth:"♪",sixteenth:"♬"};
    const restGlyph={whole:"𝄻",half:"𝄼",quarter:"𝄽",eighth:"𝄾",sixteenth:"𝄿"};
    const pitchSlots=["A5","G5","F5","E5","D5","C5","B4","A4","G4","F4","E4","D4","C4","B3","A3"];
    const staffYs=pitchSlots.map((_,i)=>14+i*5.15);
    function normalizeStaffItems(b){if(Array.isArray(b.items)&&b.items.length)return b.items;return (b.notes||[]).map(n=>({id:uid(),kind:"note",duration:"quarter",x:n.x,y:n.y,accidental:"",dot:false,pitch:""}))}
    function toolButton(label,kind,duration="",mark=""){const active=staffTool.kind===kind&&(!duration||staffTool.duration===duration)&&(!mark||staffTool.mark===mark);return `<button type="button" class="${active?"active":""}" data-staff-kind="${kind}" ${duration?`data-duration="${duration}"`:""} ${mark?`data-mark="${esc(mark)}"`:""}>${label}</button>`}
    function staffToolbar(){return `<div class="staff-fastbar" aria-label="五線譜快速輸入"><div class="staff-tool-row main-tools">${toolButton("♩ 4分","note","quarter")}${toolButton("♪ 8分","note","eighth")}${toolButton("♬ 16分","note","sixteenth")}${toolButton("𝅗𝅥 2分","note","half")}${toolButton("𝅝 全音","note","whole")}${toolButton("休4","rest","quarter")}${toolButton("休8","rest","eighth")}${toolButton("⌫ 擦除","erase")}</div><div class="staff-tool-row modifiers"><button type="button" data-accidental="sharp" class="${staffTool.accidental==="sharp"?"active":""}">♯</button><button type="button" data-accidental="flat" class="${staffTool.accidental==="flat"?"active":""}">♭</button><button type="button" data-accidental="natural" class="${staffTool.accidental==="natural"?"active":""}">♮</button><button type="button" data-dot class="${staffTool.dot?"active":""}">· 附點</button><button type="button" data-staff-undo>↶ 復原</button><button type="button" data-staff-redo>↷ 重做</button><button type="button" data-more-symbols>更多符號</button></div><div class="staff-more hidden" data-staff-more><div class="staff-more-group"><span>休止符</span>${toolButton("休全","rest","whole")}${toolButton("休2","rest","half")}${toolButton("休16","rest","sixteenth")}</div><div class="staff-more-group"><span>小節 / 反覆</span>${toolButton("│","bar","","single")}${toolButton("‖","bar","","double")}${toolButton("𝄂","bar","","final")}${toolButton("𝄆","bar","","repeatStart")}${toolButton("𝄇","bar","","repeatEnd")}</div><div class="staff-more-group"><span>表情 / 奏法</span>${toolButton("• 斷奏","mark","","staccato")}${toolButton("> 重音","mark","","accent")}${toolButton("— 保持","mark","","tenuto")}${toolButton("𝄐 延長","mark","","fermata")}${toolButton("⌒ 延音","mark","","tie")}${toolButton("⌢ 圓滑","mark","","slur")}</div><div class="staff-more-group"><span>力度</span>${toolButton("p","mark","","p")}${toolButton("mp","mark","","mp")}${toolButton("mf","mark","","mf")}${toolButton("f","mark","","f")}${toolButton("ff","mark","","ff")}${toolButton("< 漸強","mark","","cresc")}${toolButton("> 漸弱","mark","","dim")}</div><div class="staff-more-group"><span>吉他常用</span>${toolButton("H","mark","","H")}${toolButton("P","mark","","P")}${toolButton("B","mark","","B")}${toolButton("/ 滑音","mark","","/")}${toolButton("\\ 滑音","mark","","\\")}${toolButton("PM","mark","","PM")}${toolButton("let ring","mark","","let ring")}</div></div></div>`}
    function itemHtml(it,i){if(it.kind==="bar")return `<i class="staff-symbol barline ${esc(it.mark||"single")}" data-staff-item="${i}" style="left:${it.x}%"></i>`;if(it.kind==="mark"){const map={staccato:"•",accent:">",tenuto:"—",fermata:"𝄐",tie:"⌒",slur:"⌢",cresc:"<",dim:">"};return `<i class="staff-symbol staff-mark" data-staff-item="${i}" style="left:${it.x}%;top:${it.y}%">${esc(map[it.mark]||it.mark)}</i>`}const glyph=it.kind==="rest"?(restGlyph[it.duration]||"𝄽"):(noteGlyph[it.duration]||"♩");const accidental=it.accidental==="sharp"?"♯":it.accidental==="flat"?"♭":it.accidental==="natural"?"♮":"";return `<i class="staff-symbol ${it.kind} dur-${it.duration}" data-staff-item="${i}" style="left:${it.x}%;top:${it.y}%"><span class="acc">${accidental}</span><span class="glyph">${glyph}</span>${it.dot?'<span class="dot">•</span>':""}</i>`}
    function staffHtml(b){const items=normalizeStaffItems(b);b.items=items;return blockShell(b,"五線譜・快速輸入",`${staffToolbar()}<div class="staff-settings"><label>譜號 <select data-staff-clef="${b.id}"><option value="treble" ${b.clef!=="bass"?"selected":""}>𝄞 高音</option><option value="bass" ${b.clef==="bass"?"selected":""}>𝄢 低音</option></select></label><label>拍號 <select data-staff-meter="${b.id}">${["4/4","3/4","2/4","6/8","12/8","C","¢"].map(m=>`<option ${b.meter===m?"selected":""}>${m}</option>`).join("")}</select></label><span>目前：${staffTool.kind==="note"?(noteGlyph[staffTool.duration]+" "+staffTool.duration):staffTool.kind==="rest"?("休止 "+staffTool.duration):staffTool.kind==="erase"?"擦除":staffTool.mark||staffTool.kind}</span></div><div class="staff-help">選一次符號後直接連點譜面；音高會自動吸附。點既有符號可刪除。</div><div class="staff-canvas" data-staff="${b.id}"><span class="clef">${b.clef==="bass"?"𝄢":"𝄞"}</span><span class="meter">${esc(b.meter||"4/4")}</span>${items.map(itemHtml).join("")}</div><div class="mini-actions"><button type="button" data-clear-staff="${b.id}">清空這段</button></div>${memoHtml(b)}`)}
    function tabHtml(b){const labels=["e","B","G","D","A","E"],cells=b.cells||Array.from({length:6},()=>Array(12).fill(""));const rows=cells.map((row,r)=>`<div class="tab-row" style="--tab-cols:${row.length}"><b>${labels[r]}</b>${row.map((v,c)=>`<button type="button" data-tab-cell="${b.id}" data-r="${r}" data-c="${c}">${esc(v)}</button>`).join("")}</div>`).join("");return blockShell(b,"TAB 六線譜",`<div class="tab-tools"><label>格數 <input type="number" min="0" max="24" inputmode="numeric" value="${selectedTabFret}" data-tab-fret></label><button type="button" data-tab-erase>橡皮擦</button><span>先選格數，再點弦的位置</span></div><div class="tab-grid">${rows}</div>${memoHtml(b)}`)}
    function chordsHtml(b){const palette=["C","Cm","D","Dm","E","Em","F","Fm","G","Gm","A","Am","B","Bm","C7","D7","E7","G7","A7","Cmaj7","Fmaj7","Asus2","Dsus4"];return blockShell(b,"和弦進行",`<div class="chord-sequence">${(b.items||[]).map((x,i)=>`<button type="button" data-remove-chord="${b.id}" data-index="${i}">${esc(x)}</button>`).join("")||"<span>點下面和弦加入順序</span>"}</div><div class="chord-palette">${palette.map(x=>`<button type="button" data-add-chord="${b.id}" data-chord="${x}">${x}</button>`).join("")}</div><div class="custom-chord"><input placeholder="自訂，例如 F#m7" data-chord-input="${b.id}"><button type="button" data-custom-chord="${b.id}">加入</button></div>${memoHtml(b)}`)}
    function rhythmHtml(b){return blockShell(b,"節奏 / 拍號",`<div class="rhythm-settings"><label>BPM <input type="number" min="30" max="240" value="${b.bpm||70}" data-rhythm-bpm="${b.id}"></label><label>拍號 <select data-rhythm-meter="${b.id}"><option ${b.meter==="4/4"?"selected":""}>4/4</option><option ${b.meter==="3/4"?"selected":""}>3/4</option><option ${b.meter==="6/8"?"selected":""}>6/8</option></select></label></div><div class="rhythm-beats">${(b.beats||Array(8).fill("")).map((v,i)=>`<button type="button" data-rhythm-beat="${b.id}" data-index="${i}"><small>${i+1}</small><strong>${esc(v)||"○"}</strong></button>`).join("")}</div><small class="rhythm-help">每格點一下：空白 → ↓ → ↑ → ·</small>${memoHtml(b)}`)}

    function renderBlocks(){const host=$("#classroomBlocks");if(!host)return;const blocks=currentBlocks();host.innerHTML=blocks.length?blocks.map(b=>b.type==="text"?blockShell(b,"快速文字筆記",`<textarea data-text-block="${b.id}" rows="5" placeholder="老師現在講什麼就直接打…">${esc(b.text||"")}</textarea>`):b.type==="staff"?staffHtml(b):b.type==="tab"?tabHtml(b):b.type==="chords"?chordsHtml(b):b.type==="rhythm"?rhythmHtml(b):"").join(""):'<div class="classroom-empty"><strong>開始今天的課堂筆記</strong><span>上方選功能新增第一段。</span></div>';bindBlockEvents(host)}

    function selectStaffTool(kind,duration="",mark=""){if(kind==="note"||kind==="rest")staffTool={...staffTool,kind,duration:duration||staffTool.duration,mark:""};else staffTool={...staffTool,kind,mark:mark||""};renderBlocks()}
    function undoStaff(blockId){const b=currentBlocks().find(x=>x.id===blockId);if(!b)return;const items=normalizeStaffItems(b).slice();if(!items.length)return;const removed=items.pop();redoMap.set(blockId,[...(redoMap.get(blockId)||[]),removed]);updateBlock(blockId,{items},false);renderBlocks()}
    function redoStaff(blockId){const stack=redoMap.get(blockId)||[];if(!stack.length)return;const item=stack.pop(),b=currentBlocks().find(x=>x.id===blockId);redoMap.set(blockId,stack);updateBlock(blockId,{items:[...normalizeStaffItems(b),item]},false);renderBlocks()}
    function nearestPitch(rawY){let best=0;for(let i=1;i<staffYs.length;i++)if(Math.abs(staffYs[i]-rawY)<Math.abs(staffYs[best]-rawY))best=i;return {y:staffYs[best],pitch:pitchSlots[best]}}
    function addStaffItem(blockId,canvas,e){const b=currentBlocks().find(x=>x.id===blockId);if(!b)return;const items=normalizeStaffItems(b).slice(),r=canvas.getBoundingClientRect();const rawX=(e.clientX-r.left)/r.width*100,rawY=(e.clientY-r.top)/r.height*100,x=Math.max(16,Math.min(98,Math.round(rawX/3)*3));if(staffTool.kind==="erase"){let best=-1,score=999;items.forEach((it,i)=>{const s=Math.abs((it.x||0)-x)+Math.abs((it.y??50)-rawY)*.5;if(s<score){score=s;best=i}});if(best>=0&&score<12){items.splice(best,1);updateBlock(blockId,{items});renderBlocks()}return}if(staffTool.kind==="bar")items.push({id:uid(),kind:"bar",x,mark:staffTool.mark||"single"});else if(staffTool.kind==="mark"){const p=nearestPitch(rawY);items.push({id:uid(),kind:"mark",x,y:p.y-10,mark:staffTool.mark||"accent"})}else if(staffTool.kind==="rest")items.push({id:uid(),kind:"rest",duration:staffTool.duration,x,y:48,accidental:"",dot:staffTool.dot});else{const p=nearestPitch(rawY);items.push({id:uid(),kind:"note",duration:staffTool.duration,x,y:p.y,pitch:p.pitch,accidental:staffTool.accidental,dot:staffTool.dot})}redoMap.delete(blockId);updateBlock(blockId,{items});renderBlocks()}

    function bindBlockEvents(host){
      $$("[data-delete-block]",host).forEach(x=>x.onclick=()=>removeBlock(x.dataset.deleteBlock));$$("[data-move-up]",host).forEach(x=>x.onclick=()=>moveBlock(x.dataset.moveUp,-1));$$("[data-move-down]",host).forEach(x=>x.onclick=()=>moveBlock(x.dataset.moveDown,1));$$("[data-clone-block]",host).forEach(x=>x.onclick=()=>cloneBlock(x.dataset.cloneBlock));$$("[data-block-memo]",host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.blockMemo,{memo:x.value}));$$("[data-text-block]",host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.textBlock,{text:x.value}));
      $$("[data-staff-kind]",host).forEach(x=>x.onclick=()=>selectStaffTool(x.dataset.staffKind,x.dataset.duration||"",x.dataset.mark||""));$$("[data-accidental]",host).forEach(x=>x.onclick=()=>{staffTool.accidental=staffTool.accidental===x.dataset.accidental?"":x.dataset.accidental;renderBlocks()});$$("[data-dot]",host).forEach(x=>x.onclick=()=>{staffTool.dot=!staffTool.dot;renderBlocks()});$$("[data-more-symbols]",host).forEach(x=>x.onclick=()=>x.closest(".staff-fastbar").querySelector("[data-staff-more]").classList.toggle("hidden"));
      $$("[data-staff]",host).forEach(x=>x.onpointerdown=e=>{if(e.target.closest(".staff-symbol"))return;addStaffItem(x.dataset.staff,x,e)});$$("[data-staff-item]",host).forEach(x=>x.onclick=e=>{e.stopPropagation();const box=x.closest("[data-block-id]"),b=currentBlocks().find(q=>q.id===box.dataset.blockId);if(!b)return;const items=normalizeStaffItems(b).slice();items.splice(+x.dataset.staffItem,1);updateBlock(b.id,{items});renderBlocks()});$$("[data-staff-undo]",host).forEach(x=>x.onclick=()=>undoStaff(x.closest("[data-block-id]").dataset.blockId));$$("[data-staff-redo]",host).forEach(x=>x.onclick=()=>redoStaff(x.closest("[data-block-id]").dataset.blockId));$$("[data-staff-clef]",host).forEach(x=>x.onchange=()=>{updateBlock(x.dataset.staffClef,{clef:x.value});renderBlocks()});$$("[data-staff-meter]",host).forEach(x=>x.onchange=()=>{updateBlock(x.dataset.staffMeter,{meter:x.value});renderBlocks()});$$("[data-clear-staff]",host).forEach(x=>x.onclick=()=>{if(confirm("清空這一段五線譜？")){updateBlock(x.dataset.clearStaff,{items:[],notes:[]});renderBlocks()}});
      $$("[data-tab-fret]",host).forEach(x=>x.oninput=()=>{selectedTabFret=x.value===""?"":String(Math.max(0,Math.min(24,+x.value||0)))});$$("[data-tab-erase]",host).forEach(x=>x.onclick=()=>{selectedTabFret="";$$('[data-tab-fret]',host).forEach(i=>i.value="")});$$("[data-tab-cell]",host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.tabCell);if(!b)return;const cells=(b.cells||[]).map(r=>r.slice());cells[+x.dataset.r][+x.dataset.c]=selectedTabFret;updateBlock(b.id,{cells});renderBlocks()});$$("[data-add-chord]",host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.addChord);if(!b)return;updateBlock(b.id,{items:[...(b.items||[]),x.dataset.chord]});renderBlocks()});$$("[data-remove-chord]",host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.removeChord),items=(b?.items||[]).slice();if(!b)return;items.splice(+x.dataset.index,1);updateBlock(b.id,{items});renderBlocks()});$$("[data-custom-chord]",host).forEach(x=>x.onclick=()=>{const input=host.querySelector(`[data-chord-input="${x.dataset.customChord}"]`),v=input?.value.trim();if(!v)return;const b=currentBlocks().find(q=>q.id===x.dataset.customChord);if(!b)return;updateBlock(b.id,{items:[...(b.items||[]),v]});renderBlocks()});$$("[data-rhythm-bpm]",host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmBpm,{bpm:Math.max(30,Math.min(240,+x.value||70))}));$$("[data-rhythm-meter]",host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmMeter,{meter:x.value}));$$("[data-rhythm-beat]",host).forEach(x=>x.onclick=()=>{const b=currentBlocks().find(q=>q.id===x.dataset.rhythmBeat);if(!b)return;const marks=["","↓","↑","·"],beats=(b.beats||Array(8).fill("")).slice(),i=+x.dataset.index;beats[i]=marks[(marks.indexOf(beats[i])+1)%marks.length];updateBlock(b.id,{beats});renderBlocks()});
    }

    function tabSummary(b){const labels=["e","B","G","D","A","E"],parts=[];(b.cells||[]).forEach((row,i)=>{const used=row.map((v,c)=>v!==""?`${c+1}:${v}`:"").filter(Boolean);if(used.length)parts.push(`${labels[i]}弦 ${used.join(" ")}`)});return parts.join(" / ")}
    function staffSummary(b){const items=normalizeStaffItems(b);if(!items.length)return"";const counts={};items.forEach(x=>{const k=x.kind==="note"?`${x.duration}音符`:x.kind==="rest"?`${x.duration}休止`:x.kind==="bar"?"小節線":x.mark||"記號";counts[k]=(counts[k]||0)+1});return `五線譜 ${b.clef==="bass"?"低音":"高音"}譜號 ${b.meter||"4/4"}：`+Object.entries(counts).map(([k,v])=>`${k}×${v}`).join("、")}
    function organizeToTeacherNotes(){const lines=[];currentBlocks().forEach((b,i)=>{let text="";if(b.type==="text")text=(b.text||"").trim();if(b.type==="staff")text=staffSummary(b);if(b.type==="tab"){const s=tabSummary(b);if(s)text=`TAB：${s}`}if(b.type==="chords"&&(b.items||[]).length)text=`和弦：${b.items.join(" → ")}`;if(b.type==="rhythm"){const marks=(b.beats||[]).filter(Boolean).join(" ");text=`節奏：${b.bpm||70} BPM、${b.meter||"4/4"}${marks?"、"+marks:""}`}if(b.memo?.trim())text+=(text?"；":"")+b.memo.trim();if(text)lines.push(`${i+1}. ${text}`)});if(!lines.length){alert("目前沒有內容可以整理。");return}const notes=$("#teacherNotes");if(!notes)return;const compiled="【課堂筆記整理】\n"+lines.join("\n");if(!notes.value.includes(compiled))notes.value=(notes.value.trim()?notes.value.trim()+"\n\n":"")+compiled;notes.dispatchEvent(new Event("input",{bubbles:true}));setFocus(false);notes.scrollIntoView({behavior:"smooth",block:"center"})}

    injectUI();
  }
})();