(() => {
  'use strict';
  // These local UI locks do not replace server authorization or encrypt device data.
  const native={getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v),removeItem:k=>window.localStorage.removeItem(k)};
  const REG='guitarCoachProfilesV1',ACTIVE='guitarCoachProfileActiveV1',LEGACY='guitarCoachClearPasswordV1';
  const LOCK=id=>'guitarCoachUserPasswordV2:'+id,SESSION=id=>'guitarCoachUnlockedV2:'+id;
  const keys=['guitarCoachV1','guitarCoachV2','guitarCoachTeacherDraftV1','guitarCoachClassroomNotebookV1','guitarCoachClassroomActiveV1','guitarCoachNotebookTabV2','guitarCoachStaffPaletteV2','guitarCoachThemeV1'];
  const prefix=id=>id==='default'?'':'guitarCoachUser:'+id+':';
  let profiles=[{id:'default',name:'原有使用者'}],current='default',resetting=false,operation=false;
  function readProfiles(){
    const value=JSON.parse(native.getItem(REG)||'null');if(value===null)return [{id:'default',name:'原有使用者'}];
    if(!Array.isArray(value)||!value.length||value.length>100||!value.some(p=>p.id==='default')||new Set(value.map(p=>p.id)).size!==value.length||!value.every(p=>p&&/^(default|u-[a-z0-9-]+)$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=40))throw Error('使用者名單格式有誤，請先保留備份');
    return value;
  }
  try{profiles=readProfiles();const id=native.getItem(ACTIVE);if(profiles.some(p=>p.id===id))current=id}catch(e){}
  const epochKey='guitarCoachProfileEpoch:'+current;let epoch=null;try{epoch=native.getItem(epochKey)}catch(e){}
  function lockRecord(id=current){const raw=native.getItem(LOCK(id));if(!raw)return null;const value=JSON.parse(raw);if(value.version!==2||value.algorithm!=='PBKDF2-SHA256'||value.iterations!==600000||!/^[a-f0-9]{32}$/.test(value.salt)||!/^[a-f0-9]{64}$/.test(value.hash))throw Error('使用者密碼設定損壞，已停止存取');return value}
  function stamp(lock){return lock?lock.salt+':'+lock.hash:''}
  function authorized(id=current){const lock=lockRecord(id);return !lock||window.sessionStorage.getItem(SESSION(id))===stamp(lock)}
  function canRead(){return !resetting&&authorized()&&native.getItem(epochKey)===epoch}
  function canWrite(){return canRead()}
  function assertAccess(){if(!canRead())throw Error('使用者已鎖定或資料已清除，請重新解鎖')}
  const store={getItem(key){assertAccess();return native.getItem(prefix(current)+key)},setItem(key,value){assertAccess();native.setItem(prefix(current)+key,value)},removeItem(key){assertAccess();native.removeItem(prefix(current)+key)}};
  const dbName=id=>id==='default'?'guitarCoachMediaV1':'guitarCoachMediaV1-'+id;
  const status=message=>{const el=document.getElementById('gcProfileStatus');if(el)el.textContent=message};
  const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  async function hash(password,salt){const bytes=new TextEncoder().encode(password),material=await crypto.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveBits']);const saltBytes=Uint8Array.from(salt.match(/../g),x=>parseInt(x,16));return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations:600000},material,256))}
  async function verify(password,id=current){if(typeof password!=='string'||password.length>128)return false;const lock=lockRecord(id);return !!lock&&(await hash(password,lock.salt))===lock.hash}
  async function verifyLegacy(password){let old;try{old=JSON.parse(native.getItem(LEGACY)||'null')}catch(e){return false}return !!old&&typeof password==='string'&&hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(old.salt+'\0'+password)))===old.hash}
  async function setPassword(password,oldPassword){
    assertAccess();if(operation)throw Error('另一項資料操作尚未完成');if(typeof password!=='string'||password.length<8||password.length>128)throw Error('密碼須為 8 至 128 個字元');
    operation=true;try{const previous=native.getItem(LOCK(current));if(previous&&!(await verify(oldPassword)))throw Error('目前使用者密碼不正確');
    if(!previous&&current==='default'&&native.getItem(LEGACY)&&!(await verifyLegacy(oldPassword)))throw Error('請輸入舊版清除密碼，再設定獨立使用者密碼');
    const salt=hex(crypto.getRandomValues(new Uint8Array(16))),record={version:2,algorithm:'PBKDF2-SHA256',iterations:600000,salt,hash:await hash(password,salt)};
    if(native.getItem(LOCK(current))!==previous)throw Error('密碼已在另一個頁面變更，請重新載入');
    assertAccess();native.setItem(LOCK(current),JSON.stringify(record));window.sessionStorage.setItem(SESSION(current),stamp(record));}finally{operation=false}
  }
  function flush(){window.gcNotebook?.flush();window.dispatchEvent(new Event('gc:profile-leaving'))}
  async function unlock(password,id=current){if(!(await verify(password,id)))return false;window.sessionStorage.setItem(SESSION(id),stamp(lockRecord(id)));return true}
  function create(name){
    if(operation)throw Error('另一項資料操作尚未完成');profiles=readProfiles();name=String(name).trim().slice(0,40);if(!name)throw Error('請輸入使用者名稱');if(profiles.some(p=>p.name===name))throw Error('這個名稱已存在');if(profiles.length>=100)throw Error('這台裝置最多保存 100 位使用者');
    const p={id:'u-'+Date.now().toString(36)+'-'+hex(crypto.getRandomValues(new Uint8Array(6))),name};native.setItem(REG,JSON.stringify([...profiles,p]));profiles.push(p);return p;
  }
  // Password entry stays inside the app, never in URL parameters or profile names.
  function askUnlock(id,boot=false){return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='gc-unlock-dialog';dialog.innerHTML='<h2>解鎖使用者</h2><p class="gc-unlock-name"></p><label>使用者密碼<input type="password" autocomplete="current-password" maxlength="128"></label><p class="gc-unlock-status" role="status"></p><div class="gc-profile-row"><button type="button" data-unlock>解鎖</button><button type="button" data-cancel>取消</button></div>';
    dialog.querySelector('.gc-unlock-name').textContent=profiles.find(p=>p.id===id)?.name||'使用者';document.body.appendChild(dialog);let attempts=0,until=0;
    const close=value=>{dialog.close();dialog.remove();resolve(value)};
    dialog.querySelector('[data-cancel]').onclick=()=>close(false);dialog.addEventListener('cancel',e=>{e.preventDefault();close(false)});
    const button=dialog.querySelector('[data-unlock]'),input=dialog.querySelector('input'),message=dialog.querySelector('.gc-unlock-status');
    async function submit(){if(button.disabled)return;if(Date.now()<until){message.textContent='嘗試次數過多，請稍後再試';return}button.disabled=true;try{if(await unlock(input.value,id)){close(true);return}attempts++;if(attempts>=5){until=Date.now()+30000;attempts=0}message.textContent='密碼不正確，未開啟資料';input.value=''}catch(e){message.textContent=e.message}finally{button.disabled=false}}
    button.onclick=submit;input.onkeydown=e=>{if(e.key==='Enter')submit()};dialog.showModal();input.focus();
  })}
  async function switchTo(id){
    if(operation)return;profiles=readProfiles();if(!profiles.some(p=>p.id===id))throw Error('使用者不存在');operation=true;
    try{if(lockRecord(id)&&!(await askUnlock(id)))return;await window.gcPrepareProfileSwitch?.();flush();if(id!==current)window.sessionStorage.removeItem(SESSION(current));native.setItem(ACTIVE,id);location.reload()}finally{operation=false}
  }
  async function lockCurrent(){if(!lockRecord())throw Error('請先設定此使用者的密碼');await window.gcPrepareProfileSwitch?.();flush();window.sessionStorage.removeItem(SESSION(current));location.reload()}
  async function clearMedia(){if(!window.indexedDB)return;await new Promise((resolve,reject)=>{const req=indexedDB.open(dbName(current));req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,names=[...db.objectStoreNames];if(!names.length){db.close();resolve();return}const tx=db.transaction(names,'readwrite');names.forEach(name=>tx.objectStore(name).clear());tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=tx.onerror}})}
  async function clearData(scope,password){
    // Fail before any write, even when called directly with an old 'all' scope.
    if(scope!=='current')throw Error('網站不提供清除全部使用者的權限');assertAccess();if(operation)throw Error('另一項資料操作尚未完成');operation=true;
    try{if(!(await verify(password)))throw Error('目前使用者密碼不正確，資料未清除');assertAccess();flush();resetting=true;native.setItem(epochKey,String(Date.now())+'-'+Math.random());epoch=native.getItem(epochKey);await window.gcStopForReset?.();await clearMedia();keys.forEach(key=>native.removeItem(prefix(current)+key));window.sessionStorage.removeItem(SESSION(current));location.reload()}catch(e){resetting=false;throw e}finally{operation=false}
  }
  window.addEventListener('storage',e=>{if(e.key===epochKey||e.key===LOCK(current)){resetting=true;location.reload()}});
  function mount(){
    if(document.getElementById('gcProfilePanel'))return;const host=document.getElementById('page-progress');if(!host)return;
    const panel=document.createElement('section');panel.className='card gc-profile-panel';panel.id='gcProfilePanel';panel.innerHTML=`<span class="kicker">USERS</span><h2>使用者與資料管理</h2><p>每人的課堂筆記、練習、照片與錄音分開保存。已設密碼的使用者須解鎖才能進入。</p><label>目前使用者<select id="gcProfileSelect"></select></label><p id="gcPasswordNotice"></p><div class="gc-profile-row"><input id="gcProfileName" placeholder="新增使用者名稱" maxlength="40" aria-label="新增使用者名稱"><button type="button" id="gcProfileAdd">新增使用者</button><button type="button" id="gcProfileLock">離開並鎖定</button></div><details><summary>設定或變更使用者密碼</summary><p>只設定目前使用者的密碼；切換進入與清除此人的資料時使用。初次設定前，紀錄尚未受密碼保護。</p><input id="gcOldPassword" type="password" autocomplete="current-password" placeholder="目前密碼／原有使用者的舊清除密碼" aria-label="目前使用者密碼"><input id="gcNewPassword" type="password" autocomplete="new-password" maxlength="128" placeholder="新密碼，至少 8 字元" aria-label="新使用者密碼"><input id="gcConfirmPassword" type="password" autocomplete="new-password" maxlength="128" placeholder="再次輸入新密碼" aria-label="確認新使用者密碼"><button type="button" id="gcPasswordSave">儲存使用者密碼</button></details><details id="gcResetDetails"><summary>清除目前使用者資料</summary><p>不可復原。包含此人的筆記、練習、草稿、照片及錄音；請先以 PNG／PDF 匯出課堂筆記，再用本頁備份保存練習與附件。</p><input id="gcClearPassword" type="password" autocomplete="current-password" placeholder="輸入目前使用者密碼" aria-label="清除資料密碼"><button type="button" data-gc-clear="current">清除目前使用者資料</button><p>其他使用者、名單與密碼保留；沒有清除全部人的功能。</p></details><p>本機密碼僅保護一般網站操作；資料未加密，無法阻止持有裝置的人從瀏覽器設定清除網站資料。這不是伺服器帳號權限。</p><p id="gcProfileStatus" role="status"></p>`;
    host.appendChild(panel);const select=panel.querySelector('#gcProfileSelect');profiles.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.appendChild(o)});select.value=current;
    const notice=()=>{panel.querySelector('#gcPasswordNotice').textContent=lockRecord()?'此使用者已設定獨立密碼；離開平板前請鎖定。':'此使用者尚未設定密碼，請先設定自己的獨立密碼。'};notice();
    select.onchange=async()=>{try{await switchTo(select.value)}catch(e){status(e.message)}finally{select.value=current}};
    panel.querySelector('#gcProfileAdd').onclick=async()=>{try{const p=create(panel.querySelector('#gcProfileName').value);await switchTo(p.id)}catch(e){status(e.message)}};
    panel.querySelector('#gcProfileLock').onclick=async()=>{try{await lockCurrent()}catch(e){status(e.message)}};
    panel.querySelector('#gcPasswordSave').onclick=async()=>{const first=panel.querySelector('#gcNewPassword'),confirm=panel.querySelector('#gcConfirmPassword'),old=panel.querySelector('#gcOldPassword');try{if(first.value!==confirm.value)throw Error('兩次新密碼不相同');await setPassword(first.value,old.value);first.value=confirm.value=old.value='';notice();status('此使用者的獨立密碼已設定')}catch(e){status(e.message)}};
    const button=panel.querySelector('[data-gc-clear]');button.onclick=async()=>{const password=panel.querySelector('#gcClearPassword');try{if(!(await verify(password.value)))throw Error('請先設定此使用者密碼，並輸入正確密碼');if(!confirm('確定永久清除目前使用者的紀錄、照片與錄音？其他人資料會保留。'))return;button.disabled=true;await clearData('current',password.value)}catch(e){status(e.message)}finally{password.value='';button.disabled=false}};
    const top=document.querySelector('.topbar');if(top){const badge=document.createElement('button');badge.type='button';badge.className='gc-user-switch';badge.textContent='使用者：'+profiles.find(p=>p.id===current).name;badge.onclick=()=>{document.querySelector('.bottom-nav [data-route="progress"]')?.click();panel.scrollIntoView({block:'start',behavior:'smooth'})};top.insertAdjacentElement('afterend',badge)}
  }
  let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve});
  function bootGate(){
    let allowed;try{allowed=authorized()}catch(e){allowed=false}if(allowed){resolveReady();return}
    document.documentElement.classList.add('gc-profile-locked');const gate=document.createElement('section');gate.className='gc-profile-gate gc-profile-panel';gate.innerHTML='<h1>選擇使用者</h1><p>請先解鎖自己的紀錄。</p><label>使用者<select></select></label><button type="button" data-enter>進入使用者</button><div class="gc-profile-row"><input maxlength="40" placeholder="新增自己的使用者名稱"><button type="button" data-new>新增使用者</button></div><p role="status"></p>';document.body.appendChild(gate);const select=gate.querySelector('select'),message=gate.querySelector('[role="status"]');profiles.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.appendChild(o)});select.value=current;
    gate.querySelector('[data-enter]').onclick=async()=>{try{const id=select.value;if(lockRecord(id)&&!authorized(id)&&!(await askUnlock(id,true)))return;if(id!==current){native.setItem(ACTIVE,id);location.reload();return}gate.remove();document.documentElement.classList.remove('gc-profile-locked');resolveReady()}catch(e){message.textContent=e.message}};
    gate.querySelector('[data-new]').onclick=()=>{try{const p=create(gate.querySelector('input').value);native.setItem(ACTIVE,p.id);location.reload()}catch(e){message.textContent=e.message}};
  }
  window.gcProfiles={store,canRead,canWrite,physicalKey:key=>prefix(current)+key,dbName:dbName(current),ready,mount,switchTo,create,setPassword,verify,unlock,lockCurrent,clearData,get resetting(){return resetting},openReset(){document.querySelector('.bottom-nav [data-route="progress"]')?.click();const d=document.getElementById('gcResetDetails');if(d){d.open=true;d.scrollIntoView({block:'center',behavior:'smooth'})}}};
  bootGate();
})();
