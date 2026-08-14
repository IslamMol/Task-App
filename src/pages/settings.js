import { state } from '../state.js';
import { sb } from '../services/supabase.js';
import { getHomeOrder, getTaskOrder, SUB_LABELS } from '../personalization.js';
import { toggleTheme } from '../theme.js';

const currencyOptions=['KZT ₸','RUB ₽','USD $','EUR €','GBP £','UAH ₴','CNY ¥','Custom'];
function getCurrency(){ return localStorage.getItem('currency') || 'KZT ₸'; }
export function setCurrency(v){ localStorage.setItem('currency',v); renderSettings(); window.renderDashboard?.(); window.renderFinancePage?.(); }
export function getCurrencySymbol(){
  const v=getCurrency();
  if(v==='Custom') return localStorage.getItem('customCurrency') || '¤';
  return v.split(' ')[1] || v;
}
export function setCustomCurrency(v){ localStorage.setItem('customCurrency',(v||'¤').trim().slice(0,5)); renderSettings(); window.renderDashboard?.(); }

function avatarInitial(){
  const name=state.session?.user?.user_metadata?.name || state.session?.user?.email?.split('@')[0] || 'П';
  return name.slice(0,1).toUpperCase();
}
function avatarKey(){ return `avatar:${state.session?.user?.id||'guest'}`; }
export function getLocalAvatar(){ return localStorage.getItem(avatarKey()) || ''; }
function presetAvatar(label, bg){ return `<button class="avatar-preset" onclick="window.usePresetAvatar('${bg}','${label}')"><span style="background:${bg}">${label}</span></button>`; }
export function usePresetAvatar(bg,label){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${bg}"/><circle cx="60" cy="47" r="21" fill="white" opacity=".92"/><path d="M24 104c6-22 20-32 36-32s30 10 36 32" fill="white" opacity=".92"/></svg>`;
  localStorage.setItem(avatarKey(),`data:image/svg+xml;base64,${btoa(svg)}`); renderSettings(); window.renderDashboard?.();
}
export async function handleAvatarUpload(input){
  const file=input?.files?.[0]; if(!file || !file.type.startsWith('image/')) return;
  const url=await new Promise((resolve,reject)=>{ const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(file); });
  const img=await new Promise((resolve,reject)=>{ const i=new Image(); i.onload=()=>resolve(i); i.onerror=reject; i.src=url; });
  const max=320; const scale=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
  c.getContext('2d').drawImage(img,0,0,c.width,c.height); const compressed=c.toDataURL('image/jpeg',0.82);
  localStorage.setItem(avatarKey(),compressed); renderSettings(); window.renderDashboard?.();
}
export async function saveAvatar(){ /* compatibility with old button */ }

