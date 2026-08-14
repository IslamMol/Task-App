import { state } from '../state.js';
import { sb } from '../services/supabase.js';
import { getHomeOrder, getTaskOrder, getCalendarOrder, moveHomeItem, moveTaskItem, moveCalendarItem, SUB_LABELS, HOME_LABELS, CALENDAR_LABELS } from '../personalization.js';
import { setTheme } from '../theme.js';

const currencyOptions=['KZT ₸','USD $','EUR €','GBP £','RUB ₽','UAH ₴','CNY ¥','Custom'];
const themeOptions=[['light','Светлая'],['dark','Тёмная']];
function getCurrency(){ return localStorage.getItem('currency') || 'KZT ₸'; }
export function setCurrency(v){ localStorage.setItem('currency',v); renderSettings(); window.renderDashboard?.(); window.renderFinancePage?.(); }
export function getCurrencySymbol(){ const v=getCurrency(); if(v==='Custom') return localStorage.getItem('customCurrency')||'¤'; return v.split(' ')[1]||v; }
export function setCustomCurrency(v){ localStorage.setItem('customCurrency',(v||'¤').trim().slice(0,6)); renderSettings(); window.renderDashboard?.(); }

function avatarInitial(){ const name=state.session?.user?.user_metadata?.name||state.session?.user?.email?.split('@')[0]||'П'; return name.slice(0,1).toUpperCase(); }
function avatarKey(){ return `avatar:${state.session?.user?.id||'guest'}`; }
export function getLocalAvatar(){ return localStorage.getItem(avatarKey())||''; }
function presetAvatar(label,bg){ return `<button class="avatar-preset" onclick="window.usePresetAvatar('${bg}','${label}')" aria-label="Аватар ${label}"><span style="background:${bg}">${label}</span></button>`; }
export function usePresetAvatar(bg,label){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/><circle cx="60" cy="47" r="21" fill="white" opacity=".92"/><path d="M24 108c6-24 20-36 36-36s30 12 36 36" fill="white" opacity=".92"/></svg>`;
  localStorage.setItem(avatarKey(),`data:image/svg+xml;base64,${btoa(svg)}`); renderSettings(); window.renderDashboard?.();
}
export async function handleAvatarUpload(input){
  const file=input?.files?.[0]; if(!file||!file.type.startsWith('image/')) return;
  const url=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
  const size=512, c=document.createElement('canvas'); c.width=size; c.height=size;
  const ctx=c.getContext('2d');
  const scale=Math.max(size/img.width,size/img.height); const dw=img.width*scale, dh=img.height*scale;
  ctx.drawImage(img,(size-dw)/2,(size-dh)/2,dw,dh);
  localStorage.setItem(avatarKey(),c.toDataURL('image/jpeg',0.86)); renderSettings(); window.renderDashboard?.();
}
export async function saveAvatar(){ }

function renderThemeToggle(theme){
  return `<div class="theme-segment" id="themeToggle" aria-label="Выбор темы">${themeOptions.map(([key,label])=>`<button type="button" data-theme-choice="${key}" class="theme-choice ${theme===key?'active':''}" onclick="setTheme('${key}')"><span class="theme-icon">${key==='light'?'☀':'◐'}</span><span>${label}</span></button>`).join('')}</div>`;
}
const ORDER_UI_STYLE = `
<style id="apple-order-controls">
.reorder-inline-actions{display:flex;align-items:center;gap:6px;margin-left:auto;}
.apple-step-btn{width:32px;height:32px;border:0;border-radius:999px;background:rgba(118,118,128,.12);color:#4b5a8c;display:flex;align-items:center;justify-content:center;padding:0;flex:0 0 32px;-webkit-tap-highlight-color:transparent;transition:transform 120ms ease,background 160ms ease,color 160ms ease,opacity 160ms ease;}
.apple-step-btn svg{width:17px;height:17px;display:block;}
.apple-step-btn:not(:disabled):active{transform:scale(.92);background:rgba(75,90,140,.18);}
.apple-step-btn:not(:disabled):hover{background:rgba(75,90,140,.15);}
.apple-step-btn:disabled{opacity:.28;cursor:default;}
.apple-step-btn:focus-visible{outline:2px solid rgba(75,90,140,.28);outline-offset:2px;}
</style>`;
function renderOrderRows(container,order,type,labels){
  if(!container) return;
  container.innerHTML = order.map((key, idx) => `
    <div class="settings-row reorder-row" data-order-type="${type}" data-order-key="${key}">
      <button class="reorder-main reorder-open" type="button" data-open-reorder="${type}" data-reorder-key="${key}" aria-label="Изменить порядок">
        <span class="drag-grip">⠿</span><span>${labels[key] || key}</span>
      </button>
      <div class="reorder-inline-actions">
        <button type="button" class="reorder-step apple-step-btn" data-step="-1" data-type="${type}" data-key="${key}" ${idx===0?'disabled':''} aria-label="Выше"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 14.5 5.5-5.5 5.5 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg></button>
        <button type="button" class="reorder-step apple-step-btn" data-step="1" data-type="${type}" data-key="${key}" ${idx===order.length-1?'disabled':''} aria-label="Ниже"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 9.5 5.5 5.5 5.5-5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg></button>
      </div>
    </div>`).join('');

  container.querySelectorAll('[data-open-reorder]').forEach(btn=>btn.addEventListener('click',()=>openReorderMenu(btn.dataset.openReorder,btn.dataset.reorderKey)));
  container.querySelectorAll('.reorder-step').forEach(btn=>btn.addEventListener('click',()=>{
    const type=btn.dataset.type, key=btn.dataset.key, dir=Number(btn.dataset.step);
    moveReorderByDirection(type,key,dir);
  }));
}

export function renderSettings(){
  const view=document.getElementById('settingsView'); if(!view)return;
  if(!document.getElementById('apple-order-controls')) document.head.insertAdjacentHTML('beforeend', ORDER_UI_STYLE);
  const email=state.session?.user?.email||''; const name=state.session?.user?.user_metadata?.name||email.split('@')[0]||'Пользователь';
  const avatar=getLocalAvatar(); const theme=document.documentElement.getAttribute('data-theme')||'light'; const currency=getCurrency();
  view.innerHTML=`<div class="screen-stack settings-stack">
    <div class="settings-profile"><div class="settings-avatar">${avatar?`<img src="${avatar}" alt="">`:`<span>${avatarInitial()}</span>`}</div><div style="min-width:0"><div class="settings-name">${name}</div><div class="settings-email">${email}</div></div></div>
    <section class="settings-block"><div class="settings-kicker">Аватарка</div><div class="avatar-editor-pro"><label class="avatar-upload-pro"><input type="file" accept="image/*" onchange="handleAvatarUpload(this)"><span class="settings-icon-circle">＋</span><span>Загрузить фото</span></label><div class="avatar-presets">${presetAvatar('1','#5f6f9f')}${presetAvatar('2','#7f8a74')}${presetAvatar('3','#b97c61')}${presetAvatar('4','#8b6f96')}</div></div><div class="settings-caption" style="margin-top:8px">Фото автоматически обрезается по кругу, без пустых полей.</div></section>
    <section class="settings-block"><div class="settings-kicker">Внешний вид</div><div class="settings-mainline" style="margin-bottom:9px">Тема</div>${renderThemeToggle(theme)}</section>
    <section class="settings-block"><div class="settings-kicker">Порядок интерфейса</div><div class="settings-section-label">Главная</div><div data-order="home"></div><div class="settings-section-label">Задачи</div><div data-order="task"></div><div class="settings-section-label">Календарь</div><div data-order="calendar"></div><div class="settings-caption" style="margin-top:8px">Открой пункт и выбери его позицию. Кнопки ↑/↓ работают на телефоне без drag-and-drop.</div></section>
    <section class="settings-block"><div class="settings-kicker">Валюта</div><div class="currency-grid">${currencyOptions.map(v=>`<button class="currency-chip ${currency===v?'active':''}" onclick="setCurrency('${v}')">${v}</button>`).join('')}</div>${currency==='Custom'?`<input class="input-line" style="margin-top:9px" placeholder="Например USD или ₸" value="${localStorage.getItem('customCurrency')||''}" oninput="setCustomCurrency(this.value)">`:''}<div class="settings-caption" style="margin-top:8px">Финансовую таблицу можно подключить позже, а валюта уже используется в интерфейсе.</div></section>
    <section class="settings-block"><div class="settings-kicker">Язык</div><div class="lang-row"><button class="lang-pill ${state.lang==='ru'?'active':''}" onclick="setAppLang('ru')">Русский</button><button class="lang-pill ${state.lang==='en'?'active':''}" onclick="setAppLang('en')">English</button></div></section>
    <section class="settings-block"><div class="settings-kicker">Аккаунт</div><input class="input-line" id="newEmailInput" placeholder="Новая почта"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changeEmail()">Сменить почту</button><input class="input-line" id="newPasswordInput" type="password" placeholder="Новый пароль" style="margin-top:9px"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changePassword()">Сменить пароль</button><div class="meta-small" id="accountMsg" style="margin-top:8px"></div><button class="secondary-pill" style="width:100%;margin-top:9px" onclick="logout()">Выйти из аккаунта</button><button class="secondary-pill danger" style="width:100%;margin-top:6px" onclick="confirmDeleteAccount()">Удалить данные</button></section>
  </div>`;
  queueMicrotask(()=>{
    renderOrderRows(view.querySelector('[data-order="home"]'),getHomeOrder(),'home',HOME_LABELS);
    renderOrderRows(view.querySelector('[data-order="task"]'),getTaskOrder(),'task',SUB_LABELS);
    renderOrderRows(view.querySelector('[data-order="calendar"]'),getCalendarOrder(),'calendar',CALENDAR_LABELS);
  });
}

function moveReorderByDirection(type,key,dir){
  const moved = type==='home'?moveHomeItem(key,dir):type==='task'?moveTaskItem(key,dir):moveCalendarItem(key,dir);
  if(!moved) return;
  renderSettings();
  if(type==='home') window.renderDashboard?.();
  else if(type==='task') window.renderTasksPage?.();
  else window.renderCalendar?.();
}

export function openReorderMenu(type,key){
  const options=type==='home'?getHomeOrder():type==='task'?getTaskOrder():getCalendarOrder();
  const labels=type==='home'?HOME_LABELS:type==='task'?SUB_LABELS:CALENDAR_LABELS;
  const i=options.indexOf(key);
  const modal=document.createElement('div'); modal.className='modal-bg reorder-bg'; modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
  modal.innerHTML=`<div class="modal apple-sheet"><div class="modal-handle"></div><div class="sheet-title-row"><div><div class="meta-small">Порядок</div><h2>${labels[key]||key}</h2></div><button class="sheet-close" type="button" aria-label="Закрыть">×</button></div><div class="apple-action-list">${options.map((k,idx)=>`<button type="button" class="apple-action-row ${k===key?'selected':''}" data-target-index="${idx}"><span class="row-number">${idx+1}</span><span>${labels[k]||k}</span>${k===key?'<span class="apple-check">✓</span>':''}</button>`).join('')}</div><button class="apple-cancel" type="button">Отмена</button></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.sheet-close')?.addEventListener('click',()=>modal.remove());
  modal.querySelector('.apple-cancel')?.addEventListener('click',()=>modal.remove());
  modal.querySelectorAll('[data-target-index]').forEach(btn=>btn.addEventListener('click',()=>{
    const targetIndex=Number(btn.dataset.targetIndex);
    if(targetIndex!==i) moveReorderItem(type,key,targetIndex); else modal.remove();
  }));
}

export function moveReorderItem(type,key,targetIndex){
  const options=type==='home'?getHomeOrder():type==='task'?getTaskOrder():getCalendarOrder();
  const next=[...options], from=next.indexOf(key);
  if(from<0||targetIndex<0||targetIndex>=next.length||from===targetIndex)return;
  next.splice(from,1); next.splice(targetIndex,0,key);
  if(type==='home') setHomeOrder(next); else if(type==='task') setTaskOrder(next); else setCalendarOrder(next);
  document.querySelector('.reorder-bg')?.remove();
  renderSettings();
  if(type==='home') window.renderDashboard?.();
  else if(type==='task') window.renderTasksPage?.();
  else window.renderCalendar?.();
}

export function setAppLang(lang){ state.lang=lang; localStorage.setItem('lang',lang); renderSettings(); }
export async function changeEmail(){ const email=document.getElementById('newEmailInput')?.value.trim(); const msg=document.getElementById('accountMsg'); if(!email){msg.textContent='Введите новую почту';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({email}); msg.textContent=error?'Ошибка: '+error.message:'Проверь новую почту — придёт письмо.'; }
export async function changePassword(){ const password=document.getElementById('newPasswordInput')?.value||''; const msg=document.getElementById('accountMsg'); if(password.length<6){msg.textContent='Пароль минимум 6 символов';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({password}); msg.textContent=error?'Ошибка: '+error.message:'Пароль обновлён.'; }
export async function logout(){ await sb.auth.signOut(); }
export function confirmDeleteAccount(){ if(confirm('Удалить все данные приложения?')) eraseMyData(); }
export async function eraseMyData(){ const uid=state.session?.user?.id; if(!uid)return; await sb.from('compass_entries').delete().eq('user_id',uid); await sb.from('entries').delete().eq('user_id',uid); await sb.from('compass').delete().eq('user_id',uid); await sb.auth.signOut(); }
