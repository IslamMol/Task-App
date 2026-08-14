import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { todayStr } from './utils/date.js';

function getUserName(){
  const email = state.session?.user?.email || '';
  const raw = email.split('@')[0] || 'друг';
  const cleaned = raw.replace(/[._-]+/g, ' ').trim();
  if(!cleaned) return 'друг';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getGreeting(){
  const hour = new Date().getHours();
  if(hour < 6) return 'Доброй ночи';
  if(hour < 12) return 'Доброе утро';
  if(hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function isDoneToday(entry){
  if(entry.type === 'habit') return entry.last_done_date === todayStr();
  return !!entry.done;
}

function actionItems(){
  return state.entries.filter(e => ['habit','note','quest'].includes(e.type));
}

function taskItems(){
  return state.entries.filter(e => ['note','quest'].includes(e.type));
}

function renderRing(percent){
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  return `
    <div class="dashboard-ring-wrap">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="${radius}" fill="none" stroke="var(--ds-recessed)" stroke-width="16"></circle>
        <circle class="dashboard-ring-progress" cx="100" cy="100" r="${radius}" fill="none" stroke="var(--ds-accent)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" style="--ring-to:${dashOffset}; --ring-circ:${circumference}"></circle>
      </svg>
      <div class="dashboard-ring-center">
        <span class="dashboard-ring-number">${percent}%</span>
        <span class="dashboard-ring-label">ПУТИ ПРОЙДЕНО</span>
      </div>
    </div>`;
}

function renderHabits(habits){
  if(!habits.length){
    return `<div class="dashboard-card dashboard-empty-card"><div class="dashboard-empty-title">Пока нет привычек</div><div class="dashboard-muted">Добавь первую привычку через кнопку +</div></div>`;
  }
  const palette = ['#8f96a8','#c98a52','#4b5a8c','#5a9a7a','#b0576a'];
  const widths = habits.map(h => Math.max(1, h.streak || 1));
  const total = widths.reduce((a,b)=>a+b,0);
  return `<div class="dashboard-card">
    <div class="dashboard-habit-bar">${habits.slice(0,5).map((h,i)=>{
      const width = (widths[i] / total) * 100;
      return `<button class="dashboard-habit-seg" style="flex:${width};background:${palette[i%palette.length]}" onclick='toggleHabit(${JSON.stringify(h.id)})' title="${escapeHtml(h.title)}">${h.streak||0}</button>`;
    }).join('')}</div>
    <div class="dashboard-habit-legend">${habits.slice(0,5).map((h,i)=>`<div class="dashboard-legend-item"><span class="dashboard-dot" style="background:${palette[i%palette.length]}"></span><span>${escapeHtml(h.title)}</span></div>`).join('')}</div>
  </div>`;
}

function renderTasks(tasks){
  if(!tasks.length){
    return `<div class="dashboard-card dashboard-empty-card"><div class="dashboard-empty-title">На сегодня всё спокойно</div><div class="dashboard-muted">Добавь новое дело через +</div></div>`;
  }
  return `<div class="dashboard-task-list">${tasks.slice(0,5).map(t=>`
    <div class="dashboard-task-row">
      <button class="dashboard-task-check ${t.done?'done':''}" onclick="toggleDone('${t.id}', ${!t.done}, this)" aria-label="${t.done?'Вернуть':'Завершить'}">
        ${t.done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 4 4L19 6"/></svg>' : ''}
      </button>
      <span class="dashboard-task-dot"></span>
      <div class="dashboard-task-text">
        <div class="dashboard-task-title ${t.done?'done':''}">${escapeHtml(t.title)}</div>
        <div class="dashboard-task-meta">${t.type === 'quest' ? 'Квест' : (t.category ? escapeHtml(t.category) : 'Дело')}</div>
      </div>
      <button class="dashboard-inline-delete" onclick="deleteEntry('${t.id}')" aria-label="Удалить">×</button>
    </div>`).join('')}</div>`;
}

function renderReading(books){
  if(!books.length) return '';
  const book = books[0];
  const pct = book.progress_total ? Math.min(100, Math.round((book.progress_current / book.progress_total) * 100)) : 0;
  return `<div class="dashboard-card dashboard-reading-card">
    <div class="dashboard-reading-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/></svg><span>${pct}%</span></div>
    <div class="dashboard-reading-text"><div class="dashboard-reading-title">${escapeHtml(book.title)}</div><div class="dashboard-muted">${book.progress_current||0} из ${book.progress_total||'?'} страниц</div></div>
  </div>`;
}

export function renderDashboard(){
  const root = document.getElementById('home-dashboard');
  if(!root) return;

  const items = actionItems();
  const completed = items.filter(isDoneToday).length;
  const percent = items.length ? Math.round((completed / items.length) * 100) : 0;
  const habits = state.entries.filter(e => e.type === 'habit').sort((a,b)=>(b.streak||0)-(a.streak||0));
  const tasks = taskItems().sort((a,b)=>Number(a.done)-Number(b.done));
  const books = state.entries.filter(e => e.type === 'book');
  const remaining = Math.max(0, items.length - completed);

  root.innerHTML = `
    <div class="dashboard-greeting">
      <div><div class="dashboard-hi">${getGreeting()}, ${escapeHtml(getUserName())}</div><h1>Сегодня</h1></div>
      <div class="dashboard-head-actions"><button class="dashboard-analytics" onclick="toggleStatsView()" aria-label="Открыть аналитику"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/></svg></button><button class="dashboard-avatar" onclick="switchMainTab('settings')" aria-label="Профиль"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></button></div>
    </div>

    <section class="dashboard-hero">
      ${renderRing(percent)}
      <p class="dashboard-hero-sub">Из <strong>${items.length} ${items.length === 1 ? 'пункта' : 'пунктов'}</strong> на сегодня выполнено <strong>${completed}</strong>. ${remaining ? 'Ещё немного — и день завершён.' : 'Отлично. День завершён.'}</p>
    </section>

    <section class="dashboard-section">
      <div class="dashboard-section-head"><h2>Привычки</h2><button onclick="switchHomeSub('habit')">Все <span>›</span></button></div>
      ${renderHabits(habits)}
    </section>

    <section class="dashboard-section">
      <div class="dashboard-section-head"><h2>Задания</h2><button onclick="switchMainTab('tasks')">Все <span>›</span></button></div>
      ${renderTasks(tasks)}
    </section>

    ${renderReading(books) ? `<section class="dashboard-section"><div class="dashboard-section-head"><h2>Чтение</h2><button onclick="switchTaskSub('book'); switchMainTab('tasks')">Все <span>›</span></button></div>${renderReading(books)}</section>` : ''}
  `;
}
