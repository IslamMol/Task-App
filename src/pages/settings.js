import { state } from '../state.js';
import { sb } from '../services/supabase.js';
import { getHomeOrder, getTaskOrder, getCalendarOrder, SUB_LABELS, HOME_LABELS, CALENDAR_LABELS } from '../personalization.js';
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
function renderOrderRows(container,order,type,labels){
  if(!container)return;
  container.innerHTML=order.map((key,idx)=>{
    const upDisabled=idx===0?'disabled':'';
    const downDisabled=idx===order.length-1?'disabled':'';
    return `<div class="settings-row reorder-row" data-order-type="${type}" data-order-key="${key}">
      <button class="reorder-main reorder-open" type="button" onclick="openReorderMenu('${type}','${key}')" aria-label="Открыть настройки порядка">
        <span class="drag-grip" aria-hidden="true">⠿</span><span>${labels[key]}</span>
      </button>
      <div class="reorder-stepper" aria-label="Порядок">
        <button type="button" class="reorder-step" ${upDisabled} onclick="moveReorderBy('${type}','${key}',-1,event)" aria-label="Переместить выше">⌃</button>
        <button type="button" class="reorder-step" ${downDisabled} onclick="moveReorderBy('${type}','${key}',1,event)" aria-label="Переместить ниже">⌄</button>
      </div>
    </div>`;
  }).join('');
}

export function renderSettings(){
  const view=document.getElementById('settingsView'); if(!view)return;
  const email=state.session?.user?.email||''; const name=state.session?.user?.user_metadata?.name||email.split('@')[0]||'Пользователь';
  const avatar=getLocalAvatar(); const theme=document.documentElement.getAttribute('data-theme')||'light'; const currency=getCurrency();
  view.innerHTML=`<div class="screen-stack settings-stack">
    <div class="settings-profile"><div class="settings-avatar">${avatar?`<img src="${avatar}" alt="">`:`<span>${avatarInitial()}</span>`}</div><div style="min-width:0"><div class="settings-name">${name}</div><div class="settings-email">${email}</div></div></div>

    <section class="settings-block"><div class="settings-kicker">Аватарка</div><div class="avatar-editor-pro"><label class="avatar-upload-pro"><input type="file" accept="image/*" onchange="handleAvatarUpload(this)"><span class="settings-icon-circle">＋</span><span>Загрузить фото</span></label><div class="avatar-presets">${presetAvatar('1','#5f6f9f')}${presetAvatar('2','#7f8a74')}${presetAvatar('3','#b97c61')}${presetAvatar('4','#8b6f96')}</div></div><div class="settings-caption" style="margin-top:8px">Фото автоматически обрезается по кругу, без пустых полей.</div></section>

    <section class="settings-block"><div class="settings-kicker">Внешний вид</div><div class="settings-mainline" style="margin-bottom:9px">Тема</div>${renderThemeToggle(theme)}</section>

    <section class="settings-block"><div class="settings-kicker">Порядок интерфейса</div><div class="settings-section-label">Главная</div><div data-order="home"></div><div class="settings-section-label">Задачи</div><div data-order="task"></div><div class="settings-section-label">Календарь</div><div data-order="calendar"></div><div class="settings-caption" style="margin-top:8px">Нажми строку, чтобы открыть красивое меню перестановки. На компьютере можно также перетащить её за ⠿.</div></section>

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

export function openReorderMenu(type,key){
  const options=type==='home'?getHomeOrder():type==='task'?getTaskOrder():getCalendarOrder();
  const labels=type==='calendar'?CALENDAR_LABELS:SUB_LABELS; const i=options.indexOf(key);
  const modal=document.createElement('div'); modal.className='modal-bg reorder-bg'; modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.innerHTML=`<div class="modal apple-sheet"><div class="modal-handle"></div><div class="sheet-title-row"><div><div class="meta-small">Порядок</div><h2>${labels[key]}</h2></div><button class="sheet-close" onclick="this.closest('.modal-bg').remove()">×</button></div><div class="apple-action-list">${options.map((k,idx)=>`<button class="apple-action-row ${k===key?'selected':''}" onclick="${idx===i?'':`moveReorderItem('${type}','${key}',${idx})`};${idx===i?'':`this.closest('.modal-bg').remove()`}"><span class="row-number">${idx+1}</span><span>${labels[k]}</span>${k===key?'<span class="apple-check">✓</span>':''}</button>`).join('')}</div><button class="apple-cancel" onclick="this.closest('.modal-bg').remove()">Отмена</button></div>`;
  document.body.appendChild(modal);
}
export function moveReorderItem(type,key,targetIndex){
  const options=type==='home'?getHomeOrder():type==='task'?getTaskOrder():getCalendarOrder();
  const next=[...options];
  const from=next.indexOf(key);
  if(from<0||targetIndex<0||targetIndex>=next.length||from===targetIndex)return;
  next.splice(from,1); next.splice(targetIndex,0,key);
  if(type==='home') setHomeOrder(next);
  else if(type==='task') setTaskOrder(next);
  else setCalendarOrder(next);
  document.querySelector('.reorder-bg')?.remove();
}

export function moveReorderBy(type,key,delta,event){
  event?.preventDefault?.(); event?.stopPropagation?.();
  const options=type==='home'?getHomeOrder():type==='task'?getTaskOrder():getCalendarOrder();
  const index=options.indexOf(key); const target=index+delta;
  if(target<0 || target>=options.length) return;
  moveReorderItem(type,key,target);
}

export function setAppLang(lang){ state.lang=lang; localStorage.setItem('lang',lang); renderSettings(); }
export async function changeEmail(){ const email=document.getElementById('newEmailInput')?.value.trim(); const msg=document.getElementById('accountMsg'); if(!email){msg.textContent='Введите новую почту';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({email}); msg.textContent=error?'Ошибка: '+error.message:'Проверь новую почту — придёт письмо.'; }
export async function changePassword(){ const password=document.getElementById('newPasswordInput')?.value||''; const msg=document.getElementById('accountMsg'); if(password.length<6){msg.textContent='Пароль минимум 6 символов';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({password}); msg.textContent=error?'Ошибка: '+error.message:'Пароль обновлён.'; }
export async function logout(){ await sb.auth.signOut(); }
export function confirmDeleteAccount(){ if(confirm('Удалить все данные приложения?')) eraseMyData(); }
export async function eraseMyData(){ const uid=state.session?.user?.id; if(!uid)return; await sb.from('compass_entries').delete().eq('user_id',uid); await sb.from('entries').delete().eq('user_id',uid); await sb.from('compass').delete().eq('user_id',uid); await sb.auth.signOut(); }
