(() => {
  "use strict";

  const STORE="guitarCoachClassroomNotebookV1";
  const ACTIVE="guitarCoachClassroomActiveV1";
  const GRID_TAB="chordgrid";
  const NOTE_MOVE_MS=3000;
  const staffYs=Array.from({length:18},(_,i)=>10+i*4.75);
  const pitchSlots=["C6","B5","A5","G5","F5","E5","D5","C5","B4","A4","G4","F4","E4","D4","C4","B3","A3","G3"];
  let gridTool="●";
  let barreStart=null;
  let gridActive=false;
  let initialized=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
  const uid=()=>"cg-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
  const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
  const load=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(v)?v:[]}catch(e){return[]}};
  const persist=list=>localStorage.setItem(STORE,JSON.stringify(list));

  function currentNotebook(){
    const form=$("#teacherLessonForm");
    const id=form?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
    const list=load();
    return {list,item:list.find(x=>x.id===id)||null};
  }
  function saveItem(item,list=null){
    const all=list||load(),i=all.findIndex(x=>x.id===item.id);
    item.updatedAt=Date.now();
    if(i>=0)all[i]=item;else all.push(item);
    persist(all);
    const status=$("#classroomAutoSave");
    if(status){const d=new Date();status.textContent="已暫存 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
  }
  function gridBlocks(){return currentNotebook().item?.blocks?.filter(b=>b.type==="chordgrid")||[]}
  function makeGrid(name=""){
    return {id:uid(),type:"chordgrid",name,baseFret:1,top:Array(6).fill(""),cells:Array.from({length:5},()=>Array(6).fill("")),barres:[],memo:"",createdAt:Date.now()};
  }
  function updateGrid(id,fn){
    const {list,item}=currentNotebook();if(!item)return;
    const blocks=(item.blocks||[]).slice(),i=blocks.findIndex(b=>b.id===id);if(i<0)return;
    const b=clone(blocks[i]);fn(b);blocks[i]=b;item.blocks=blocks;saveItem(item,list);renderGridWorkspace();
  }
  function addGrid(seed=null){
    const {list,item}=currentNotebook();if(!item)return;
    const b=seed?clone(seed):makeGrid();b.id=uid();b.type="chordgrid";b.createdAt=Date.now();
    item.blocks=[...(item.blocks||[]),b];saveItem(item,list);renderGridWorkspace();
    requestAnimationFrame(()=>$("[data-grid-block='"+b.id+"']")?.scrollIntoView({behavior:"smooth",block:"center"}));
  }
  function deleteGrid(id){
    if(!confirm("刪除這個和弦格？"))return;
    const {list,item}=currentNotebook();if(!item)return;
    item.blocks=(item.blocks||[]).filter(b=>b.id!==id);saveItem(item,list);renderGridWorkspace();
  }
  function duplicateGrid(id){const b=gridBlocks().find(x=>x.id===id);if(b)addGrid(b)}

  const presetDefs={
    C:["X",3,2,0,1,0],G:[3,2,0,0,0,3],Am:["X",0,2,2,1,0],F:[1,3,3,2,1,1],D:["X","X",0,2,3,2],Dm:["X","X",0,2,3,1],E:[0,2,2,1,0,0],Em:[0,2,2,0,0,0],A:["X",0,2,2,2,0]
  };
  function presetGrid(name){
    const b=makeGrid(name),def=presetDefs[name];
    def.forEach((v,c)=>{
      if(v==="X")b.top[c]="X";
      else if(v===0)b.top[c]="O";
      else if(v>0&&v<=5)b.cells[v-1][c]="●";
    });
    if(name==="F")b.barres=[{row:0,start:0,end:5,finger:"1"}];
    return b;
  }

  function ensureGridTab(){
    const nav=$("#notebookTabs");if(!nav)return;
    if(nav.querySelector("[data-grid-tab]"))return;
    const btn=document.createElement("button");btn.type="button";btn.dataset.gridTab="1";btn.innerHTML="<b>▦</b><span>和弦格</span>";
    const summary=nav.querySelector('[data-nb-tab="summary"]');
    nav.insertBefore(btn,summary||null);
    btn.addEventListener("click",()=>{gridActive=true;barreStart=null;$$('[data-nb-tab]',nav).forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderGridWorkspace()});
  }

  function renderGridWorkspace(){
    if(!gridActive)return;
    ensureGridTab();
    const host=$("#classroomWorkspace");if(!host)return;
    const list=gridBlocks();
    host.innerHTML=`
      <div class="workspace-head"><div><h3>和弦格</h3><p>六弦 × 品格，直接點格子記指法；適合老師快速教和弦。</p></div><button type="button" class="workspace-add" data-grid-add>＋ 新增和弦格</button></div>
      <div class="chordgrid-presets"><span>常用</span>${Object.keys(presetDefs).map(x=>`<button type="button" data-grid-preset="${x}">${x}</button>`).join("")}</div>
      <div class="chordgrid-toolbox"><span>填入</span>${["●","1","2","3","4","T"].map(x=>`<button type="button" class="${gridTool===x?"active":""}" data-grid-tool="${x}">${x}</button>`).join("")}<button type="button" class="${gridTool==="barre"?"active":""}" data-grid-tool="barre">橫按</button><button type="button" class="${gridTool==="erase"?"active":""}" data-grid-tool="erase">擦除</button></div>
      ${list.length?`<div class="classroom-blocks chordgrid-blocks">${list.map(gridHtml).join("")}</div>`:`<div class="classroom-empty"><strong>還沒有和弦格</strong><span>可直接選上方 C、G、Am、F 等常用和弦，或新增空白和弦格。</span><button type="button" data-grid-add>＋ 新增和弦格</button></div>`}`;
    bindGridEvents(host);
  }

  function gridHtml(b){
    const cells=b.cells||Array.from({length:5},()=>Array(6).fill("")),top=b.top||Array(6).fill(""),barres=b.barres||[];
    return `<article class="classroom-block chordgrid-card" data-grid-block="${b.id}">
      <header><strong>${esc(b.name||"未命名和弦")}</strong><div class="block-actions"><button type="button" data-grid-duplicate="${b.id}" aria-label="複製">⧉</button><button type="button" class="block-delete" data-grid-delete="${b.id}" aria-label="刪除">×</button></div></header>
      <div class="chordgrid-meta"><label>和弦名稱<input data-grid-name="${b.id}" value="${esc(b.name||"")}" placeholder="例如 Cmaj7"></label><label>起始品<input type="number" inputmode="numeric" min="1" max="15" data-grid-base="${b.id}" value="${Math.max(1,Math.min(15,+b.baseFret||1))}"></label></div>
      <div class="chord-diagram-wrap">
        <div class="string-labels">${["E","A","D","G","B","e"].map(x=>`<span>${x}</span>`).join("")}</div>
        <div class="open-markers">${top.map((v,c)=>`<button type="button" data-grid-top="${b.id}" data-col="${c}">${esc(v||"·")}</button>`).join("")}</div>
        <div class="fret-number">${b.baseFret>1?esc(b.baseFret)+"fr":""}</div>
        <div class="chord-fret-grid" data-fret-grid="${b.id}">
          ${cells.map((row,r)=>row.map((v,c)=>`<button type="button" data-grid-cell="${b.id}" data-row="${r}" data-col="${c}">${esc(v)}</button>`).join("")).join("")}
          ${barres.map((x,i)=>barreHtml(x,i)).join("")}
        </div>
      </div>
      <div class="chordgrid-hint">弦上方點一下循環：空白 → O 空弦 → X 不彈。橫按：先點起始弦，再點同一品的結束弦。</div>
      <label class="block-memo"><span>備註</span><input data-grid-memo="${b.id}" value="${esc(b.memo||"")}" placeholder="例如：食指壓平、拇指放鬆"></label>
    </article>`;
  }
  function barreHtml(b,i){
    const start=Math.min(b.start,b.end),end=Math.max(b.start,b.end);
    const left=(start+.14)/6*100,width=(end-start+.72)/6*100,top=(b.row+.5)/5*100;
    return `<button type="button" class="barre-mark" data-grid-barre-index="${i}" style="left:${left}%;width:${width}%;top:${top}%"><span>${esc(b.finger||"1")}</span></button>`;
  }
  function bindGridEvents(host){
    $$('[data-grid-add]',host).forEach(x=>x.onclick=()=>addGrid());
    $$('[data-grid-preset]',host).forEach(x=>x.onclick=()=>addGrid(presetGrid(x.dataset.gridPreset)));
    $$('[data-grid-tool]',host).forEach(x=>x.onclick=()=>{gridTool=x.dataset.gridTool;barreStart=null;renderGridWorkspace()});
    $$('[data-grid-delete]',host).forEach(x=>x.onclick=()=>deleteGrid(x.dataset.gridDelete));
    $$('[data-grid-duplicate]',host).forEach(x=>x.onclick=()=>duplicateGrid(x.dataset.gridDuplicate));
    $$('[data-grid-name]',host).forEach(x=>x.oninput=()=>updateGridSilent(x.dataset.gridName,b=>b.name=x.value));
    $$('[data-grid-base]',host).forEach(x=>x.onchange=()=>updateGrid(x.dataset.gridBase,b=>b.baseFret=Math.max(1,Math.min(15,+x.value||1))));
    $$('[data-grid-memo]',host).forEach(x=>x.oninput=()=>updateGridSilent(x.dataset.gridMemo,b=>b.memo=x.value));
    $$('[data-grid-top]',host).forEach(x=>x.onclick=()=>updateGrid(x.dataset.gridTop,b=>{const c=+x.dataset.col,v=(b.top||Array(6).fill(""))[c]||"";b.top=b.top||Array(6).fill("");b.top[c]=v===""?"O":v==="O"?"X":""}));
    $$('[data-grid-cell]',host).forEach(x=>x.onclick=()=>handleGridCell(x));
    $$('[data-grid-barre-index]',host).forEach(x=>x.onclick=()=>{const card=x.closest('[data-grid-block]');if(!card)return;updateGrid(card.dataset.gridBlock,b=>{b.barres=(b.barres||[]).filter((_,i)=>i!==+x.dataset.gridBarreIndex)})});
  }
  function updateGridSilent(id,fn){
    const {list,item}=currentNotebook();if(!item)return;
    const i=(item.blocks||[]).findIndex(b=>b.id===id);if(i<0)return;const b=clone(item.blocks[i]);fn(b);item.blocks[i]=b;saveItem(item,list);
    const card=$("[data-grid-block='"+id+"'] header strong");if(card)card.textContent=b.name||"未命名和弦";
  }
  function handleGridCell(el){
    const id=el.dataset.gridCell,row=+el.dataset.row,col=+el.dataset.col;
    if(gridTool==="barre"){
      if(!barreStart||barreStart.id!==id||barreStart.row!==row){barreStart={id,row,col};el.classList.add("barre-start");return}
      const start=barreStart;barreStart=null;updateGrid(id,b=>{b.barres=[...(b.barres||[]),{row,start:start.col,end:col,finger:"1"}]});return;
    }
    updateGrid(id,b=>{
      b.cells=b.cells||Array.from({length:5},()=>Array(6).fill(""));
      if(gridTool==="erase")b.cells[row][col]="";
      else b.cells[row][col]=b.cells[row][col]===gridTool?"":gridTool;
    });
  }

  function stampNewNote(blockId,beforeIds){
    const {list,item}=currentNotebook();if(!item)return;
    const bi=(item.blocks||[]).findIndex(b=>b.id===blockId);if(bi<0)return;
    const b=clone(item.blocks[bi]),items=Array.isArray(b.items)?b.items:[];
    const now=Date.now();
    let changed=false;
    items.forEach(it=>{
      const ts=String(it.id||"").match(/nb-(\d+)-/);
      if(it.kind==="note"&&!beforeIds.has(it.id)&&ts&&Math.abs(now-(+ts[1]))<1200&&!it.movableUntil){it.movableUntil=now+NOTE_MOVE_MS;changed=true}
    });
    if(changed){b.items=items;item.blocks[bi]=b;saveItem(item,list);enhanceMovableNotes()}
  }
  function noteDataFromEl(el){
    const card=el.closest('[data-block-id]'),blockId=card?.dataset.blockId,index=+el.dataset.staffItem;
    if(!blockId||Number.isNaN(index))return null;
    const {list,item}=currentNotebook();if(!item)return null;
    const bi=(item.blocks||[]).findIndex(b=>b.id===blockId);if(bi<0)return null;
    const b=item.blocks[bi],items=Array.isArray(b.items)?b.items:[],note=items[index];
    return note?{list,item,bi,b,items,index,note,blockId}:null;
  }
  function eraserActive(){return /擦除/.test($(".selected-tool strong")?.textContent||"")}
  function beginNoteDrag(e,el,data){
    if(Date.now()>=Number(data.note.movableUntil||0)||eraserActive())return false;
    e.preventDefault();e.stopImmediatePropagation();
    const canvas=el.closest('.staff-canvas[data-staff]');if(!canvas)return false;
    const rect=canvas.getBoundingClientRect(),id=data.note.id;
    el.classList.add('note-dragging');
    const move=ev=>{
      ev.preventDefault();
      const rawX=(ev.clientX-rect.left)/rect.width*100,rawY=(ev.clientY-rect.top)/rect.height*100;
      const x=Math.max(16,Math.min(98,Math.round(rawX/2)*2));
      const y=staffYs.reduce((a,v)=>Math.abs(v-rawY)<Math.abs(a-rawY)?v:a,staffYs[0]);
      el.style.left=x+'%';el.style.top=y+'%';el.dataset.dragX=String(x);el.dataset.dragY=String(y);
    };
    const end=ev=>{
      document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',end,true);
      const x=+(el.dataset.dragX||data.note.x),y=+(el.dataset.dragY||data.note.y);
      const {list,item}=currentNotebook();if(!item)return;
      const bi=(item.blocks||[]).findIndex(b=>b.id===data.blockId);if(bi<0)return;
      const b=clone(item.blocks[bi]),items=Array.isArray(b.items)?b.items:[],i=items.findIndex(it=>it.id===id);if(i<0)return;
      items[i]={...items[i],x,y,pitch:pitchSlots[staffYs.indexOf(y)]||items[i].pitch||""};b.items=items;item.blocks[bi]=b;saveItem(item,list);enhanceMovableNotes();
    };
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
    return true;
  }
  function enhanceMovableNotes(){
    $$('.staff-symbol.note[data-staff-item]').forEach(el=>{
      const d=noteDataFromEl(el),until=Number(d?.note?.movableUntil||0),remain=until-Date.now();
      el.classList.toggle('note-movable',remain>0);
      let badge=el.querySelector('.note-move-badge');
      if(remain>0){if(!badge){badge=document.createElement('span');badge.className='note-move-badge';el.appendChild(badge)}badge.textContent=Math.max(1,Math.ceil(remain/1000))+'s'}else badge?.remove();
    });
  }

  function appendGridSummary(){
    if(!$("#classroomWorkspace")||gridActive)return;
    const summaryTab=$("#notebookTabs [data-nb-tab='summary'].active");if(!summaryTab)return;
    const count=gridBlocks().length;if(!count||$("#gridSummaryAddon"))return;
    const preview=$(".summary-preview");if(!preview)return;
    const row=document.createElement('div');row.id='gridSummaryAddon';row.innerHTML=`<b>▦</b><span>和弦格：${count} 個${gridBlocks().map(b=>b.name).filter(Boolean).length?" · "+esc(gridBlocks().map(b=>b.name).filter(Boolean).join("、")):""}</span>`;preview.appendChild(row);
  }

  function syncEnhancements(){
    const notebook=$("#classroomNotebook");if(!notebook)return;
    ensureGridTab();
    if(gridActive){const btn=$("#notebookTabs [data-grid-tab]");if(btn){$$('#notebookTabs button').forEach(x=>x.classList.remove('active'));btn.classList.add('active')}renderGridWorkspace()}
    enhanceMovableNotes();appendGridSummary();
  }

  function init(){
    if(initialized)return;initialized=true;
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-nb-tab]')){gridActive=false;barreStart=null}
    },true);
    document.addEventListener('pointerdown',e=>{
      const note=e.target.closest('.staff-symbol.note[data-staff-item]');
      if(note){const data=noteDataFromEl(note);if(data&&beginNoteDrag(e,note,data))return}
      const canvas=e.target.closest('.staff-canvas[data-staff]');
      if(canvas&&!e.target.closest('[data-staff-item]')){
        const id=canvas.dataset.staff,{item}=currentNotebook();
        const b=item?.blocks?.find(x=>x.id===id),before=new Set((b?.items||[]).map(x=>x.id));
        setTimeout(()=>stampNewNote(id,before),0);
      }
    },true);
    const mo=new MutationObserver(()=>syncEnhancements());
    mo.observe(document.body,{subtree:true,childList:true});
    setInterval(()=>enhanceMovableNotes(),250);
    syncEnhancements();
  }

  if($("#classroomNotebook"))init();
  else{
    const boot=new MutationObserver(()=>{if($("#classroomNotebook")){boot.disconnect();init()}});
    boot.observe(document.body,{subtree:true,childList:true});
  }
})();
