import { sb } from './services/supabase.js';
import { state } from './state.js';
import { TYPE_COLOR, CATEGORY_EMOJI, CONTAINER_ID } from './constants.js';
import { escapeHtml } from './utils/dom.js';
import { todayStr, yesterdayStr } from './utils/date.js';
import { renderStats } from './stats.js';
import { cacheEntries, removeEntryFromCache, readEntriesFromCache } from './db/indexeddb.js';
import { enqueue } from './db/sync.js';

export async function loadEntries(){
  try {
    const { data, error } = await sb.from('entries').select('*').order('created_at', {ascending:false});
    if(error) throw error;
    state.entries = data || [];
    if(state.entries.length){ cacheEntries(state.entries); }
  } catch (err) {
    // Нет сети (или Supabase недоступен) — показываем то, что успели
    // сохранить локально в прошлый раз, вместо пустого экрана.
    console.warn('Не удалось загрузить entries с сервера, читаю локальный кэш', err);
    state.entries = await readEntriesFromCache();
  }
}

export function categoryEmoji(cat){
  if(!cat) return '';
  const key = cat.trim().toLowerCase();
  return CATEGORY_EMOJI[key] ? CATEGORY_EMOJI[key] + ' ' : '🔖 ';
}

export function cardHtml(e){
  const color = TYPE_COLOR[e.type];
  if(e.type === 'book'){
    const pct = e.progress_total ? Math.round((e.progress_current/e.progress_total)*100) : 0;
    const goal = e.goal_id ? state.compassItems.find(c=>c.id===e.goal_id) : null;
    return `<div class="card" style="--type-color:${color}">
      <div class="card-title">${escapeHtml(e.title)}</div>
      <div class="card-meta">${e.progress_current||0} из ${e.progress_total||'?'} стр. (${pct}%)</div>
      <div class="bar" style="margin-top:8px;"><div class="bar-fill" style="width:${pct}%; background:${color}"></div></div>
      <div class="progress-input">
        <input type="number" value="${e.progress_current||0}" onchange="updatePage('${e.id}', this.value)">
        <span class="card-meta">стр. прочитано</span>
        <button class="ghost" style="width:auto; padding:4px 10px;" onclick="deleteEntry('${e.id}')">✕</button>
      </div>
      ${goal ? `<div class="goal-chip">🎯 к цели: ${escapeHtml(goal.title||'без названия')}</div>` : ''}
    </div>`;
  }
  if(e.type === 'habit'){
    const doneToday = e.last_done_date === todayStr();
    return `<div class="card" style="--type-color:${color}">
      <div class="card-row">
        <div class="check ${doneToday?'done':''}" onclick='toggleHabit(${JSON.stringify(e.id)}, this)'>${doneToday?'✓':''}</div>
        <div style="flex:1;">
          <div class="card-title">${escapeHtml(e.title)}</div>
          <div class="streak-chip">${e.streak>0 ? `🔥 ${e.streak} дн. подряд` : 'начни сегодня'}</div>
        </div>
        <button class="ghost" style="width:auto; padding:4px 10px;" onclick="deleteEntry('${e.id}')">✕</button>
      </div>
    </div>`;
  }
  return `<div class="card" style="--type-color:${color}">
    <div class="card-row">
      <div class="check ${e.done?'done':''}" onclick="toggleDone('${e.id}', ${!e.done}, this)">${e.done?'✓':''}</div>
      <div style="flex:1;">
        <div class="card-title ${e.done?'done':''}">${escapeHtml(e.title)}</div>
        ${e.category ? `<div class="card-meta">${categoryEmoji(e.category)}${escapeHtml(e.category)}</div>` : ''}
      </div>
      <button class="ghost" style="width:auto; padding:4px 10px;" onclick="deleteEntry('${e.id}')">✕</button>
    </div>
  </div>`;
}

export function renderList(){
  Object.entries(CONTAINER_ID).forEach(([type, containerId]) => {
    const el = document.getElementById(containerId);
    if(!el) return;
    const items = state.entries.filter(e => e.type === type);
    el.innerHTML = items.length === 0
      ? '<div class="empty">Пока пусто. Нажми + чтобы добавить</div>'
      : items.map(cardHtml).join('');
  });
  // Если сейчас открыта статистика — держим её в актуальном состоянии
  // тоже (иначе, например, только что отмеченный квест не обновит цифры
  // на экране статистики, пока его не закрыть и не открыть заново).
  const statsView = document.getElementById('statsView');
  if(statsView && statsView.style.display === 'block'){ renderStats(statsView); }
  if(window.renderDashboard) window.renderDashboard();
  if(state.mainTab === 'tasks' && window.renderTasksPage) window.renderTasksPage('quest');
}

// --- Ниже: все изменяющие операции идут по одной схеме (local-first) ---
// 1. Меняем состояние в памяти (state.entries) — мгновенно.
// 2. Отражаем в интерфейсе — не дожидаясь сети.
// 3. Пишем в IndexedDB — переживёт закрытие приложения офлайн.
// 4. Кладём в очередь синхронизации — Sync Manager сам отправит,
//    как только будет соединение, с повторными попытками при сбоях.

export async function toggleDone(id, done, el){
  if(el){ el.classList.add('pop'); setTimeout(()=>el.classList.remove('pop'), 350); }
  const e = state.entries.find(x => x.id === id);
  if(!e) return;
  e.done = done;
  e.updated_at = new Date().toISOString();
  renderList();
  cacheEntries([e]);
  enqueue('entries', 'update', { id, done: e.done, updated_at: e.updated_at });
}

