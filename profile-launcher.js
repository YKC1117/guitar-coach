(() => {
  "use strict";
  const SESSION_KEY="guitarCoachSessionUserChosenV3";
  const OWNER_NAME="管理員";
  let overlay=null;

  const profiles=()=>window.gcProfiles?.list?.()||[];
  const owner=()=>profiles().find(p=>String(p.name).trim()===OWNER_NAME)||null;
  const visibleProfiles=()=>profiles().filter(p=>String(p.name).trim()!==OWNER_NAME);
  const esc=v=>String(v).replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));
  const today=()=>{
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  };
  const sessionValue=(id=window.gcProfiles?.currentId)=>`${today()}|${id||""}`;

  function chosenThisSession(){try{return sessionStorage.getItem(SESSION_KEY)===sessionValue()}catch(e){return false}}
  function markChosen(id=window.gcProfiles?.currentId){try{sessionStorage.setItem(SESSION_KEY,sessionValue(id))}catch(e){}}
  function unmarkChosen(){try{sessionStorage.removeItem(SESSION_KEY)}catch(e){}}

  function hideOwnerFromExistingUi(){
    document.querySelectorAll("#gcProfileSelect option,.gc-profile-gate option").forEach(o=>{
      if(o.textContent.trim()===OWNER_NAME)o.remove();
    });
    const badge=document.querySelector(".gc-user-switch");
    const current=profiles().find(p=>p.id===window.gcProfiles?.currentId);
    if(badge){
      if(current?.name===OWNER_NAME){badge.hidden=true;}
      else{
        badge.hidden=false;
        badge.textContent=`使用者：${current?.name||"未選擇"}　切換`;
        badge.title="切換今天使用網站的人";
        badge.onclick=()=>openChooser(true);
      }
    }
    const adminButton=document.querySelector(".gc-data-admin");
    if(adminButton)adminButton.hidden=false;
    const admin=document.getElementById("gcAdminPanel");
    if(admin&&!document.documentElement.classList.contains("gc-owner-tools-visible"))admin.hidden=true;
  }

  async function choose(id){
    if(!window.gcProfiles)return;
    const current=window.gcProfiles.currentId;
    if(id===current&&window.gcProfiles.canRead?.()){
      markChosen(id);closeChooser();hideOwnerFromExistingUi();
      const p=profiles().find(x=>x.id===id);if(p?.name===OWNER_NAME)showOwnerTools();
      return;
    }
    markChosen(id);
    let reloaded=false;
    const timer=setTimeout(()=>{if(!reloaded)unmarkChosen()},1500);
    try{
      await window.gcProfiles.switchTo(id);
      reloaded=true;
    }catch(e){
      unmarkChosen();
      const status=overlay?.querySelector("[data-launch-status]");
      if(status)status.textContent=e?.message||"無法切換使用者";
    }finally{clearTimeout(timer)}
  }

  function closeChooser(){
    if(!overlay)return;
    overlay.classList.add("leaving");
    setTimeout(()=>{overlay?.remove();overlay=null;document.documentElement.classList.remove("gc-launch-lock")},160);
  }

  function addUser(){
    const input=overlay?.querySelector("[data-launch-new-name]");
    const status=overlay?.querySelector("[data-launch-status]");
    const name=input?.value.trim();
    if(!name){if(status)status.textContent="請先輸入使用者名稱";input?.focus();return}
    if(name===OWNER_NAME){
      if(status)status.textContent="「管理員」是系統保留名稱；一般使用者請使用其他名稱。";
      input?.select();
      return;
    }
    try{
      const p=window.gcProfiles.create(name);
      input.value="";
      renderCards();
      choose(p.id);
    }catch(e){if(status)status.textContent=e?.message||"新增失敗"}
  }

  function renderCards(){
    if(!overlay)return;
    const box=overlay.querySelector("[data-launch-users]");
    const rows=visibleProfiles();
    box.replaceChildren();
    if(!rows.length){
      const empty=document.createElement("div");empty.className="gc-launch-empty";empty.innerHTML="<strong>還沒有一般使用者</strong><span>先在下方建立一位使用者。</span>";box.appendChild(empty);return;
    }
    for(const p of rows){
      const button=document.createElement("button");button.type="button";button.className="gc-launch-user";button.dataset.userId=p.id;
      const active=p.id===window.gcProfiles.currentId;
      button.innerHTML=`<span class="gc-launch-avatar">${esc((p.name||"使").slice(0,1))}</span><span class="gc-launch-user-copy"><strong>${esc(p.name)}</strong><small>${active?"上次使用｜點一下繼續":"點一下進入"}</small></span><span class="gc-launch-arrow">›</span>`;
      if(active)button.classList.add("is-last");
      button.onclick=()=>choose(p.id);box.appendChild(button);
    }
  }

  function openChooser(force=false){
    if(overlay||(!force&&chosenThisSession())||!window.gcProfiles)return;
    const canClose=force&&chosenThisSession();
    document.documentElement.classList.add("gc-launch-lock");
    overlay=document.createElement("section");overlay.className="gc-launcher";overlay.setAttribute("aria-modal","true");overlay.setAttribute("role","dialog");
    overlay.innerHTML=`<div class="gc-launch-card">
      ${canClose?'<button type="button" class="gc-launch-close" aria-label="關閉">×</button>':''}
      <div class="gc-launch-brand" aria-hidden="true">G</div>
      <span class="kicker">WHO'S PLAYING?</span>
      <h1>今天誰要使用？</h1>
      <p class="gc-launch-sub">先選自己的使用者，筆記、練習紀錄和照片才不會混在一起。每天第一次使用會再確認一次。</p>
      <div class="gc-launch-users" data-launch-users></div>
      <details class="gc-launch-add"><summary>＋ 新增使用者</summary><div class="gc-launch-add-row"><input data-launch-new-name maxlength="40" placeholder="輸入名稱" autocomplete="off"><button type="button" data-launch-add>建立</button></div></details>
      <p class="gc-launch-status" data-launch-status role="status"></p>
    </div>`;
    document.body.appendChild(overlay);renderCards();
    overlay.querySelector("[data-launch-add]").onclick=addUser;
    overlay.querySelector("[data-launch-new-name]").addEventListener("keydown",e=>{if(e.key==="Enter")addUser()});
    overlay.querySelector(".gc-launch-close")?.addEventListener("click",closeChooser);
    hideOwnerFromExistingUi();
  }

  function openOwnerEntry(){
    if(document.getElementById("gcOwnerEntry"))return;
    const p=owner();
    const dialog=document.createElement("dialog");dialog.id="gcOwnerEntry";dialog.className="gc-owner-entry";
    dialog.innerHTML=p
      ?'<h2>管理員入口</h2><p>「管理員」是獨立的管理使用者，不會出現在一般使用者清單。</p><div class="gc-owner-entry-actions"><button type="button" data-owner-cancel>取消</button><button type="button" data-owner-enter>進入管理員</button></div>'
      :'<h2>建立管理員</h2><p>管理員只用來開啟管理工具；建立後不會出現在一般使用者清單。你的「可樂」可以照常當一般使用者使用。</p><div class="gc-owner-entry-actions"><button type="button" data-owner-cancel>取消</button><button type="button" data-owner-create>建立管理員</button></div>';
    document.body.appendChild(dialog);
    const close=()=>{if(dialog.open)dialog.close();dialog.remove()};
    dialog.querySelector("[data-owner-cancel]").onclick=close;
    dialog.addEventListener("cancel",e=>{e.preventDefault();close()});
    dialog.querySelector("[data-owner-enter]")?.addEventListener("click",async()=>{markChosen(p.id);if(p.id===window.gcProfiles.currentId&&window.gcProfiles.canRead?.()){close();closeChooser();showOwnerTools();return}close();await choose(p.id)});
    dialog.querySelector("[data-owner-create]")?.addEventListener("click",async()=>{try{const created=window.gcProfiles.create(OWNER_NAME);markChosen(created.id);close();await choose(created.id)}catch(e){dialog.querySelector("p").textContent=e?.message||"建立失敗"}});
    dialog.showModal();
  }

  function showOwnerTools(){
    document.documentElement.classList.add("gc-owner-tools-visible");
    const admin=document.getElementById("gcAdminPanel");if(admin)admin.hidden=false;
  }

  function afterMount(){
    hideOwnerFromExistingUi();
    const current=profiles().find(p=>p.id===window.gcProfiles?.currentId);
    if(current?.name===OWNER_NAME)showOwnerTools();
  }

  function start(){
    hideOwnerFromExistingUi();
    if(!chosenThisSession())openChooser();
  }

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden||!window.gcProfiles)return;
    if(!chosenThisSession())openChooser();
  });

  window.gcProfileLauncher={start,afterMount,openChooser,openOwnerEntry};
  start();
})();