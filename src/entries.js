import { sb } from './services/supabase.js';
import { state } from './state.js';
import { TYPE_COLOR, CATEGORY_EMOJI, CONTAINER_ID } from './constants.js';
import { escapeHtml } from './utils/dom.js';
import { todayStr, yesterdayStr } from './utils/date.js';
import { renderStats } from './stats.js';
import { cacheEntries, removeEntryFromCache, readEntriesFromCache } from './db/indexeddb.js';
import { enqueue } from './db/sync.js';
import { renderDashboard } from './dashboard.js';

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
    const pct = e.progress_total ? Math.min(100, Math.round((e.progress_current/e.progress_total)*100)) : 0;
    const goal = e.goal_id ? state.compassItems.find(c=>c.id===e.goal_id) : null;
    return `<article class="entry-card entry-card-book" data-entry-id="${escapeHtml(e.id)}" style="--entry-accent:${color}">
      <div class="entry-card-topline"><span class="entry-eyebrow">КНИГА</span><span class="entry-percent">${pct}%</span></div>
      <div class="entry-card-main">
        <div class="entry-cover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/></svg></div>
        <div class="entry-card-copy">
          <div class="card-title">${escapeHtml(e.title)}</div>
          <div class="card-meta">${e.progress_current||0} из ${e.progress_total||'?'} страниц</div>
        </div>
        <button class="entry-more" onclick="deleteEntry('${e.id}')" aria-label="Удалить">×</button>
      </div>
      <div class="entry-progress"><span style="width:${pct}%"></span></div>
      <div class="entry-card-actions">
        <label class="entry-progress-field"><span>Прогресс</span><input type="number" value="${e.progress_current||0}" min="0" max="${e.progress_total||''}" onchange="updatePage('${e.id}', this.value)"></label>
        ${goal ? `<div class="goal-chip">🎯 ${escapeHtml(goal.title||'Цель')}</div>` : `<div class="entry-meta-pill">Продолжай в своём темпе</div>`}
      </div>
    </article>`;
  }

  if(e.type === 'habit'){
    const doneToday = e.last_done_date === todayStr();
    const streak = Number(e.streak||0);
    return `<article class="entry-card entry-card-habit ${doneToday?'is-done':''}" data-entry-id="${escapeHtml(e.id)}" style="--entry-accent:${color}">
      <div class="entry-card-main">
        <button class="entry-check ${doneToday?'done':''}" onclick='toggleHabit(${JSON.stringify(e.id)}, this)' aria-label="${doneToday?'Отметить как невыполненную':'Выполнить сегодня'}">${doneToday?'✓':''}</button>
        <div class="entry-card-copy">
          <div class="card-title">${escapeHtml(e.title)}</div>
          <div class="card-meta">${doneToday ? 'Сегодня выполнено' : streak ? 'Поддержи серию сегодня' : 'Начни сегодня'}</div>
        </div>
        <div class="streak-stat"><strong>${streak}</strong><span>дн.</span></div>
        <button class="entry-more" onclick="deleteEntry('${e.id}')" aria-label="Удалить">×</button>
      </div>
      <div class="entry-footer-row"><span class="streak-chip">${streak ? `🔥 ${streak} ${streak === 1 ? 'день' : 'дня'} подряд` : 'Первая отметка'}</span><span class="entry-accent-line"></span></div>
    </article>`;
  }

  const isQuest = e.type === 'quest';
  const done = !!e.done;
  return `<article class="entry-card entry-card-task ${isQuest?'entry-card-quest':''} ${done?'is-done':''}" data-entry-id="${escapeHtml(e.id)}" style="--entry-accent:${color}">
    <div class="entry-card-main">
      <button class="entry-check ${done?'done':''}" onclick="toggleDone('${e.id}', ${!done}, this)" aria-label="${done?'Вернуть':'Завершить'}">${done?'✓':''}</button>
      <span class="entry-dot"></span>
      <div class="entry-card-copy">
        <div class="card-title ${done?'done':''}">${escapeHtml(e.title)}</div>
        <div class="card-meta">${isQuest ? 'Квест' : (e.category ? `${categoryEmoji(e.category)}${escapeHtml(e.category)}` : 'Дело')}</div>
      </div>
      <button class="entry-more" onclick="deleteEntry('${e.id}')" aria-label="Удалить">×</button>
    </div>
    <div class="entry-footer-row"><span class="task-state ${done?'complete':''}">${done ? 'Завершено' : isQuest ? 'В работе' : 'На сегодня'}</span><span class="entry-accent-line"></span></div>
  </article>`;
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
  renderDashboard();
  const statsView = document.getElementById('statsView');
  if(statsView && statsView.style.display === 'block'){ renderStats(statsView); }
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
  if(!e) return;
  e.progress_current = Number(val);
  e.updated_at = new Date().toISOString();
  renderList();
  cacheEntries([e]);
  enqueue('entries', 'update', { id, progress_current: e.progress_current, updated_at: e.updated_at });
}

