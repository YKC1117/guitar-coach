(() => {
  "use strict";

  const STORE="guitarCoachClassroomNotebookV1";
  const ACTIVE="guitarCoachClassroomActiveV1";
  let toolChosen=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const load=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(v)?v:[]}catch(e){return[]}};
  const save=v=>localStorage.setItem(STORE,JSON.stringify(v));

  function migrateDefaultStaffMeters(){
    const list=load();let changed=false;
    list.forEach(note=>{
      (note.blocks||[]).forEach(b=>{
        if(b.type!=="staff")return;
        if(b.meter==="4/4"&&b.meterExplicit!==true){
          b.meter="";
          b.meterExplicit=false;
          changed=true;
        }
      });
    });
    if(changed)save(list);
  }

  function getBlock(id){
    const active=$("#teacherLessonForm")?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
    const notebook=load().find(x=>x.id===active);
    return notebook?.blocks?.find(b=>b.id===id)||null;
  }

  function setExplicitMeter(id,value){
    const active=$("#teacherLessonForm")?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";
    const list=load(),ni=list.findIndex(x=>x.id===active);if(ni<0)return;
    const bi=(list[ni].blocks||[]).findIndex(b=>b.id===id);if(bi<0)return;
    list[ni].blocks[bi].meter=value;
    list[ni].blocks[bi].meterExplicit=value!=="";
    list[ni].updatedAt=Date.now();
    save(list);
  }

  function normalizeRenderedBlock(id,b){
    if(b.meter==="4/4"&&b.meterExplicit!==true){
      setExplicitMeter(id,"");
      return {...b,meter:"",meterExplicit:false};
    }
    return b;
  }

  function cleanStaffUI(){
    $$('[data-block-id]').forEach(card=>{
      const canvas=card.querySelector('.staff-canvas[data-staff]');if(!canvas)return;
      const id=card.dataset.blockId;let b=getBlock(id);if(!b)return;
      b=normalizeRenderedBlock(id,b);
      const meterExplicit=b.meterExplicit===true&&!!b.meter;
      const select=card.querySelector(`[data-staff-meter="${id}"]`);
      if(select){
        if(!select.querySelector('option[value=""]')){
          const opt=document.createElement('option');opt.value="";opt.textContent="未設定";select.insertBefore(opt,select.firstChild);
        }
        if(!meterExplicit)select.value="";
      }
      const time=canvas.querySelector('.time-signature');
      if(time&&!meterExplicit){time.textContent="";time.style.display="none"}
      else if(time){time.style.display=""}
    });

    const selected=$('.selected-tool strong');
    if(selected&&!toolChosen)selected.textContent="請先選擇符號";
  }

  document.addEventListener('click',e=>{
    const tool=e.target.closest('[data-staff-tool]');
    if(tool){toolChosen=true;queueMicrotask(cleanStaffUI);return}
    const tab=e.target.closest('[data-nb-tab="staff"]');
    if(tab){toolChosen=false;setTimeout(cleanStaffUI,0)}
  },true);

  document.addEventListener('change',e=>{
    const select=e.target.closest('[data-staff-meter]');if(!select)return;
    setExplicitMeter(select.dataset.staffMeter,select.value);
    setTimeout(cleanStaffUI,0);
  },true);

  document.addEventListener('pointerdown',e=>{
    const canvas=e.target.closest('.staff-canvas[data-staff]');
    if(!canvas)return;
    if(e.target.closest('[data-staff-item]'))return;
    if(!toolChosen){
      e.preventDefault();
      e.stopImmediatePropagation();
      const selected=$('.selected-tool strong');if(selected)selected.textContent="請先選擇符號";
    }
  },true);

  const mo=new MutationObserver(()=>cleanStaffUI());
  migrateDefaultStaffMeters();
  mo.observe(document.documentElement,{subtree:true,childList:true});
  cleanStaffUI();
})();
