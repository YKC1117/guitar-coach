(() => {
  "use strict";

  function currentUserName(){
    const profiles=window.gcProfiles?.list?.()||[];
    const id=window.gcProfiles?.currentId;
    return profiles.find(p=>p.id===id)?.name||"目前使用者";
  }

  function openClearDialog(){
    if(!window.gcProfiles)return;
    const old=document.getElementById("gcClearDialog");
    if(old)old.remove();
    const dialog=document.createElement("dialog");
    dialog.id="gcClearDialog";
    dialog.className="gc-clear-dialog";
    const name=currentUserName();
    dialog.innerHTML=`
      <div class="gc-clear-head">
        <div>
          <span class="kicker">DATA CLEANUP</span>
          <h2>清除「${escapeHtml(name)}」的資料</h2>
        </div>
        <button type="button" class="gc-clear-close" aria-label="關閉">×</button>
      </div>
      <div class="gc-clear-warning">
        <strong>會清除這位使用者的學習內容</strong>
        <p>包含主要練習紀錄、課堂筆記、草稿、照片與錄音。其他使用者不受影響。</p>
      </div>
      <div class="gc-clear-flow" aria-label="清除流程">
        <span><b>1</b>確認使用者</span><i>→</i><span><b>2</b>輸入密碼</span><i>→</i><span><b>3</b>移至回收區</span>
      </div>
      <label class="gc-clear-password">使用者密碼
        <input type="password" autocomplete="current-password" maxlength="128" placeholder="輸入 ${escapeHtml(name)} 的密碼">
      </label>
      <p class="gc-clear-note">清除前會先建立本機回收紀錄，可由管理者復原。回收區仍屬於這台裝置，不是雲端備份。</p>
      <p class="gc-clear-status" role="status"></p>
      <div class="gc-clear-actions">
        <button type="button" class="gc-clear-cancel">取消</button>
        <button type="button" class="gc-clear-confirm">移至回收區</button>
      </div>`;
    document.body.appendChild(dialog);
    const input=dialog.querySelector("input");
    const status=dialog.querySelector(".gc-clear-status");
    const confirmBtn=dialog.querySelector(".gc-clear-confirm");
    const close=()=>{if(dialog.open)dialog.close();dialog.remove()};
    dialog.querySelector(".gc-clear-close").onclick=close;
    dialog.querySelector(".gc-clear-cancel").onclick=close;
    dialog.addEventListener("cancel",e=>{e.preventDefault();close()});
    async function clear(){
      if(confirmBtn.disabled)return;
      status.textContent="";
      if(!input.value){status.textContent="請先輸入目前使用者密碼。";input.focus();return;}
      confirmBtn.disabled=true;confirmBtn.textContent="處理中…";
      try{
        if(!(await window.gcProfiles.verify(input.value))){throw Error("密碼不正確，資料沒有變更。");}
        await window.gcProfiles.clearData("current",input.value);
      }catch(e){
        status.textContent=e?.message||"清除失敗，資料沒有變更。";
        confirmBtn.disabled=false;confirmBtn.textContent="移至回收區";input.select();
      }
    }
    confirmBtn.onclick=clear;
    input.addEventListener("keydown",e=>{if(e.key==="Enter")clear()});
    dialog.showModal();
    setTimeout(()=>input.focus(),0);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function openAdminEntry(){
    const profiles=window.gcProfiles?.list?.()||[];
    const current=profiles.find(p=>p.id===window.gcProfiles?.currentId);
    if(current?.name==="管理員"){
      document.documentElement.classList.add("gc-owner-tools-visible");
      const admin=document.getElementById("gcAdminPanel");
      if(!admin)return;
      admin.hidden=false;
      admin.open=true;
      admin.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }
    window.gcProfileLauncher?.openOwnerEntry?.();
  }

  function enhanceProfilePanel(){
    const panel=document.getElementById("gcProfilePanel");
    if(!panel||panel.dataset.dataUx==="true")return;
    panel.dataset.dataUx="true";
    const reset=panel.querySelector("#gcResetDetails");
    if(reset)reset.classList.add("gc-legacy-reset");

    const hub=document.createElement("section");
    hub.className="gc-data-hub";
    hub.innerHTML=`
      <div class="gc-data-hub-copy">
        <span class="kicker">DATA</span>
        <h3>資料管理</h3>
        <p>一般使用者只會處理自己的資料；需要管理多人或復原資料，再進管理員入口。</p>
      </div>
      <div class="gc-data-actions">
        <button type="button" class="gc-data-own">
          <span>清除我的資料</span><small>先進本機回收區，可復原</small>
        </button>
        <button type="button" class="gc-data-admin">
          <span>管理員入口</span><small>多人清理、回收與復原</small>
        </button>
      </div>`;
    const status=panel.querySelector("#gcProfileStatus");
    panel.insertBefore(hub,status||null);
    hub.querySelector(".gc-data-own").onclick=openClearDialog;
    hub.querySelector(".gc-data-admin").onclick=openAdminEntry;
  }

  function enhanceAdmin(){
    const panel=document.getElementById("gcAdminPanel");
    if(!panel||panel.dataset.dataUx==="true")return;
    panel.dataset.dataUx="true";
    const summary=panel.querySelector("summary");
    if(summary)summary.innerHTML='<span>管理者資料工具</span><small>多人清理・回收・復原</small>';
    const fieldset=panel.querySelector("fieldset");
    if(fieldset){
      const guide=document.createElement("div");
      guide.className="gc-admin-guide";
      guide.innerHTML='<span><b>1</b>勾選使用者</span><span><b>2</b>輸入管理密碼</span><span><b>3</b>移至回收區</span>';
      fieldset.before(guide);
      const counter=document.createElement("p");counter.className="gc-admin-selected";counter.textContent="尚未選擇使用者";fieldset.after(counter);
      const recycle=panel.querySelector("[data-recycle]");
      const update=()=>{
        const count=panel.querySelectorAll("[data-admin-user]:checked").length;
        counter.textContent=count?`已選擇 ${count} 位使用者`:`尚未選擇使用者`;
        if(recycle)recycle.textContent=count?`將 ${count} 位使用者移至回收區`:`將勾選者資料移至回收區`;
      };
      panel.addEventListener("change",e=>{if(e.target.matches("[data-admin-user]"))update()});
      panel.querySelector("[data-select-all]")?.addEventListener("click",()=>queueMicrotask(update));
      panel.querySelector("[data-select-none]")?.addEventListener("click",()=>queueMicrotask(update));
      panel.addEventListener("toggle",()=>{if(panel.open)queueMicrotask(update)});
      update();
    }
  }

  function mount(){enhanceProfilePanel();enhanceAdmin()}
  window.gcDataUX={mount,openClearDialog,openAdminEntry};
})();