export async function toggleHabit(id, el){
  const e = state.entries.find(x => x.id === id);
  if(!e) return;
  const today = todayStr();
  const yesterday = yesterdayStr();

  if(el){ el.classList.add('pop'); setTimeout(()=>el.classList.remove('pop'), 350); }

  let patch;
  if(e.last_done_date === today){
    const newStreak = Math.max(0, (e.streak||1) - 1);
    patch = { streak: newStreak, last_done_date: newStreak > 0 ? yesterday : null };
  } else {
    const newStreak = e.last_done_date === yesterday ? (e.streak||0)+1 : 1;
    patch = { streak: newStreak, last_done_date: today };
  }
  Object.assign(e, patch);
  renderList();
  cacheEntries([e]);
  enqueue('entries', 'update', { id, ...patch });
}

export async function updatePage(id, val){
  const e = state.entries.find(x => x.id === id);
  if(!e || e.type !== 'book') return;

  const total = Number(e.progress_total) || 0;
  let current = Number(val);
  if(!Number.isFinite(current)) return;
  current = Math.max(0, Math.floor(current));
  if(total > 0) current = Math.min(current, total);

  e.progress_current = current;
  e.updated_at = new Date().toISOString();
  cacheEntries([e]);
  enqueue('entries', 'update', { id, progress_current: e.progress_current, updated_at: e.updated_at });

  // Прогресс хранится в самой записи книги: он не сбрасывается после
  // перерисовки, перезагрузки или перехода между разделами.
  renderList();
  if(state.mainTab === 'tasks' && window.renderTasksPage){
    window.renderTasksPage('book');
  }
  if(window.renderDashboard){
    window.renderDashboard();
  }
}


export async function deleteEntry(id){
  state.entries = state.entries.filter(e => e.id !== id);
  renderList();
  removeEntryFromCache(id);
  enqueue('entries', 'delete', { id });
}

const CATEGORY_PRESETS=['Покупка','Спорт','Обещание','Стоит сделать','Не забыть','Жду'];
function categoryPicker(current=''){
  return `<div class="category-picker"><div class="category-label">Категория</div><div class="category-options">${CATEGORY_PRESETS.map(c=>`<button type="button" class="category-chip" data-category="${c}" onclick="pickCategory('${c}')">${c}</button>`).join('')}</div><div class="custom-category-wrap"><span>Или своя</span><input id="newCustomCategory" placeholder="Напишите категорию" value="${escapeHtml(current)}"></div><input type="hidden" id="newCategory" value="${escapeHtml(current)}"></div>`;
}
export function pickCategory(value){
  const hidden=document.getElementById('newCategory'); const input=document.getElementById('newCustomCategory');
  if(hidden) hidden.value=value; if(input) input.value='';
  document.querySelectorAll('.category-chip').forEach(b=>b.classList.toggle('active',b.dataset.category===value));
}
function categoryFromForm(){
  const own=document.getElementById('newCustomCategory')?.value.trim();
  if(own) return own;
  return document.getElementById('newCategory')?.value.trim()||'';
}

export function openAdd(){
  const isBook=state.activeEntryType==='book';
  const kind=state.activeEntryType==='habit'?'Привычка':state.activeEntryType==='book'?'Книга':state.activeEntryType==='note'?'Дело':'Задача';
  const goals=state.compassItems.filter(c=>c.kind==='goal');
  const modal=document.createElement('div'); modal.className='modal-bg'; modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.innerHTML=`<div class="modal apple-sheet add-entry-sheet">
    <div class="modal-handle"></div>
    <div class="sheet-title-row"><div><div class="meta-small">Новая запись</div><h2>${kind}</h2></div><button class="sheet-close" onclick="this.closest('.modal-bg').remove()">×</button></div>
    <label>Название<input id="newTitle" placeholder="Например, Прочитать 20 страниц" autocomplete="off"></label>
    ${isBook?`<label>Всего страниц<input id="newTotal" type="number" min="1" inputmode="numeric" placeholder="Например, 320"></label>${goals.length?`<label>Цель<select id="newGoal"><option value="">Без цели</option>${goals.map(g=>`<option value="${g.id}">🎯 ${escapeHtml(g.title||'Цель')}</option>`).join('')}</select></label>`:''}`:''}
    ${!isBook?categoryPicker():''}
    <button class="primary sheet-primary" onclick="saveNew(${isBook})">Добавить</button>
    <button class="ghost sheet-cancel" onclick="this.closest('.modal-bg').remove()">Отмена</button>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#newTitle')?.focus();
}

export async function saveNew(isBook){
  const title=document.getElementById('newTitle')?.value.trim(); if(!title)return;
  const now=new Date().toISOString(); const row={id:crypto.randomUUID(),type:state.activeEntryType,title,user_id:state.session.user.id,created_at:now,updated_at:now,done:false};
  if(isBook){ row.progress_total=Math.max(1,Number(document.getElementById('newTotal')?.value)||1); row.progress_current=0; const goalSel=document.getElementById('newGoal'); if(goalSel?.value)row.goal_id=goalSel.value; }
  else { row.category=categoryFromForm(); }
  state.entries.unshift(row); document.querySelector('.modal-bg')?.remove(); renderList(); cacheEntries([row]); enqueue('entries','insert',row);
}