export function renderSettings(){
  const view=document.getElementById('settingsView'); if(!view) return;
  const email=state.session?.user?.email||'';
  const name=state.session?.user?.user_metadata?.name||email.split('@')[0]||'Пользователь';
  const avatar=getLocalAvatar(); const theme=document.documentElement.getAttribute('data-theme')||'light'; const currency=getCurrency();
  view.innerHTML=`<div class="screen-stack settings-stack">
    <div class="settings-profile"><div class="settings-avatar">${avatar?`<img src="${avatar}" alt="">`:`<span>${avatarInitial()}</span>`}</div><div style="min-width:0"><div class="settings-name">${name}</div><div class="settings-email">${email}</div></div></div>

    <section class="settings-block"><div class="settings-kicker">Аватарка</div><div class="avatar-editor"><label class="avatar-upload"><input type="file" accept="image/*" onchange="handleAvatarUpload(this)"><span>Загрузить фото</span></label><div class="avatar-presets">${presetAvatar('1','#5f6f9f')}${presetAvatar('2','#7f8a74')}${presetAvatar('3','#b97c61')}${presetAvatar('4','#8b6f96')}</div></div><div class="meta-small" style="margin-top:8px">Файл хранится локально на устройстве. Позже можно подключить Supabase Storage.</div></section>

    <section class="settings-block"><div class="settings-kicker">Внешний вид</div><div class="theme-row"><div><div class="settings-mainline">Тема</div><div class="settings-caption">Светлая или тёмная</div></div><button id="themeToggle" class="ios-switch ${theme==='dark'?'on':''}" aria-pressed="${theme==='dark'}" onclick="toggleTheme()"><span></span><span class="theme-label">${theme==='dark'?'Тёмная':'Светлая'}</span></button></div></section>

    <section class="settings-block"><div class="settings-kicker">Персонализация</div><div class="settings-section-label">Домой</div><div data-order="home"></div><div class="settings-section-label">Задания</div><div data-order="task"></div><div class="meta-small" style="margin-top:8px">Перетаскивай строки за значок ⠿, чтобы изменить порядок.</div></section>

    <section class="settings-block"><div class="settings-kicker">Валюта</div><div class="currency-grid">${currencyOptions.map(v=>`<button class="currency-chip ${currency===v?'active':''}" onclick="setCurrency('${v}')">${v}</button>`).join('')}</div>${currency==='Custom'?`<input class="input-line" style="margin-top:9px" placeholder="Символ или код" value="${localStorage.getItem('customCurrency')||''}" oninput="setCustomCurrency(this.value)">`:''}<div class="settings-caption" style="margin-top:8px">Используется в блоке финансов. Сохранение операций подключим позже.</div></section>

    <section class="settings-block"><div class="settings-kicker">Язык</div><div class="lang-row"><button class="lang-pill ${state.lang==='ru'?'active':''}" onclick="setAppLang('ru')">Русский</button><button class="lang-pill ${state.lang==='en'?'active':''}" onclick="setAppLang('en')">English</button></div></section>

    <section class="settings-block"><div class="settings-kicker">Аккаунт</div><input class="input-line" id="newEmailInput" placeholder="Новая почта"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changeEmail()">Сменить почту</button><input class="input-line" id="newPasswordInput" type="password" placeholder="Новый пароль" style="margin-top:9px"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changePassword()">Сменить пароль</button><div class="meta-small" id="accountMsg" style="margin-top:8px"></div><button class="secondary-pill" style="width:100%;margin-top:9px" onclick="logout()">Выйти из аккаунта</button><button class="secondary-pill danger" style="width:100%;margin-top:6px" onclick="confirmDeleteAccount()">Удалить данные</button></section>
  </div>`;
  window.requestAnimationFrame(()=>{
    const home=view.querySelector('[data-order="home"]'); const task=view.querySelector('[data-order="task"]');
    renderOrderRows(home,getHomeOrder(),'home'); renderOrderRows(task,getTaskOrder(),'task');
  });
}
function renderOrderRows(container,order,type){
  if(!container) return;
  const labels=SUB_LABELS;
  container.innerHTML=order.map((s,i)=>{
    const first=i===0,last=i===order.length-1;
    const up=type==='home'?`moveHomeItem('${s}',-1)`:`moveTaskItem('${s}',-1)`;
    const down=type==='home'?`moveHomeItem('${s}',1)`:`moveTaskItem('${s}',1)`;
    return `<div class="settings-row reorder-row" data-reorder-type="${type}" data-reorder-key="${s}" draggable="true" ondragstart="startReorder(event,'${type}','${s}')" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="finishReorder(event,'${type}','${s}')">
      <div class="reorder-main">
        <button type="button" class="drag-handle" aria-label="Перетащить" title="Перетащить">⠿</button>
        <span>${labels[s]}</span>
      </div>
      <div class="reorder-actions">
        <button type="button" class="reorder-arrow" ${first?'disabled':''} onclick="${up}" aria-label="Переместить выше">▲</button>
        <button type="button" class="reorder-arrow" ${last?'disabled':''} onclick="${down}" aria-label="Переместить ниже">▼</button>
        <button type="button" class="row-chevron" onclick="openReorderMenu('${type}','${s}')" aria-label="Открыть порядок">›</button>
      </div>
    </div>`;
  }).join('');
  if(!document.getElementById('reorder-safe-style')){
    const st=document.createElement('style'); st.id='reorder-safe-style'; st.textContent=`
      .reorder-row{display:flex;align-items:center;justify-content:space-between;gap:10px;touch-action:none}
      .drag-handle{width:30px;height:30px;border:0;border-radius:10px;background:var(--gesso-surface-recessed);color:var(--gesso-fg-muted);font-size:18px;cursor:grab;touch-action:none}
      .reorder-actions{display:flex;align-items:center;gap:4px}
      .reorder-arrow{width:30px;height:30px;border:0;border-radius:10px;background:var(--gesso-surface-recessed);color:var(--gesso-fg-muted);font-size:12px}
      .reorder-arrow:not(:disabled):active{transform:scale(.94);color:var(--gesso-accent)}
      .reorder-arrow:disabled{opacity:.28}
      .reorder-row.drag-over{background:rgba(75,90,140,.08);border-radius:14px}
      .reorder-row.dragging{opacity:.6}
    `; document.head.appendChild(st);
  }
  container.querySelectorAll('.drag-handle').forEach(handle=>{
    handle.addEventListener('pointerdown',e=>startPointer(e, type, handle.closest('.reorder-row')));
  });
}
function startPointer(e,type,row){
  const key=row.dataset.reorderKey;
  let moved=false;
  row.classList.add('dragging');
  try{row.setPointerCapture(e.pointerId)}catch{}
  const move=ev=>{
    if(Math.abs(ev.clientY-e.clientY)>4)moved=true;
    document.querySelectorAll('.reorder-row.drag-over').forEach(x=>x.classList.remove('drag-over'));
    const target=document.elementsFromPoint(ev.clientX,ev.clientY).map(x=>x.closest?.('.reorder-row')).find(x=>x&&x!==row);
    if(target&&target.dataset.reorderType===type)target.classList.add('drag-over');
  };
  const up=ev=>{
    row.classList.remove('dragging');
    const target=document.elementsFromPoint(ev.clientX,ev.clientY).map(x=>x.closest?.('.reorder-row')).find(x=>x&&x!==row);
    document.querySelectorAll('.reorder-row.drag-over').forEach(x=>x.classList.remove('drag-over'));
    if(moved&&target&&target.dataset.reorderType===type){
      const from=row.dataset.reorderKey,to=target.dataset.reorderKey;
      type==='home'?dropHomeItem(from,to):dropTaskItem(from,to);
    }
    row.removeEventListener('pointermove',move); row.removeEventListener('pointerup',up); row.removeEventListener('pointercancel',up);
  };
  row.addEventListener('pointermove',move); row.addEventListener('pointerup',up); row.addEventListener('pointercancel',up);
}


