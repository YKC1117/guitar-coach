(() => {
  "use strict";
  const KEY="guitarCoachBeginnerV1";
  const store=()=>window.gcProfiles?.store||window.localStorage;

  function read(){try{const v=JSON.parse(store().getItem(KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(e){return {}}}
  function currentPage(){return document.getElementById("page-beginner")}
  function lessons(){return [...(currentPage()?.querySelectorAll(".bz-lesson")||[])]}
  function incomplete(){return lessons().filter(x=>!x.classList.contains("done"))}
  function activeTab(){return currentPage()?.querySelector("[data-bz-stage].active")}
  function nextStageTab(){const tabs=[...(currentPage()?.querySelectorAll("[data-bz-stage]")||[])],i=tabs.findIndex(x=>x.classList.contains("active"));return i>=0?tabs[i+1]||null:null}

  function openCard(card,scroll=true){
    if(!card)return;
    const head=card.querySelector(".bz-lesson-head"),body=card.querySelector(".bz-lesson-body");
    if(body?.hidden)head?.click();
    if(scroll)card.scrollIntoView({behavior:"smooth",block:"center"});
  }

  function updateCurrentGuide(){
    const page=currentPage();if(!page)return;
    let guide=document.getElementById("bzCurrentGuide");
    const intro=page.querySelector(".bz-stage-intro");if(!intro)return;
    if(!guide){guide=document.createElement("section");guide.id="bzCurrentGuide";guide.className="bz-current-guide";intro.insertAdjacentElement("afterend",guide)}
    const left=incomplete(),tab=activeTab(),stageName=tab?.querySelector("b")?.textContent?.trim()||"目前階段";
    if(left.length){
      const card=left[0],title=card.querySelector(".bz-lesson-head strong")?.textContent?.trim()||"下一項練習";
      const detail=card.querySelector(".bz-lesson-head em")?.textContent?.trim()||"";
      guide.innerHTML=`<div><span class="kicker">現在先做這個</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div><button type="button" data-bz-current>開始這一課</button>`;
      guide.querySelector("button").onclick=()=>openCard(card);
    }else{
      const next=nextStageTab();
      guide.innerHTML=next?`<div><span class="kicker">階段完成</span><strong>${escapeHtml(stageName)}完成了</strong><p>不用再重複找課程，直接往下一階段。</p></div><button type="button" data-bz-next-stage>前往下一階段</button>`:`<div><span class="kicker">新手路線完成</span><strong>目前新手課程都完成了</strong><p>接下來以歌曲、節奏穩定與老師作業為主。</p></div><button type="button" data-bz-back-home>回首頁</button>`;
      guide.querySelector("[data-bz-next-stage]")?.addEventListener("click",()=>{next.click();setTimeout(()=>{updateCurrentGuide();openCard(incomplete()[0])},20)});
      guide.querySelector("[data-bz-back-home]")?.addEventListener("click",()=>document.querySelector('[data-route="home"]')?.click());
    }
  }

  function simplifyLessonHeads(){
    lessons().forEach((card,i)=>{
      const head=card.querySelector(".bz-lesson-head");if(!head)return;
      head.classList.toggle("is-next",!card.classList.contains("done")&&i===lessons().findIndex(x=>!x.classList.contains("done")));
      const marker=head.querySelector("[data-bz-order]");if(marker)marker.remove();
      if(!card.classList.contains("done")){
        const small=head.querySelector("small");if(small){const badge=document.createElement("span");badge.dataset.bzOrder="1";badge.className="bz-order";badge.textContent=i===lessons().findIndex(x=>!x.classList.contains("done"))?"下一課":`第 ${i+1} 項`;small.insertAdjacentElement("afterend",badge)}
      }
    });
  }

  function addLegend(){
    const page=currentPage();if(!page||document.getElementById("bzMobileLegend"))return;
    const finger=page.querySelector(".bz-finger-guide");if(!finger)return;
    const note=document.createElement("div");note.id="bzMobileLegend";note.className="bz-mobile-legend";
    note.innerHTML='<strong>看和弦圖只要記 3 件事</strong><span>① 圓點數字＝哪根手指　② ○＝空弦可以彈　③ ×＝這條弦先不要彈</span>';
    finger.insertAdjacentElement("afterend",note);
  }

  function refresh(){updateCurrentGuide();simplifyLessonHeads();addLegend()}

  function showNextPrompt(){
    const page=currentPage();if(!page||!page.classList.contains("active"))return;
    document.getElementById("bzNextPrompt")?.remove();
    const left=incomplete(),nextStage=nextStageTab();
    const box=document.createElement("div");box.id="bzNextPrompt";box.className="bz-next-prompt";
    if(left.length){
      const title=left[0].querySelector("strong")?.textContent?.trim()||"下一課";
      box.innerHTML=`<span>完成。下一個：<b>${escapeHtml(title)}</b></span><button type="button">繼續</button>`;
      box.querySelector("button").onclick=()=>{box.remove();openCard(left[0])};
    }else if(nextStage){
      box.innerHTML='<span>這階段完成了。</span><button type="button">進下一階段</button>';
      box.querySelector("button").onclick=()=>{box.remove();nextStage.click();setTimeout(()=>{refresh();openCard(incomplete()[0])},20)};
    }else{
      box.innerHTML='<span>新手路線目前全部完成。</span><button type="button">回首頁</button>';
      box.querySelector("button").onclick=()=>document.querySelector('[data-route="home"]')?.click();
    }
    document.body.appendChild(box);setTimeout(()=>box.classList.add("show"),0);
  }

  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  function mount(){
    if(document.documentElement.dataset.gcBeginnerFlow==="1")return;
    document.documentElement.dataset.gcBeginnerFlow="1";
    refresh();
    document.addEventListener("click",e=>{
      if(e.target.closest(".bz-entry,[data-gc-hub='beginner'],[data-gc-next]"))setTimeout(refresh,40);
      if(e.target.closest("[data-bz-stage]"))setTimeout(refresh,20);
      if(e.target.closest("[data-bz-done]"))setTimeout(()=>{refresh();showNextPrompt()},40);
    });
  }
  window.gcBeginnerFlowUX={mount,refresh};
})();
