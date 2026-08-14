import { state } from '../state.js';
import { sb } from '../services/supabase.js';
import { getHomeOrder, getTaskOrder, moveHomeItem, moveTaskItem, SUB_LABELS } from '../personalization.js';

export function renderSettings(){
  const view=document.getElementById('settingsView'); if(!view) return;
  const avatarUrl=state.session?.user?.user_metadata?.avatar_url||'';
  const email=state.session?.user?.email||'';
  const name=state.session?.user?.user_metadata?.name||email.split('@')[0]||'Пользователь';
  view.innerHTML=`<div class="screen-stack">
    <div class="settings-profile"><div class="settings-avatar">${avatarUrl?`<img src="${avatarUrl}" alt="">`:`<span style="font-size:16px;font-weight:800;color:var(--gesso-fg-muted)">${name.slice(0,1).toUpperCase()}</span>`}</div><div style="min-width:0"><div class="settings-name">${name}</div><div class="settings-email">${email}</div></div></div>

    <section class="settings-block"><div class="settings-kicker">Аватарка</div><input class="input-line" id="avatarUrlInput" placeholder="Ссылка на фото" value="${avatarUrl}"><button class="primary-pill" style="width:100%;margin-top:10px" onclick="saveAvatar()">Сохранить</button></section>

    <section class="settings-block"><div class="settings-kicker">Персонализация</div><div class="settings-row"><span>Домой</span><div></div></div>${getHomeOrder().map((s,i,arr)=>`<div class="settings-row"><span>${SUB_LABELS[s]}</span><div class="reorder-buttons"><button class="circle-mini" onclick="moveHomeItem('${s}',-1)" ${i===0?'disabled':''}>↑</button><button class="circle-mini" onclick="moveHomeItem('${s}',1)" ${i===arr.length-1?'disabled':''}>↓</button></div></div>`).join('')}<div class="settings-row"><span>Задания</span><div></div></div>${getTaskOrder().map((s,i,arr)=>`<div class="settings-row"><span>${SUB_LABELS[s]}</span><div class="reorder-buttons"><button class="circle-mini" onclick="moveTaskItem('${s}',-1)" ${i===0?'disabled':''}>↑</button><button class="circle-mini" onclick="moveTaskItem('${s}',1)" ${i===arr.length-1?'disabled':''}>↓</button></div></div>`).join('')}</section>

    <section class="settings-block"><div class="settings-kicker">Язык</div><div class="lang-row"><button class="lang-pill ${state.lang==='ru'?'active':''}" onclick="setAppLang('ru')">Русский</button><button class="lang-pill ${state.lang==='en'?'active':''}" onclick="setAppLang('en')">English</button></div></section>

    <section class="settings-block"><div class="settings-kicker">Аккаунт</div><input class="input-line" id="newEmailInput" placeholder="Новая почта"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changeEmail()">Сменить почту</button><input class="input-line" id="newPasswordInput" type="password" placeholder="Новый пароль" style="margin-top:9px"><button class="primary-pill" style="width:100%;margin-top:9px" onclick="changePassword()">Сменить пароль</button><div class="meta-small" id="accountMsg" style="margin-top:8px"></div><button class="secondary-pill" style="width:100%;margin-top:9px" onclick="logout()">Выйти из аккаунта</button><button class="secondary-pill" style="width:100%;margin-top:6px;color:var(--gesso-error)" onclick="confirmDeleteAccount()">Удалить данные</button></section>
  </div>`;
}

export async function saveAvatar(){ const url=document.getElementById('avatarUrlInput')?.value.trim()||''; const {data,error}=await sb.auth.updateUser({data:{avatar_url:url}}); if(!error&&data.user) state.session.user=data.user; renderSettings(); if(window.renderDashboard) window.renderDashboard(); }
export function setAppLang(lang){ state.lang=lang; localStorage.setItem('lang',lang); renderSettings(); }
export async function changeEmail(){ const email=document.getElementById('newEmailInput')?.value.trim(); const msg=document.getElementById('accountMsg'); if(!email){msg.textContent='Введите новую почту';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({email}); msg.textContent=error?'Ошибка: '+error.message:'Проверь новую почту — придёт письмо.'; }
export async function changePassword(){ const password=document.getElementById('newPasswordInput')?.value||''; const msg=document.getElementById('accountMsg'); if(password.length<6){msg.textContent='Пароль минимум 6 символов';return;} msg.textContent='Обновляю…'; const {error}=await sb.auth.updateUser({password}); msg.textContent=error?'Ошибка: '+error.message:'Пароль обновлён.'; }
export async function logout(){ await sb.auth.signOut(); }
export function confirmDeleteAccount(){ if(confirm('Удалить все данные приложения?')) eraseMyData(); }
export async function eraseMyData(){ const uid=state.session?.user?.id; if(!uid) return; await sb.from('compass_entries').delete().eq('user_id',uid); await sb.from('entries').delete().eq('user_id',uid); await sb.from('compass').delete().eq('user_id',uid); await sb.auth.signOut(); }
