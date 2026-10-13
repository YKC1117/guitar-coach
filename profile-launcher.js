(() => {
  "use strict";
  const SESSION_KEY="guitarCoachSessionUserChosenV1";
  const OWNER_NAME="可樂";
  let overlay=null;

  const profiles=()=>window.gcProfiles?.list?.()||[];
  const owner=()=>profiles().find(p=>String(p.name).trim()===OWNER_NAME)||null;
  const visibleProfiles=()=>profiles().filter(p=>String(p.name).trim()!==OWNER_NAME);
  const esc=v=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function chosenThisSession(){try{return sessionStorage.getItem(SESSION_KEY)==="1"}catch(e){return false}}
  function markChosen(){try{sessionStorage.setItem(SESSION_KEY,"1")}catch(e){}}
  function unmarkChosen(){try{sessionStorage.removeItem(SESSION_KEY)}catch(e){}}

  function hideOwnerFromExistingUi(){
    document.querySelectorAll("#gcProfileSelect option,.gc-profile-gate option").forEach(o=>{
      if(o.textContent.trim()===OWNER_NAME)o.remove();
    });
    const badge=document.querySelector(".gc-user-switch");
    if(badge&&badge.textContent.includes(OWNER_NAME))badge.hidden=true;
    const adminButton=document.querySelector(".gc-data-admin");
    if(adminButton)adminButton.hidden=true;
    const admin=document.getElementById("gcAdminPanel");
    if(admin&&!document.documentElement.classList.contains("gc-owner-tools-visible"))admin.hidden=true;
  }

  async function choose(id){
    if(!window.gcProfiles)return;
    const current=window.gcProfiles.currentId;
    if(id===current&&window.gcProfiles.canRead?.()){
      markChosen();closeChooser();return;
    }
    markChosen();
    let reloaded=false;
    const timer=setTimeout(()=>{if(!reloaded)unmarkChosen()},1200);
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
    if(name===OWNER_NAME){if(status)status.textContent="這個名稱已保留";return}
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
      button.innerHTML=`<span class="gc-launch-avatar">${esc((p.name||"使").slice(0,1))}</span><span class="gc-launch-user-copy"><strong>${esc(p.name)}</strong><small>${active?"上次使用":"點一下進入"}</small></span><span class="gc-launch-arrow">›</span>`;
      button.onclick=()=>choose(p.id);box.appendChild(button);
    }
  }

  function openChooser(){
    if(overlay||chosenThisSession()||!window.gcProfiles)return;
    document.documentElement.classList.add("gc-launch-lock");
    overlay=document.createElement("section");overlay.className="gc-launcher";overlay.setAttribute("aria-modal","true");overlay.setAttribute("role","dialog");
    overlay.innerHTML=`<div class="gc-launch-card">
      <div class="gc-launch-brand" data-owner-gesture aria-hidden="true">G</div>
      <span class="kicker">WHO'S PLAYING?</span>
      <h1>今天誰要使用？</h1>
      <p class="gc-launch-sub">先選自己的使用者，筆記、練習紀錄和照片才不會混在一起。</p>
      <div class="gc-launch-users" data-launch-users></div>
      <details class="gc-launch-add"><summary>＋ 新增使用者</summary><div class="gc-launch-add-row"><input data-launch-new-name maxlength="40" placeholder="輸入名稱" autocomplete="off"><button type="button" data-launch-add>建立</button></div></details>
      <p class="gc-launch-status" data-launch-status role="status"></p>
    </div>`;
    document.body.appendChild(overlay);renderCards();
    overlay.querySelector("[data-launch-add]").onclick=addUser;
    overlay.querySelector("[data-launch-new-name]").addEventListener("keydown",e=>{if(e.key==="Enter")addUser()});
    bindOwnerGesture(overlay.querySelector("[data-owner-gesture]"));
    hideOwnerFromExistingUi();
  }

  function openOwnerEntry(){
    const p=owner();if(!p)return;
    const old=document.getElementById("gcOwnerEntry");if(old)old.remove();
    const dialog=document.createElement("dialog");dialog.id="gcOwnerEntry";dialog.className="gc-owner-entry";
    dialog.innerHTML='<h2>管理者入口</h2><p>此入口不會出現在一般使用者清單。</p><div class="gc-owner-entry-actions"><button type="button" data-owner-cancel>取消</button><button type="button" data-owner-enter>進入管理者使用者</button></div>';
    document.body.appendChild(dialog);
    const close=()=>{dialog.close();dialog.remove()};
    dialog.querySelector("[data-owner-cancel]").onclick=close;
    dialog.addEventListener("cancel",e=>{e.preventDefault();close()});
    dialog.querySelector("[data-owner-enter]").onclick=async()=>{markChosen();if(p.id===window.gcProfiles.currentId&&window.gcProfiles.canRead?.()){close();closeChooser();showOwnerTools();return}close();await choose(p.id)};
    dialog.showModal();
  }

  function bindOwnerGesture(el){
    if(!el||el.dataset.ownerBound==="1")return;el.dataset.ownerBound="1";
    let timer=null;
    const start=()=>{clearTimeout(timer);timer=setTimeout(openOwnerEntry,1800)};
    const cancel=()=>{clearTimeout(timer);timer=null};
    el.addEventListener("pointerdown",start);["pointerup","pointercancel","pointerleave"].forEach(n=>el.addEventListener(n,cancel));
  }

  function showOwnerTools(){
    document.documentElement.classList.add("gc-owner-tools-visible");
    const admin=document.getElementById("gcAdminPanel");if(admin)admin.hidden=false;
  }

  function afterMount(){
    hideOwnerFromExistingUi();
    const brand=document.querySelector(".topbar .brand .logo")||document.querySelector(".topbar .brand");bindOwnerGesture(brand);
    const current=profiles().find(p=>p.id===window.gcProfiles?.currentId);
    if(current?.name===OWNER_NAME)showOwnerTools();
  }

  function start(){
    hideOwnerFromExistingUi();
    if(!chosenThisSession())openChooser();
  }

  window.gcProfileLauncher={start,afterMount,openChooser,openOwnerEntry};
  start();
})();
