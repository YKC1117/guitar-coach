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

    const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const uid=()=>"nb-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch(e){return[]}};
    const persist=list=>localStorage.setItem(STORE,JSON.stringify(list));
    const sig=()=>({
      date:$("#teacherLessonDate")?.value||"",
      teacher:$("#teacherName")?.value.trim()||"",
      song:$("#teacherSong")?.value.trim()||"",
      topic:$("#teacherTopic")?.value.trim()||""
    });
    const same=(a,b)=>a&&b&&a.date===b.date&&a.teacher===b.teacher&&a.song===b.song&&a.topic===b.topic;

    function getCurrent(create=true){
      const form=$("#teacherLessonForm"); if(!form)return null;
      const list=load();
      let id=form.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
      let item=list.find(x=>x.id===id);
      if(!item)item=list.find(x=>same(x.signature,sig()));
      if(!item&&create){
        item={id:uid(),signature:sig(),blocks:[],createdAt:Date.now(),updatedAt:Date.now()};
        list.push(item);persist(list);
      }
      if(item){form.dataset.classroomNotebookId=item.id;localStorage.setItem(ACTIVE,item.id)}
      return item||null;
    }
    function saveCurrent(blocks){
      const form=$("#teacherLessonForm");if(!form)return;
      const list=load();
      const item=getCurrent(true); if(!item)return;
      const idx=list.findIndex(x=>x.id===item.id);
      const next={...item,signature:sig(),blocks:blocks??item.blocks,updatedAt:Date.now()};
      if(idx>=0)list[idx]=next;else list.push(next);
      persist(list);form.dataset.classroomNotebookId=next.id;localStorage.setItem(ACTIVE,next.id);
      const status=$("#classroomAutoSave");
      if(status){
        const d=new Date();
        status.textContent="已暫存 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
      }
    }
    function currentBlocks(){return getCurrent(true)?.blocks||[]}
    function setBlocks(blocks){saveCurrent(blocks);renderBlocks()}
    function addBlock(type){
      const blocks=currentBlocks().slice();
      const base={id:uid(),type,memo:""};
      if(type==="text")Object.assign(base,{text:""});
      if(type==="staff")Object.assign(base,{notes:[]});
      if(type==="tab")Object.assign(base,{cells:Array.from({length:6},()=>Array(12).fill(""))});
      if(type==="chords")Object.assign(base,{items:[]});
      if(type==="rhythm")Object.assign(base,{bpm:70,meter:"4/4",beats:Array(8).fill("")});
      blocks.push(base);setBlocks(blocks);
      requestAnimationFrame(()=>$("[data-block-id='"+base.id+"']")?.scrollIntoView({behavior:"smooth",block:"center"}));
    }
    function updateBlock(id,patch){
      saveCurrent(currentBlocks().map(b=>b.id===id?{...b,...patch}:b));
    }
    function removeBlock(id){
      if(!confirm("刪除這段課堂筆記？"))return;
      setBlocks(currentBlocks().filter(b=>b.id!==id));
    }
    function moveBlock(id,delta){
      const blocks=currentBlocks().slice(),i=blocks.findIndex(b=>b.id===id),j=i+delta;
      if(i<0||j<0||j>=blocks.length)return;
      [blocks[i],blocks[j]]=[blocks[j],blocks[i]];
      setBlocks(blocks);
      requestAnimationFrame(()=>$("[data-block-id='"+id+"']")?.scrollIntoView({behavior:"smooth",block:"nearest"}));
    }
    function cloneBlock(id){
      const blocks=currentBlocks().slice(),i=blocks.findIndex(b=>b.id===id);if(i<0)return;
      const copy=structuredClone(blocks[i]);copy.id=uid();
      blocks.splice(i+1,0,copy);setBlocks(blocks);
    }
    function setFocus(on){
      document.body.classList.toggle("classroom-focus",on);
      const b=$("#classroomFocusBtn");if(b)b.textContent=on?"結束專注":"上課專注模式";
      if(on)$("#classroomNotebook")?.scrollIntoView({block:"start"});
    }

    function injectUI(){
      const form=$("#teacherLessonForm"); if(!form||$("#classroomNotebook"))return;
      const anchor=$("#teacherTopic")?.closest(".field");
      if(!anchor)return;
      const box=document.createElement("section");
      box.id="classroomNotebook";box.className="classroom-notebook";
      box.innerHTML=`
        <div class="classroom-head">
          <div><span class="kicker">DIGITAL NOTEBOOK</span><h2>課堂筆記本</h2><p>上課直接打字、記五線譜、TAB、和弦與節奏，不用另外買筆記本。</p></div>
          <span id="classroomAutoSave">自動暫存</span>
        </div>
        <div class="classroom-session-actions">
          <button type="button" class="focus-btn" id="classroomFocusBtn">上課專注模式</button>
          <button type="button" class="organize-btn" id="classroomOrganizeBtn">整理到老師提醒</button>
        </div>
        <div class="classroom-toolbar" id="classroomToolbar">
          <button type="button" data-add-block="text"><b>＋</b>文字</button>
          <button type="button" data-add-block="staff"><b>𝄞</b>五線譜</button>
          <button type="button" data-add-block="tab"><b>TAB</b>六線譜</button>
          <button type="button" data-add-block="chords"><b>C</b>和弦</button>
          <button type="button" data-add-block="rhythm"><b>♩</b>節奏</button>
        </div>
        <div class="classroom-tip">上課先快速記；每一段都能上下移動、複製或加備註。下課再按「整理到老師提醒」。</div>
        <div id="classroomBlocks" class="classroom-blocks"></div>`;
      anchor.insertAdjacentElement("afterend",box);
      $$("[data-add-block]",box).forEach(b=>b.addEventListener("click",()=>addBlock(b.dataset.addBlock)));
      $("#classroomFocusBtn").onclick=()=>setFocus(!document.body.classList.contains("classroom-focus"));
      $("#classroomOrganizeBtn").onclick=organizeToTeacherNotes;

      const quick=document.createElement("button");
      quick.type="button";quick.className="secondary classroom-open";quick.id="openClassroomNotebook";quick.textContent="上課筆記本";
      quick.addEventListener("click",()=>{
        $("#newTeacherLesson")?.click();
        setTimeout(()=>$("#classroomNotebook")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
      });
      $(".teacher-summary-actions")?.prepend(quick);
      bindOpenHooks();renderBlocks();
    }

    function bindOpenHooks(){
      ["newTeacherLesson","emptyNewTeacherLesson","repeatLastTeacherLesson"].forEach(id=>{
        $("#"+id)?.addEventListener("click",()=>setTimeout(()=>prepareNotebook(id==="repeatLastTeacherLesson"?"seed":"new"),0));
      });
      document.addEventListener("click",e=>{
        if(e.target.closest("[data-teacher-edit]"))setTimeout(()=>prepareNotebook("edit"),0);
      });
      $("#saveTeacherLesson")?.addEventListener("click",()=>{saveCurrent();setFocus(false)},true);
      $("#closeTeacherForm")?.addEventListener("click",()=>setFocus(false));
      $("#cancelTeacherLesson")?.addEventListener("click",()=>setFocus(false));
      $("#teacherLessonForm")?.addEventListener("input",()=>{const item=getCurrent(false);if(item)saveCurrent(item.blocks)});
    }
    function prepareNotebook(mode){
      const form=$("#teacherLessonForm");if(!form||form.classList.contains("hidden"))return;
      if(mode==="new"||mode==="seed"){
        form.dataset.classroomNotebookId="";localStorage.removeItem(ACTIVE);
      }
      const list=load(),match=list.find(x=>same(x.signature,sig()));
      if(match){form.dataset.classroomNotebookId=match.id;localStorage.setItem(ACTIVE,match.id)}
      else getCurrent(true);
      renderBlocks();
      if(mode==="new"&&currentBlocks().length===0)addBlock("text");
    }

    function blockShell(b,title,body){
      return `<article class="classroom-block" data-block-id="${b.id}">
        <header>
          <strong>${title}</strong>
          <div class="block-actions">
            <button type="button" data-move-up="${b.id}" aria-label="上移" title="上移">↑</button>
            <button type="button" data-move-down="${b.id}" aria-label="下移" title="下移">↓</button>
            <button type="button" data-clone-block="${b.id}" aria-label="複製" title="複製">⧉</button>
            <button type="button" class="block-delete" data-delete-block="${b.id}" aria-label="刪除" title="刪除">×</button>
          </div>
        </header>${body}</article>`;
    }
    const memoHtml=b=>`<label class="block-memo"><span>這段備註</span><input data-block-memo="${b.id}" value="${esc(b.memo||"")}" placeholder="例如：老師說這段回家要慢慢練"></label>`;
    function staffHtml(b){
      const notes=(b.notes||[]).map((n,i)=>`<i class="staff-note" data-note-index="${i}" style="left:${n.x}%;top:${n.y}%"></i>`).join("");
      return blockShell(b,"五線譜",`<div class="staff-help">點五線譜加入音符；位置會自動吸附在線或線間。點音符可刪除。</div><div class="staff-canvas" data-staff="${b.id}"><span class="clef">𝄞</span>${notes}</div><div class="mini-actions"><button type="button" data-clear-staff="${b.id}">清空音符</button></div>${memoHtml(b)}`);
    }
    function tabHtml(b){
      const labels=["e","B","G","D","A","E"],cells=b.cells||Array.from({length:6},()=>Array(12).fill(""));
      const rows=cells.map((row,r)=>`<div class="tab-row" style="--tab-cols:${row.length}"><b>${labels[r]}</b>${row.map((v,c)=>`<button type="button" data-tab-cell="${b.id}" data-r="${r}" data-c="${c}">${esc(v)}</button>`).join("")}</div>`).join("");
      return blockShell(b,"TAB 六線譜",`<div class="tab-tools"><label>格數 <input type="number" min="0" max="24" inputmode="numeric" value="${selectedTabFret}" data-tab-fret></label><button type="button" data-tab-erase>橡皮擦</button><span>先選格數，再點弦的位置</span></div><div class="tab-grid">${rows}</div>${memoHtml(b)}`);
    }
    function chordsHtml(b){
      const palette=["C","Cm","D","Dm","E","Em","F","Fm","G","Gm","A","Am","B","Bm","C7","D7","E7","G7","A7"];
      return blockShell(b,"和弦進行",`<div class="chord-sequence">${(b.items||[]).map((x,i)=>`<button type="button" data-remove-chord="${b.id}" data-index="${i}">${esc(x)}</button>`).join("")||"<span>點下面和弦加入順序</span>"}</div><div class="chord-palette">${palette.map(x=>`<button type="button" data-add-chord="${b.id}" data-chord="${x}">${x}</button>`).join("")}</div><div class="custom-chord"><input placeholder="自訂，例如 Fmaj7" data-chord-input="${b.id}"><button type="button" data-custom-chord="${b.id}">加入</button></div>${memoHtml(b)}`);
    }
    function rhythmHtml(b){
      return blockShell(b,"節奏 / 拍號",`<div class="rhythm-settings"><label>BPM <input type="number" min="30" max="240" value="${b.bpm||70}" data-rhythm-bpm="${b.id}"></label><label>拍號 <select data-rhythm-meter="${b.id}"><option ${b.meter==="4/4"?"selected":""}>4/4</option><option ${b.meter==="3/4"?"selected":""}>3/4</option><option ${b.meter==="6/8"?"selected":""}>6/8</option></select></label></div><div class="rhythm-beats">${(b.beats||Array(8).fill("")).map((v,i)=>`<button type="button" data-rhythm-beat="${b.id}" data-index="${i}"><small>${i+1}</small><strong>${esc(v)||"○"}</strong></button>`).join("")}</div><small class="rhythm-help">每格點一下循環：空白 → ↓ 下刷 → ↑ 上刷 → · 停/不刷</small>${memoHtml(b)}`);
    }
    function renderBlocks(){
      const host=$("#classroomBlocks");if(!host)return;
      const blocks=currentBlocks();
      host.innerHTML=blocks.length?blocks.map(b=>{
        if(b.type==="text")return blockShell(b,"快速文字筆記",`<textarea data-text-block="${b.id}" rows="5" placeholder="老師現在講什麼就直接打在這裡…">${esc(b.text||"")}</textarea>`);
        if(b.type==="staff")return staffHtml(b);
        if(b.type==="tab")return tabHtml(b);
        if(b.type==="chords")return chordsHtml(b);
        if(b.type==="rhythm")return rhythmHtml(b);
        return "";
      }).join(""):'<div class="classroom-empty"><strong>開始今天的課堂筆記</strong><span>上方選「文字、五線譜、TAB、和弦、節奏」新增第一段。</span></div>';
      bindBlockEvents(host);
    }
    function bindBlockEvents(host){
      $$("[data-delete-block]",host).forEach(x=>x.onclick=()=>removeBlock(x.dataset.deleteBlock));
      $$("[data-move-up]",host).forEach(x=>x.onclick=()=>moveBlock(x.dataset.moveUp,-1));
      $$("[data-move-down]",host).forEach(x=>x.onclick=()=>moveBlock(x.dataset.moveDown,1));
      $$("[data-clone-block]",host).forEach(x=>x.onclick=()=>cloneBlock(x.dataset.cloneBlock));
      $$("[data-block-memo]",host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.blockMemo,{memo:x.value}));
      $$("[data-text-block]",host).forEach(x=>x.oninput=()=>updateBlock(x.dataset.textBlock,{text:x.value}));
      $$("[data-staff]",host).forEach(x=>x.addEventListener("pointerdown",e=>{
        if(e.target.classList.contains("staff-note"))return;
        const r=x.getBoundingClientRect(),bx=x.dataset.staff,b=currentBlocks().find(q=>q.id===bx);if(!b)return;
        const rawX=(e.clientX-r.left)/r.width*100,rawY=(e.clientY-r.top)/r.height*100;
        const nx=Math.max(12,Math.min(97,Math.round(rawX/4)*4));
        const staffYs=[23,29,34,39,44,49,55,60,65,71,76];
        const ny=staffYs.reduce((a,v)=>Math.abs(v-rawY)<Math.abs(a-rawY)?v:a,staffYs[0]);
        updateBlock(bx,{notes:[...(b.notes||[]),{x:nx,y:ny}]});renderBlocks();
      }));
      $$(".staff-note",host).forEach(n=>n.onclick=e=>{
        e.stopPropagation();
        const box=n.closest("[data-block-id]"),b=currentBlocks().find(x=>x.id===box.dataset.blockId);if(!b)return;
        const arr=(b.notes||[]).slice();arr.splice(+n.dataset.noteIndex,1);updateBlock(b.id,{notes:arr});renderBlocks();
      });
      $$("[data-clear-staff]",host).forEach(x=>x.onclick=()=>{if(confirm("清空這一段五線譜的音符？")){updateBlock(x.dataset.clearStaff,{notes:[]});renderBlocks()}});
      $$("[data-tab-fret]",host).forEach(x=>x.oninput=()=>{selectedTabFret=x.value===""?"":String(Math.max(0,Math.min(24,+x.value||0)))});
      $$("[data-tab-erase]",host).forEach(x=>x.onclick=()=>{selectedTabFret="";$$('[data-tab-fret]',host).forEach(i=>i.value="")});
      $$("[data-tab-cell]",host).forEach(x=>x.onclick=()=>{
        const b=currentBlocks().find(q=>q.id===x.dataset.tabCell);if(!b)return;
        const cells=(b.cells||[]).map(r=>r.slice());cells[+x.dataset.r][+x.dataset.c]=selectedTabFret;updateBlock(b.id,{cells});renderBlocks();
      });
      $$("[data-add-chord]",host).forEach(x=>x.onclick=()=>{
        const b=currentBlocks().find(q=>q.id===x.dataset.addChord);if(!b)return;
        updateBlock(b.id,{items:[...(b.items||[]),x.dataset.chord]});renderBlocks();
      });
      $$("[data-remove-chord]",host).forEach(x=>x.onclick=()=>{
        const b=currentBlocks().find(q=>q.id===x.dataset.removeChord),items=(b?.items||[]).slice();if(!b)return;
        items.splice(+x.dataset.index,1);updateBlock(b.id,{items});renderBlocks();
      });
      $$("[data-custom-chord]",host).forEach(x=>x.onclick=()=>{
        const input=host.querySelector(`[data-chord-input="${x.dataset.customChord}"]`),v=input?.value.trim();if(!v)return;
        const b=currentBlocks().find(q=>q.id===x.dataset.customChord);if(!b)return;
        updateBlock(b.id,{items:[...(b.items||[]),v]});renderBlocks();
      });
      $$("[data-rhythm-bpm]",host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmBpm,{bpm:Math.max(30,Math.min(240,+x.value||70))}));
      $$("[data-rhythm-meter]",host).forEach(x=>x.onchange=()=>updateBlock(x.dataset.rhythmMeter,{meter:x.value}));
      $$("[data-rhythm-beat]",host).forEach(x=>x.onclick=()=>{
        const b=currentBlocks().find(q=>q.id===x.dataset.rhythmBeat);if(!b)return;
        const marks=["","↓","↑","·"],beats=(b.beats||Array(8).fill("")).slice(),i=+x.dataset.index;
        beats[i]=marks[(marks.indexOf(beats[i])+1)%marks.length];updateBlock(b.id,{beats});renderBlocks();
      });
    }

    function tabSummary(b){
      const labels=["e","B","G","D","A","E"],parts=[];
      (b.cells||[]).forEach((row,i)=>{
        const used=row.map((v,c)=>v!==""?`${c+1}:${v}`:"").filter(Boolean);
        if(used.length)parts.push(`${labels[i]}弦 ${used.join(" ")}`);
      });
      return parts.join(" / ");
    }
    function organizeToTeacherNotes(){
      const lines=[];
      currentBlocks().forEach((b,i)=>{
        let text="";
        if(b.type==="text")text=(b.text||"").trim();
        if(b.type==="staff"&&(b.notes||[]).length)text=`五線譜 ${b.notes.length} 個音符`;
        if(b.type==="tab"){const s=tabSummary(b);if(s)text=`TAB：${s}`}
        if(b.type==="chords"&&(b.items||[]).length)text=`和弦：${b.items.join(" → ")}`;
        if(b.type==="rhythm"){
          const marks=(b.beats||[]).filter(Boolean).join(" ");
          text=`節奏：${b.bpm||70} BPM、${b.meter||"4/4"}${marks?"、"+marks:""}`;
        }
        if(b.memo?.trim())text+=(text?"；":"")+b.memo.trim();
        if(text)lines.push(`${i+1}. ${text}`);
      });
      if(!lines.length){alert("目前課堂筆記本還沒有內容可以整理。");return}
      const notes=$("#teacherNotes");if(!notes)return;
      const compiled="【課堂筆記整理】\n"+lines.join("\n");
      if(!notes.value.includes(compiled))notes.value=(notes.value.trim()?notes.value.trim()+"\n\n":"")+compiled;
      notes.dispatchEvent(new Event("input",{bubbles:true}));
      setFocus(false);
      notes.scrollIntoView({behavior:"smooth",block:"center"});
      setTimeout(()=>notes.focus(),350);
    }

    injectUI();
  }
})();