export async function deleteEntry(id){
  state.entries = state.entries.filter(e => e.id !== id);
  renderList();
  removeEntryFromCache(id);
  enqueue('entries', 'delete', { id });
}

export function openAddType(type){ state.activeEntryType = type; openAdd(); }

export function openAdd(){
  const isBook = state.activeEntryType === 'book';
  const typeLabels = { habit: 'Привычка', note: 'Дело', quest: 'Квест', book: 'Книга' };
  const typeIcons = { habit: '↻', note: '✓', quest: '◇', book: '▤' };
  const goals = state.compassItems.filter(c => c.kind === 'goal');
  const modal = document.createElement('div');
  modal.className = 'modal-bg add-sheet-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  const current = state.activeEntryType;
  modal.innerHTML = `
    <div class="modal add-sheet" role="dialog" aria-modal="true" aria-labelledby="addSheetTitle">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="sheet-kicker">НОВАЯ ЗАПИСЬ</div>
          <h2 id="addSheetTitle">${typeLabels[current] || 'Запись'}</h2>
        </div>
        <button class="sheet-close" onclick="this.closest('.modal-bg').remove()" aria-label="Закрыть">×</button>
      </div>
      <div class="entry-type-row">
        ${['habit','note','quest','book'].map(t => `<button class="entry-type ${current===t?'active':''}" onclick="openAddType('${t}'); this.closest('.modal-bg').remove();">
          <span class="entry-type-icon">${typeIcons[t]}</span><span>${typeLabels[t]}</span>
        </button>`).join('')}
      </div>
      <label class="field-label" for="newTitle">Название</label>
      <input class="sheet-input" id="newTitle" placeholder="Например, 20 минут чтения" autocomplete="off">
      ${!isBook ? `<label class="field-label" for="newCat">Категория <span>необязательно</span></label><input class="sheet-input" id="newCat" placeholder="Учёба, здоровье, личное…">` : ''}
      ${isBook ? `<label class="field-label" for="newTotal">Всего страниц</label><input class="sheet-input" id="newTotal" type="number" min="1" placeholder="Например, 320">` : ''}
      ${isBook && goals.length ? `<label class="field-label" for="newGoal">Цель <span>необязательно</span></label><select class="sheet-input" id="newGoal"><option value="">Не связано с целью</option>${goals.map(g=>`<option value="${g.id}">🎯 ${escapeHtml(g.title||'Цель')}</option>`).join('')}</select>` : ''}
      <button class="sheet-primary" onclick="saveNew(${isBook})">Добавить ${typeLabels[current] || 'запись'}</button>
      <button class="sheet-secondary" onclick="this.closest('.modal-bg').remove()">Отмена</button>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>document.getElementById('newTitle')?.focus());
}

export async function saveNew(isBook){
  const title = document.getElementById('newTitle').value.trim();
  if(!title) return;
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    type: state.activeEntryType,
    title,
    user_id: state.session.user.id,
    created_at: now,
    updated_at: now,
    done: false,
  };
  if(isBook){
    row.progress_total = Number(document.getElementById('newTotal').value) || null;
    row.progress_current = 0;
    const goalSel = document.getElementById('newGoal');
    if(goalSel && goalSel.value) row.goal_id = goalSel.value;
  } else {
    const cat = document.getElementById('newCat');
    if(cat) row.category = cat.value.trim();
  }
  state.entries.unshift(row);
  document.querySelector('.modal-bg').remove();
  renderList();
  cacheEntries([row]);
  enqueue('entries', 'insert', row);
}
