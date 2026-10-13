(() => {
  "use strict";
  const QUICK_MODE_KEY="guitarCoachTeacherQuickModeV1";

  function byTextSection(title){
    return [...document.querySelectorAll("#page-home .home-section")].find(section=>section.querySelector("h2")?.textContent.trim()===title)||null;
  }

  function mountHomeFocus(){
    const home=document.getElementById("page-home");
    if(!home||document.getElementById("gcHomeMore"))return;
    const tools=byTextSection("快速開始");
    const coach=document.getElementById("coachAdvice")?.closest(".home-section");
    if(!tools&&!coach)return;
    const more=document.createElement("details");
    more.id="gcHomeMore";
    more.className="gc-home-more";
    more.innerHTML='<summary><span><strong>更多練習工具與建議</strong><small>調音、節拍器、換和弦、教練建議</small></span><b>展開</b></summary><div class="gc-home-more-body"></div>';
    const body=more.querySelector(".gc-home-more-body");
    const anchor=tools||coach;
    anchor.parentNode.insertBefore(more,anchor);
    if(tools)body.appendChild(tools);
    if(coach)body.appendChild(coach);
    more.addEventListener("toggle",()=>{more.querySelector("summary b").textContent=more.open?"收合":"展開"});
  }

  function setQuickMode(form,on){
    form.classList.toggle("gc-teacher-quick",on);
    const button=form.querySelector("[data-gc-teacher-mode]");
    if(button){button.textContent=on?"展開完整欄位":"切回快速記錄";button.setAttribute("aria-pressed",String(!on));}
    try{sessionStorage.setItem(QUICK_MODE_KEY,on?"1":"0")}catch(e){}
  }

  function getQuickMode(){try{return sessionStorage.getItem(QUICK_MODE_KEY)!=="0"}catch(e){return true}}

  function markAdvancedFields(form){
    ["#teacherDuration","#nextLessonDate","#teacherSong","#teacherBpm"].forEach(sel=>form.querySelector(sel)?.closest("label")?.classList.add("gc-teacher-advanced"));
    form.querySelector(".teacher-question-builder")?.classList.add("gc-teacher-advanced");
  }

  function mountTeacherFocus(){
    const form=document.getElementById("teacherLessonForm");
    const summary=document.querySelector("#learn-teacher .teacher-summary");
    if(!form||form.dataset.gcFocusUx==="1")return;
    form.dataset.gcFocusUx="1";
    markAdvancedFields(form);

    const title=form.querySelector(".form-title");
    if(title){
      const mode=document.createElement("div");
      mode.className="gc-teacher-modebar";
      mode.innerHTML='<div><strong>快速記錄模式</strong><small>先記今天學什麼、老師提醒、卡點和作業；其他欄位需要時再展開。</small></div><button type="button" data-gc-teacher-mode></button>';
      title.insertAdjacentElement("afterend",mode);
      mode.querySelector("button").onclick=()=>setQuickMode(form,!form.classList.contains("gc-teacher-quick"));
    }
    setQuickMode(form,getQuickMode());

    ["newTeacherLesson","emptyNewTeacherLesson","repeatLastTeacherLesson"].forEach(id=>{
      document.getElementById(id)?.addEventListener("click",()=>setTimeout(()=>{
        setQuickMode(form,getQuickMode());
        if(!form.classList.contains("hidden"))form.scrollIntoView({behavior:"smooth",block:"start"});
      },30));
    });

    if(summary){
      const hint=document.createElement("div");
      hint.className="gc-teacher-hint";
      hint.innerHTML='<strong>上完課只要先記 4 件事</strong><span>今天學什麼 → 老師提醒 → 哪裡卡住 → 回家作業</span>';
      summary.insertAdjacentElement("afterend",hint);
    }
  }

  function mountMobileTouch(){
    document.documentElement.classList.add("gc-touch-ux");
    document.querySelectorAll("button,.bottom-nav [data-route]").forEach(el=>{
      if(!el.hasAttribute("type")&&el.tagName==="BUTTON")el.type="button";
    });
  }

  function mount(){
    if(document.documentElement.dataset.gcFocusUx==="1")return;
    document.documentElement.dataset.gcFocusUx="1";
    mountHomeFocus();
    mountTeacherFocus();
    mountMobileTouch();
  }

  window.gcFocusUX={mount};
})();
