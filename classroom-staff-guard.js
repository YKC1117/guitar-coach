(() => {
  "use strict";
  const STORE="guitarCoachClassroomNotebookV1",ACTIVE="guitarCoachClassroomActiveV1";
  let allowed=false;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  function activeCtx(){const id=$("#teacherLessonForm")?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"";let list=[];try{list=JSON.parse(localStorage.getItem(STORE)||"[]")}catch(e){};const item=Array.isArray(list)?list.find(x=>x.id===id):null;return{list,item}}
  function eraseItem(el){const card=el.closest('[data-block-id]'),blockId=card?.dataset.blockId,index=+el.dataset.staffItem;if(!blockId||Number.isNaN(index))return;const {list,item}=activeCtx();if(!item)return;const bi=(item.blocks||[]).findIndex(b=>b.id===blockId);if(bi<0)return;const b=item.blocks[bi],items=Array.isArray(b.items)?b.items.slice():[];if(index<0||index>=items.length)return;items.splice(index,1);b.items=items;b.notes=[];item.updatedAt=Date.now();const ni=list.findIndex(x=>x.id===item.id);if(ni>=0)list[ni]=item;localStorage.setItem(STORE,JSON.stringify(list));el.remove();const canvas=card.querySelector('.staff-canvas');if(canvas)$$('[data-staff-item]',canvas).forEach((x,i)=>x.dataset.staffItem=String(i))}
  document.addEventListener('click',e=>{
    const tool=e.target.closest('[data-staff-tool]');
    if(tool){allowed=true;$$('[data-staff-tool]').forEach(x=>x.classList.remove('gc-user-selected'));tool.classList.add('gc-user-selected');return}
    if(e.target.closest('[data-palette-tab],[data-nb-tab="staff"]')){allowed=false;$$('[data-staff-tool]').forEach(x=>x.classList.remove('gc-user-selected'));return}
    const item=e.target.closest('[data-staff-item]');
    if(item&&allowed&&/擦除/.test($('.selected-tool strong')?.textContent||'')){e.preventDefault();e.stopImmediatePropagation();eraseItem(item)}
  },true);
  document.addEventListener('pointerdown',e=>{const canvas=e.target.closest('.staff-canvas[data-staff]');if(!canvas)return;if(!allowed&&!e.target.closest('[data-staff-item]')){e.preventDefault();e.stopImmediatePropagation()}},true);
})();