export function openReorderMenu(type,key){
  const options=type==='home'?getHomeOrder():getTaskOrder(); const i=options.indexOf(key);
  const modal=document.createElement('div'); modal.className='modal-bg'; modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><h2>Порядок</h2><div class="reorder-menu"><button ${i<=0?'disabled':''} onclick="${type==='home'?`moveHomeItem('${key}',-1)`: `moveTaskItem('${key}',-1)`};this.closest('.modal-bg').remove()">Переместить выше</button><button ${i>=options.length-1?'disabled':''} onclick="${type==='home'?`moveHomeItem('${key}',1)`: `moveTaskItem('${key}',1)`};this.closest('.modal-bg').remove()">Переместить ниже</button><button onclick="this.closest('.modal-bg').remove()">Отмена</button></div></div>`;
  document.body.appendChild(modal);
}

export function setAppLang(lang){ state.lang=lang; localStorage.setItem('lang',lang); renderSettings(); }
export async function changeEmail(){ const email=document.getElementById('newEmailInput')?.value.trim(); const msg=document.getElementById('accountMsg'); if(!email){msg.textContent='Введите новую почту';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({email}); msg.textContent=error?'Ошибка: '+error.message:'Проверь новую почту — придёт письмо.'; }
export async function changePassword(){ const password=document.getElementById('newPasswordInput')?.value||''; const msg=document.getElementById('accountMsg'); if(password.length<6){msg.textContent='Пароль минимум 6 символов';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({password}); msg.textContent=error?'Ошибка: '+error.message:'Пароль обновлён.'; }
export async function logout(){ await sb.auth.signOut(); }
export function confirmDeleteAccount(){ if(confirm('Удалить все данные приложения?')) eraseMyData(); }
export async function eraseMyData(){ const uid=state.session?.user?.id; if(!uid) return; await sb.from('compass_entries').delete().eq('user_id',uid); await sb.from('entries').delete().eq('user_id',uid); await sb.from('compass').delete().eq('user_id',uid); await sb.auth.signOut(); }
