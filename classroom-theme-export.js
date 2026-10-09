(() => {
  "use strict";
  const STORE="guitarCoachClassroomNotebookV1",ACTIVE="guitarCoachClassroomActiveV1",THEME_KEY="guitarCoachThemeV1";
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const load=()=>{window.gcNotebook?.flush();if(window.gcNotebook)return window.gcNotebook.list();try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(v)?v:[]}catch(e){return[]}};

  const presets=[['black','黑'],['white','白'],['blue','藍'],['green','綠'],['purple','紫'],['orange','橘'],['rose','玫瑰']];
  let theme='black';
  function readTheme(){try{const t=JSON.parse(localStorage.getItem(THEME_KEY)||'null');if(presets.some(x=>x[0]===t?.preset))return t.preset;if(t?.mode==='light')return 'white';if(t?.mode==='midnight')return 'blue';return {violet:'purple',teal:'green'}[t?.accent]|| (presets.some(x=>x[0]===t?.accent)?t.accent:'black')}catch(e){return 'black'}}
  function applyTheme(t,save=true){theme=presets.some(x=>x[0]===t)?t:'black';document.documentElement.dataset.gcTheme=theme;delete document.documentElement.dataset.gcAccent;if(save){let previous={};try{const value=JSON.parse(localStorage.getItem(THEME_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))previous=value}catch(e){}localStorage.setItem(THEME_KEY,JSON.stringify({...previous,preset:theme}))};const meta=$('meta[name="theme-color"]');if(meta)meta.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();renderThemePanel()}
  function injectThemeButton(){if($('#gcThemeButton'))return;const wrap=document.createElement('div');wrap.className='gc-theme-control';wrap.innerHTML='<button type="button" id="gcThemeButton" class="gc-theme-button" aria-label="調整頁面配色" aria-expanded="false">配色</button><div class="gc-theme-panel hidden" id="gcThemePanel"></div>';document.body.appendChild(wrap);$('#gcThemeButton').onclick=()=>{const open=$('#gcThemePanel').classList.toggle('hidden')===false;$('#gcThemeButton').setAttribute('aria-expanded',String(open))};document.addEventListener('click',e=>{if(!e.target.closest('.gc-theme-control')){$('#gcThemePanel').classList.add('hidden');$('#gcThemeButton').setAttribute('aria-expanded','false')}});renderThemePanel()}
  function renderThemePanel(){const panel=$('#gcThemePanel');if(!panel)return;panel.innerHTML='<div class="gc-theme-mode-grid">'+presets.map(([id,label])=>`<button type="button" data-theme-preset="${id}" class="${theme===id?'active':''}" aria-pressed="${theme===id}">${label}</button>`).join('')+'</div>';$$('[data-theme-preset]',panel).forEach(b=>b.onclick=()=>applyTheme(b.dataset.themePreset))}

  function currentLesson(){
    const form=$("#teacherLessonForm"),id=form?.dataset.classroomNotebookId||localStorage.getItem(ACTIVE)||"",item=load().find(x=>x.id===id)||null;
    return {item,meta:{date:$("#teacherLessonDate")?.value||item?.signature?.date||"",teacher:$("#teacherName")?.value.trim()||item?.signature?.teacher||"",song:$("#teacherSong")?.value.trim()||item?.signature?.song||"",topic:$("#teacherTopic")?.value.trim()||item?.signature?.topic||"",bpm:$("#teacherBpm")?.value||"",notes:$("#teacherNotes")?.value.trim()||"",problem:$("#teacherProblem")?.value.trim()||"",homework:$("#teacherHomework")?.value.trim()||"",questions:$("#teacherQuestions")?.value.trim()||""}};
  }
  function tabText(b){const labels=["e","B","G","D","A","E"],parts=[];(b.cells||[]).forEach((row,i)=>{const used=row.map((v,c)=>v!==""?`${c+1}:${v}`:"").filter(Boolean);if(used.length)parts.push(`${labels[i]}弦 ${used.join("  ")}`)});return parts.join(" / ")}
  function blockTitle(b){return b.type==="text"?"速記":b.type==="staff"?"五線譜":b.type==="tab"?"TAB":b.type==="chords"?"和弦":b.type==="chordgrid"?"和弦格":b.type==="rhythm"?"節奏":"課堂內容"}
  function blockLines(b){
    const out=[];
    if(b.type==="text"&&b.text)out.push(...String(b.text).split(/\n+/));
    if(b.type==="staff")out.push(`${(b.clef||"treble")==="treble"?"高音":"低音"}譜號 · ${b.key||"C"} · ${b.meter||"未設定拍號"} · ${(b.items||b.notes||[]).length} 個符號`);
    if(b.type==="tab"){const t=tabText(b);if(t)out.push(t)}
    if(b.type==="chords"&&(b.items||[]).length)out.push((b.items||[]).join("  →  "));
    if(b.type==="chordgrid")out.push(`${b.name||"未命名和弦"} · 起始 ${b.baseFret||1} 品`);
    if(b.type==="rhythm")out.push(`${b.bpm||70} BPM · ${b.meter||"未設定拍號"} · ${(b.beats||[]).map(x=>x||"○").join(" ")}`);
    if(b.memo)out.push("備註："+b.memo);return out;
  }

  const PAGE_W=1240,PAGE_H=1754,M=82,CONTENT_W=PAGE_W-M*2;
  function makeCanvas(){const c=document.createElement("canvas");c.width=PAGE_W;c.height=PAGE_H;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,PAGE_W,PAGE_H);x.textBaseline="top";return{c,x,y:M}}
  function wrapText(ctx,text,maxWidth,font){ctx.font=font;const chars=[...String(text||"")],lines=[];let line="";for(const ch of chars){const test=line+ch;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=ch}else line=test}if(line)lines.push(line);return lines.length?lines:[""]}
  function newPage(pages,title,date){const p=makeCanvas();p.x.fillStyle="#111827";p.x.font="700 38px system-ui,-apple-system,'PingFang TC','Noto Sans CJK TC',sans-serif";p.x.fillText(title,M,p.y);p.y+=54;p.x.fillStyle="#6b7280";p.x.font="500 19px system-ui,-apple-system,'PingFang TC',sans-serif";p.x.fillText(date||"",M,p.y);p.y+=42;p.x.strokeStyle="#d1d5db";p.x.beginPath();p.x.moveTo(M,p.y);p.x.lineTo(PAGE_W-M,p.y);p.x.stroke();p.y+=28;pages.push(p);return p}
  function need(p,h,pages,title,date){return p.y+h<PAGE_H-M?p:newPage(pages,title,date)}
  function drawLines(p,lines,{size=24,bold=false,muted=false,indent=0}={}){for(const raw of lines){const font=(bold?"700 ":"500 ")+size+"px system-ui,-apple-system,'PingFang TC','Noto Sans CJK TC',sans-serif",wrapped=wrapText(p.x,raw,CONTENT_W-indent,font);for(const line of wrapped){p.x.font=font;p.x.fillStyle=muted?"#6b7280":"#111827";p.x.fillText(line,M+indent,p.y);p.y+=size*1.48}}}
  function drawStaff(p,b){const top=p.y+18,left=M+34,right=PAGE_W-M-20;for(let i=0;i<5;i++){const yy=top+i*20;p.x.strokeStyle="#374151";p.x.beginPath();p.x.moveTo(left,yy);p.x.lineTo(right,yy);p.x.stroke()}p.x.fillStyle="#111827";p.x.font="64px serif";p.x.fillText((b.clef||"treble")==="bass"?"𝄢":"𝄞",left+4,top-31);const items=b.items||b.notes||[];items.slice(0,28).forEach(it=>{const xx=left+95+((it.x||20)-16)/82*(right-left-115),yy=top+40+(((it.y||50)-50)/4.75)*10;p.x.fillStyle="#111827";p.x.font="30px serif";const glyph=it.kind==="rest"?"𝄽":it.kind==="bar"?"│":it.kind==="mark"?(it.mark||"•"):"♩";p.x.fillText(glyph,xx,Math.max(top-20,Math.min(top+90,yy-15)))});p.y=top+125}
  function drawChordGrid(p,b){const x0=M+70,y0=p.y+16,w=330,h=255,col=w/5,row=h/5;p.x.strokeStyle="#111827";p.x.lineWidth=3;for(let c=0;c<6;c++){const x=x0+c*col;p.x.beginPath();p.x.moveTo(x,y0);p.x.lineTo(x,y0+h);p.x.stroke()}for(let r=0;r<6;r++){const y=y0+r*row;p.x.beginPath();p.x.moveTo(x0,y);p.x.lineTo(x0+w,y);p.x.stroke()}p.x.font="700 22px system-ui";p.x.fillStyle="#111827";p.x.fillText(b.name||"Chord",x0+w+38,y0+4);(b.top||[]).forEach((v,c)=>{if(v)p.x.fillText(v,x0+c*col-7,y0-32)});(b.cells||[]).forEach((rowv,r)=>rowv.forEach((v,c)=>{if(v){p.x.fillStyle="#111827";p.x.beginPath();p.x.arc(x0+c*col,y0+(r+.5)*row,16,0,Math.PI*2);p.x.fill();p.x.fillStyle="#fff";p.x.font="700 14px system-ui";p.x.textAlign="center";p.x.fillText(v,x0+c*col,y0+(r+.5)*row-9);p.x.textAlign="left"}}));p.y=y0+h+28}

  function renderPages(){
    const {item,meta}=currentLesson();if(!item)throw new Error("no lesson");const title="Guitar Coach 課堂紀錄",pages=[];let p=newPage(pages,title,meta.date||"");
    drawLines(p,[`老師：${meta.teacher||"—"}`,`歌曲／教材：${meta.song||"—"}`,`主題：${meta.topic||"—"}${meta.bpm?" · "+meta.bpm+" BPM":""}`],{size:23});p.y+=18;
    for(const b of item.blocks||[]){const visual=b.type==="staff"?190:b.type==="chordgrid"?340:0,lines=blockLines(b),est=70+visual+Math.max(1,lines.length)*42;p=need(p,est,pages,title,meta.date||"");p.x.fillStyle="#eef2ff";p.x.fillRect(M,p.y,CONTENT_W,48);p.x.fillStyle="#3730a3";p.x.font="700 24px system-ui,-apple-system,'PingFang TC',sans-serif";p.x.fillText(blockTitle(b),M+16,p.y+10);p.y+=62;if(b.type==="staff")drawStaff(p,b);else if(b.type==="chordgrid")drawChordGrid(p,b);drawLines(p,lines,{size:22});p.y+=22}
    const extras=[["老師提醒",meta.notes],["卡住的地方",meta.problem],["回家作業",meta.homework],["下次想問老師",meta.questions]].filter(x=>x[1]);for(const [label,text] of extras){p=need(p,120,pages,title,meta.date||"");drawLines(p,[label],{size:24,bold:true});drawLines(p,String(text).split(/\n+/),{size:21,indent:12});p.y+=18}
    pages.forEach((pg,i)=>{pg.x.fillStyle="#9ca3af";pg.x.font="500 16px system-ui";pg.x.fillText(`Guitar Coach · ${i+1}/${pages.length}`,M,PAGE_H-48)});return pages.map(x=>x.c)
  }
  function safeName(){const {meta}=currentLesson();return `GuitarCoach_${meta.date||"lesson"}_${(meta.song||meta.topic||"class").replace(/[\\/:*?"<>|]/g,"-").slice(0,28)}`}
  async function saveBlob(blob,name){
    try{const file=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==="AbortError")return}
    const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)
  }
  async function exportPNG(){try{const pages=renderPages(),maxH=30000,rawH=pages.length*PAGE_H,scale=Math.min(1,maxH/rawH),out=document.createElement("canvas");out.width=Math.round(PAGE_W*scale);out.height=Math.round(rawH*scale);const x=out.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,out.width,out.height);pages.forEach((c,i)=>x.drawImage(c,0,Math.round(i*PAGE_H*scale),out.width,Math.round(PAGE_H*scale)));const blob=await new Promise(r=>out.toBlob(r,"image/png"));if(!blob)throw new Error();await saveBlob(blob,safeName()+".png")}catch(e){alert("圖片匯出失敗，請重新開啟課堂筆記後再試一次。")}}
  function dataUrlBytes(dataUrl){const bin=atob(dataUrl.split(",")[1]),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr}
  function buildPdf(canvases){
    const objects=[null],pages=[],encoder=new TextEncoder(),add=v=>{objects.push(v);return objects.length-1},catalog=add(""),pagesObj=add("");
    canvases.forEach(c=>{const jpeg=dataUrlBytes(c.toDataURL("image/jpeg",.9)),img=add({dict:`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,bytes:jpeg}),stream=`q\n595 0 0 842 0 0 cm\n/Im${img} Do\nQ`,content=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),page=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${img} ${img} 0 R >> >> /Contents ${content} 0 R >>`);pages.push(page)});
    objects[catalog]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;objects[pagesObj]=`<< /Type /Pages /Kids [${pages.map(x=>x+" 0 R").join(" ")}] /Count ${pages.length} >>`;
    const chunks=[encoder.encode("%PDF-1.4\n%GC\n")],offsets=[0];let len=chunks[0].length;
    for(let i=1;i<objects.length;i++){offsets[i]=len;const head=encoder.encode(`${i} 0 obj\n`);chunks.push(head);len+=head.length;const o=objects[i];if(o&&o.bytes){const d=encoder.encode(o.dict+"\nstream\n"),tail=encoder.encode("\nendstream\nendobj\n");chunks.push(d,o.bytes,tail);len+=d.length+o.bytes.length+tail.length}else{const b=encoder.encode(String(o)+"\nendobj\n");chunks.push(b);len+=b.length}}
    const xref=len;let table=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)table+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";table+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;chunks.push(encoder.encode(table));return new Blob(chunks,{type:"application/pdf"})
  }
  async function exportPDF(){try{await saveBlob(buildPdf(renderPages()),safeName()+".pdf")}catch(e){alert("PDF 匯出失敗，請重新開啟課堂筆記後再試一次。")}}

  function injectExportButtons(){const summary=$(".summary-actions");if(!summary||$("#exportLessonPNG"))return;const wrap=document.createElement("div");wrap.className="lesson-export-actions";wrap.innerHTML=`<button type="button" id="exportLessonPNG">匯出圖片 PNG</button><button type="button" id="exportLessonPDF">匯出 PDF</button>`;summary.insertAdjacentElement("afterend",wrap);$("#exportLessonPNG").onclick=exportPNG;$("#exportLessonPDF").onclick=exportPDF}
  function sync(){injectThemeButton();injectExportButtons()}
  applyTheme(readTheme(),false);document.addEventListener("gc:workspace-rendered",sync);sync();
})();
