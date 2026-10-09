(() => {
  "use strict";
  const STORE="guitarCoachClassroomNotebookV1",ACTIVE="guitarCoachClassroomActiveV1",MOVE_MS=3000;
  const ys=Array.from({length:18},(_,i)=>10+i*4.75),pitches=["C6","B5","A5","G5","F5","E5","D5","C5","B4","A4","G4","F4","E4","D4","C4","B3","A3","G3"];
  const noteGlyph={whole:"𝅝",half:"𝅗𝅥",quarter:"♩",eighth:"♪",sixteenth:"♬",thirtysecond:"♬"},restGlyph={whole:"𝄻",half:"𝄼",quarter:"𝄽",eighth:"𝄾",sixteenth:"𝄿",thirtysecond:"𝄿"};
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
  let chosen=false,tool={kind:null,value:"",label:"",accidental:"",dot:0},spanStart=null;
  const history=new Map(),future=new Map();
  function ctx(){const id=$("#teacherLessonForm")?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";let list=[];try{list=JSON.parse(localStorage.getItem(STORE)||"[]")}catch(e){};return{list,item:Array.isArray(list)?list.find(x=>x.id===id):null}}
  function commit(item,list){item.updatedAt=Date.now();const i=list.findIndex(x=>x.id===item.id);if(i>=0)list[i]=item;localStorage.setItem(STORE,JSON.stringify(list));const s=$("#classroomAutoSave");if(s){const d=new Date();s.textContent="已暫存 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}}
  function blockData(id){const {list,item}=ctx();if(!item)return null;const bi=(item.blocks||[]).findIndex(b=>b.id===id);if(bi<0)return null;return{list,item,bi,b:item.blocks[bi]}}
  function snapshot(id,b){const h=history.get(id)||[];h.push(clone(Array.isArray(b.items)?b.items:[]));if(h.length>50)h.shift();history.set(id,h);future.delete(id)}
  function accidental(){return tool.accidental==="sharp"?"♯":tool.accidental==="flat"?"♭":tool.accidental==="natural"?"♮":tool.accidental==="doubleSharp"?"×":tool.accidental==="doubleFlat"?"♭♭":""}
  function markGlyph(v){const map={staccato:"•",accent:">",marcato:"^",tenuto:"—",fermata:"𝄐",breath:",",caesura:"//",segno:"𝄋",coda:"𝄌",tuplet3:"3",tuplet5:"5",tuplet6:"6",tuplet7:"7",cresc:"<",dim:">"};return map[v]||v||"•"}
  function itemEl(it,index){
    let el;
    if(it.kind==="span"){el=document.createElement('i');el.className='staff-span '+(it.mark||'');const left=Math.min(it.x,it.x2),right=Math.max(it.x,it.x2),top=(it.y+it.y2)/2;el.style.left=left+'%';el.style.width=Math.max(3,right-left)+'%';el.style.top=top+'%';el.innerHTML='<span>'+(it.mark==='cresc'?'&lt;':it.mark==='dim'?'&gt;':'')+'</span>'}
    else if(it.kind==="bar"){el=document.createElement('i');el.className='staff-symbol barline '+(it.mark||'single');el.style.left=it.x+'%'}
    else if(it.kind==="mark"){el=document.createElement('i');el.className='staff-symbol staff-mark';el.style.left=it.x+'%';el.style.top=it.y+'%';el.textContent=markGlyph(it.mark)}
    else {el=document.createElement('i');el.className='staff-symbol '+it.kind+' dur-'+it.duration;el.style.left=it.x+'%';el.style.top=it.y+'%';const acc=document.createElement('span');acc.className='acc';acc.textContent=it.accidental==="sharp"?"♯":it.accidental==="flat"?"♭":it.accidental==="natural"?"♮":it.accidental==="doubleSharp"?"×":it.accidental==="doubleFlat"?"♭♭":"";const g=document.createElement('span');g.className='glyph';g.textContent=it.kind==='rest'?(restGlyph[it.duration]||'𝄽'):(noteGlyph[it.duration]||'♩');el.append(acc,g);if(it.dot){const d=document.createElement('span');d.className='dot';d.textContent='•'.repeat(it.dot);el.appendChild(d)}}
    el.dataset.staffItem=String(index);if(it.id)el.dataset.itemId=it.id;return el
  }
  function reindex(canvas){$$('[data-staff-item]',canvas).forEach((el,i)=>el.dataset.staffItem=String(i))}
  function redraw(id,items){const canvas=$(".staff-canvas[data-staff='"+CSS.escape(id)+"']");if(!canvas)return;$$('[data-staff-item]',canvas).forEach(x=>x.remove());items.forEach((it,i)=>canvas.appendChild(itemEl(it,i)));document.dispatchEvent(new CustomEvent('gc:staff-note-added'))}
  function saveItems(id,items){const d=blockData(id);if(!d)return;const b=clone(d.b);b.items=items;b.notes=[];d.item.blocks[d.bi]=b;commit(d.item,d.list)}
  function selectedText(){const s=$('.selected-tool strong');if(s)s.textContent=chosen?(tool.label||'已選擇符號'):'請先選擇符號'}
  function setToolButton(btn){chosen=true;spanStart=null;tool.kind=btn.dataset.staffTool;tool.value=btn.dataset.toolValue||'';tool.label=btn.dataset.toolLabel||btn.textContent.trim();$$('[data-staff-tool]').forEach(x=>x.classList.toggle('active',x===btn));selectedText()}
  function setModifier(btn,type){const v=type==='accidental'?(btn.dataset.accidental||''):+(btn.dataset.dotCount||0);if(type==='accidental')tool.accidental=v;else tool.dot=v;const sel=type==='accidental'?'[data-accidental]':'[data-dot-count]';$$(sel).forEach(x=>x.classList.toggle('active',x===btn));selectedText()}
  function addAt(canvas,e){
    if(!chosen)return false;
    const id=canvas.dataset.staff,d=blockData(id);if(!d)return false;
    const r=canvas.getBoundingClientRect(),rx=(e.clientX-r.left)/r.width*100,ry=(e.clientY-r.top)/r.height*100,x=Math.max(16,Math.min(98,Math.round(rx/2)*2)),y=ys.reduce((a,v)=>Math.abs(v-ry)<Math.abs(a-ry)?v:a,ys[0]);
    const items=clone(Array.isArray(d.b.items)?d.b.items:[]);
    if(tool.kind==='erase'){let best=-1,dist=999;items.forEach((it,i)=>{const iy=it.kind==='bar'?50:(it.y??50),dd=Math.abs((it.x??0)-rx)+Math.abs(iy-ry)*.65;if(dd<dist){dist=dd;best=i}});if(best>=0&&dist<12){snapshot(id,d.b);items.splice(best,1);saveItems(id,items);redraw(id,items)}return true}
    if(tool.kind==='span'){
      if(!spanStart||spanStart.id!==id){spanStart={id,x,y};const s=$('.selected-tool strong');if(s)s.textContent=(tool.label||'連線')+'：再點終點';return true}
      snapshot(id,d.b);items.push({id:'nb-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),kind:'span',mark:tool.value,x:spanStart.x,y:spanStart.y,x2:x,y2:y});spanStart=null;saveItems(id,items);redraw(id,items);selectedText();return true
    }
    snapshot(id,d.b);const now=Date.now(),it={id:'nb-'+now+'-'+Math.random().toString(36).slice(2,8),kind:tool.kind};
    if(tool.kind==='bar')Object.assign(it,{mark:tool.value,x});
    else if(tool.kind==='mark')Object.assign(it,{mark:tool.value,x,y});
    else Object.assign(it,{duration:tool.value||'quarter',x,y,accidental:tool.accidental||'',dot:tool.dot||0,pitch:pitches[ys.indexOf(y)]||'',...(tool.kind==='note'?{movableUntil:now+MOVE_MS}:{})});
    items.push(it);saveItems(id,items);const el=itemEl(it,items.length-1);canvas.appendChild(el);if(it.kind==='note')document.dispatchEvent(new CustomEvent('gc:staff-note-added',{detail:{element:el}}));return true
  }
  function undo(id){const h=history.get(id)||[];if(!h.length)return;const d=blockData(id);if(!d)return;const cur=clone(Array.isArray(d.b.items)?d.b.items:[]),f=future.get(id)||[];f.push(cur);future.set(id,f);const prev=h.pop();history.set(id,h);saveItems(id,prev);redraw(id,prev)}
  function redo(id){const f=future.get(id)||[];if(!f.length)return;const d=blockData(id);if(!d)return;const cur=clone(Array.isArray(d.b.items)?d.b.items:[]),h=history.get(id)||[];h.push(cur);history.set(id,h);const next=f.pop();future.set(id,f);saveItems(id,next);redraw(id,next)}
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-staff-tool]');if(t){e.preventDefault();e.stopImmediatePropagation();setToolButton(t);return}
    const a=e.target.closest('[data-accidental]');if(a){e.preventDefault();e.stopImmediatePropagation();setModifier(a,'accidental');return}
    const d=e.target.closest('[data-dot-count]');if(d){e.preventDefault();e.stopImmediatePropagation();setModifier(d,'dot');return}
    const u=e.target.closest('[data-staff-undo]');if(u){e.preventDefault();e.stopImmediatePropagation();undo(u.dataset.staffUndo);return}
    const r=e.target.closest('[data-staff-redo]');if(r){e.preventDefault();e.stopImmediatePropagation();redo(r.dataset.staffRedo);return}
    const tab=e.target.closest('[data-nb-tab="staff"]');if(tab){chosen=false;spanStart=null;setTimeout(selectedText,0)}
  },true);
  document.addEventListener('pointerdown',e=>{
    const canvas=e.target.closest('.staff-canvas[data-staff]');if(!canvas||e.target.closest('[data-staff-item]'))return;
    if(!chosen)return;
    e.preventDefault();e.stopImmediatePropagation();addAt(canvas,e)
  },true);
})();