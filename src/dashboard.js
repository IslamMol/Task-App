import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { todayStr } from './utils/date.js';
import { openAdd, toggleDone, toggleHabit } from './entries.js';

const DATA_COLORS = ['#85049b','#9f2eb5','#b94bd0','#5a9a7a','#b0576a'];

function greeting(){
  const hour = new Date().getHours();
  if(hour >= 5 && hour < 12) return 'Доброе утро';
  if(hour >= 12 && hour < 18) return 'Добрый день';
  if(hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

function displayName(){
  const email = state.session?.user?.email || '';
  const meta = state.session?.user?.user_metadata || {};
  return meta.name || email.split('@')[0] || 'Пользователь';
}

function initials(){
  const name = displayName().trim();
  return name ? name.slice(0,1).toUpperCase() : 'П';
}

function avatarMarkup(){
  const url = state.session?.user?.user_metadata?.avatar_url || '';
  return url
    ? `<img src="${escapeHtml(url)}" alt="">`
    : `<span style="font-size:14px;font-weight:800;color:var(--gesso-fg-muted)">${escapeHtml(initials())}</span>`;
}

function dailyTasks(){
  return state.entries.filter(e => e.type === 'quest' || e.type === 'note').slice(0,5);
}

function completionStats(){
  const tasks = dailyTasks();
  const done = tasks.filter(e => e.done).length;
  const total = tasks.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  return {tasks, done, total, pct};
}

function habits(){
  return state.entries.filter(e => e.type === 'habit');
}

function books(){
  return state.entries.filter(e => e.type === 'book').sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
}

function habitStrip(){
  const items = habits().slice(0,4);
  if(!items.length){
    return `<div class="dashboard-empty">Пока нет привычек.<br><span style="font-size:10px">Добавь первую через кнопку «Задача».</span></div>`;
  }
  const values = items.map(h => Math.max(1, Number(h.streak)||0));
  return `<div class="habit-card">
    <div class="habit-bar">${items.map((h,i)=>`<button class="habit-seg" style="flex-grow:${values[i]};background:${DATA_COLORS[i]}" onclick="toggleHabit('${h.id}',this)" title="${escapeHtml(h.title)}">${values[i]}</button>`).join('')}</div>
    <div class="habit-legend">${items.map((h,i)=>`<div class="item"><span class="habit-dot" style="background:${DATA_COLORS[i]}"></span><span>${escapeHtml(h.title)} · ${Number(h.streak)||0}</span></div>`).join('')}</div>
  </div>`;
}

function taskRows(tasks){
  if(!tasks.length){
    return `<div class="dashboard-empty">На сегодня всё спокойно.<br><span style="font-size:10px">Добавь новое дело через кнопку «Задача».</span></div>`;
  }
  const colors = ['#9f2eb5','#b94bd0','#5a9a7a','#b0576a','#85049b'];
  return `<div class="task-list">${tasks.map((e,i)=>`
    <div class="task-row">
      <button class="task-check ${e.done?'done':''}" onclick="toggleDone('${e.id}', ${!e.done}, this)" aria-label="${e.done?'Отменить':'Отметить'}">
        ${e.done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 4 4L19 6"/></svg>':''}
      </button>
      <span class="task-dot" style="background:${colors[i%colors.length]}"></span>
      <div class="task-text">
        <span class="task-title ${e.done?'done':''}">${escapeHtml(e.title)}</span>
        <span class="task-meta">${escapeHtml(e.category||'Сегодня')}</span>
      </div>
    </div>`).join('')}</div>`;
}

function financeSnapshot(){
  return `<div class="finance-card">
    <div class="finance-label">БАЛАНС</div>
    <div class="finance-balance">54 200 ₽</div>
    <div class="finance-actions">
      <button class="primary-pill" onclick="openFinanceInfo('expense')"><span>＋</span>Расход</button>
      <button class="secondary-pill" onclick="openFinanceInfo('income')"><span>＋</span>Доход</button>
    </div>
    <div class="finance-cats">
      <div class="finance-cat"><span class="amt">3 400 ₽</span><span class="name">Еда</span></div>
      <div class="finance-cat"><span class="amt">1 200 ₽</span><span class="name">Транспорт</span></div>
      <div class="finance-cat"><span class="amt">2 800 ₽</span><span class="name">Прочее</span></div>
    </div>
  </div>`;
}

function readingSnapshot(){
  const book = books()[0];
  if(!book){
    return `<div class="dashboard-empty">Пока нет книги.<br><span style="font-size:10px">Добавь книгу во вкладке «Задачи».</span></div>`;
  }
  const total = Number(book.progress_total)||0;
  const current = Number(book.progress_current)||0;
  const pct = total ? Math.max(0, Math.min(100, Math.round(current/total*100))) : 0;
  const left = total ? Math.max(0,total-current) : 0;
  return `<div class="reading-card" onclick="window.switchMainTab('tasks')" style="cursor:pointer">
    <div class="book-cover"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20"/></svg><span class="book-pct">${pct}%</span></div>
    <div style="min-width:0;flex:1"><div class="read-title">${escapeHtml(book.title)}</div><div class="read-meta">Стр. ${current} из ${total||'?'} · осталось ${left||'—'}</div></div>
  </div>`;
}

export function renderDashboard(){
  const root = document.getElementById('dashboardRoot');
  if(!root) return;
  const {tasks,done,total,pct} = completionStats();
  const circumference = 502;
  const avatar = avatarMarkup();
  root.innerHTML = `
    <div class="screen-stack">
      <header class="greeting">
        <div><div class="hi">${greeting()}, ${escapeHtml(displayName())}</div><h1>Сегодня</h1></div>
        <button class="avatar-button" onclick="window.switchMainTab('settings')" aria-label="Мой путь">${avatar}</button>
      </header>

      <section class="hero-card">
        <div class="ring-wrap">
          <svg viewBox="0 0 200 200" style="--p:${pct/100}">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#eeeae6" stroke-width="16"/>
            <circle class="ring-progress" cx="100" cy="100" r="80" fill="none" stroke="#4b5a8c" stroke-width="16" stroke-linecap="round" stroke-dasharray="502" stroke-dashoffset="502" transform="rotate(-90 100 100)"/>
          </svg>
          <div class="ring-center"><span class="num">${pct}%</span><span class="lbl">ПУТИ ПРОЙДЕНО</span></div>
        </div>
        <p class="hero-sub">Из <strong>${total}</strong> пунктов на сегодня выполнено <strong>${done}</strong>. ${total && done===total ? 'День завершён.' : 'Ещё немного — и день завершён.'}</p>
      </section>

      <section>
        <div class="section-head"><h2>Привычки</h2><button class="view-all" onclick="openHabitsSheet()">Все ›</button></div>
        <div style="margin-top:12px">${habitStrip()}</div>
      </section>

      <section>
        <div class="section-head"><h2>Задачи на сегодня</h2><button class="view-all" onclick="window.switchMainTab('tasks')">Все ›</button></div>
        <div style="margin-top:12px">${taskRows(tasks)}</div>
        <div class="habit-card completed-card" style="margin-top:12px">
          <div><div class="completed-label">ВЫПОЛНЕНО СЕГОДНЯ</div><div class="completed-value">${done} из ${total}</div></div>
          <button class="primary-pill" onclick="openAddForQuest()">＋ Задача</button>
        </div>
      </section>

      <section>
        <div class="section-head"><h2>Финансы</h2><button class="view-all" onclick="window.switchMainTab('finance')">Все ›</button></div>
        <div style="margin-top:12px">${financeSnapshot()}</div>
      </section>

      <section style="padding-bottom:8px">
        <div class="section-head"><h2>Чтение</h2><button class="view-all" onclick="window.switchMainTab('tasks')">Все</button></div>
        <div style="margin-top:12px">${readingSnapshot()}</div>
      </section>
    </div>`;
}

export function renderFinancePage(){
  const root = document.getElementById('financeRoot');
  if(!root) return;
  root.innerHTML = `<div class="screen-stack"><div><div class="meta-small">План</div><h1 class="page-title">Финансы</h1><p style="font-size:11px;color:var(--gesso-fg-muted);margin:8px 0 0">Визуальная часть уже готова. Хранение финансовых операций в текущей базе ещё не подключено.</p></div><section>${financeSnapshot()}</section><section class="dashboard-empty">Кнопки «Расход» и «Доход» открывают подсказку, чтобы не создавать фиктивные записи без отдельной таблицы Supabase.</section></div>`;
}

export function openFinanceInfo(kind='expense'){
  const title = kind === 'expense' ? 'Расход' : 'Доход';
  const modal = document.createElement('div');
  modal.className='modal-bg';
  modal.onclick=(e)=>{if(e.target===modal) modal.remove()};
  modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><h2>${title}</h2><p style="color:var(--gesso-fg-muted);font-size:12px;line-height:1.5;margin:0 0 12px">В текущей версии базы Supabase нет отдельной таблицы финансов. Я не буду записывать выдуманные суммы в таблицу задач. Когда добавим finance-модель, эта кнопка станет полноценной.</p><button class="primary" onclick="this.closest('.modal-bg').remove()">Понятно</button></div>`;
  document.body.appendChild(modal);
}

export function openAddForQuest(){
  const prev = state.activeEntryType;
  state.activeEntryType='quest';
  openAdd();
  state.activeEntryType=prev;
}

export function openHabitsSheet(){
  const items=habits();
  const modal=document.createElement('div');
  modal.className='modal-bg';
  modal.onclick=(e)=>{if(e.target===modal) modal.remove()};
  modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><h2>Привычки</h2>${items.length?items.map(h=>`<div class="list-card"><div class="list-row"><button class="task-check ${h.last_done_date===todayStr()?'done':''}" onclick="toggleHabit('${h.id}',this)">${h.last_done_date===todayStr()?'✓':''}</button><div style="min-width:0;flex:1"><div style="font-weight:800;font-size:13px">${escapeHtml(h.title)}</div><div class="meta-small">🔥 ${Number(h.streak)||0} дн. подряд</div></div></div></div>`).join(''):'<div class="dashboard-empty">Пока нет привычек.</div>'}<button class="primary" onclick="this.closest('.modal-bg').remove()">Закрыть</button></div>`;
  document.body.appendChild(modal);
}

export function renderTasksPage(active='quest'){
  const root=document.getElementById('tasksRoot');
  if(!root) return;
  const quests=state.entries.filter(e=>e.type==='quest');
  const booksList=books();
  root.innerHTML=`<div class="screen-stack"><div><h1 class="page-title">Задачи</h1><div class="segmented"><button class="${active==='quest'?'active':''}" onclick="renderTasksPage('quest')">Квесты</button><button class="${active==='book'?'active':''}" onclick="renderTasksPage('book')">Книги</button><button class="${active==='habit'?'active':''}" onclick="renderTasksPage('habit')">Привычки</button></div></div>${active==='quest'?renderQuestPage(quests):active==='book'?renderBookPage(booksList):renderHabitPage(habits())}</div>`;
}

function renderQuestPage(items){
  if(!items.length) return `<div class="dashboard-empty">Пока пусто.<br><span style="font-size:10px">Нажми «＋ Задача» на главном экране.</span></div>`;
  return items.map(e=>`<div class="list-card"><div class="list-row"><button class="task-check ${e.done?'done':''}" onclick="toggleDone('${e.id}',${!e.done},this)">${e.done?'✓':''}</button><div style="min-width:0;flex:1"><div style="font-size:12px;font-weight:800;${e.done?'text-decoration:line-through;color:var(--gesso-fg-muted)':''}">${escapeHtml(e.title)}</div><div class="meta-small">${escapeHtml(e.category||'Квест')}</div></div><button class="icon-plain" onclick="deleteEntry('${e.id}')">✕</button></div></div>`).join('');
}
function renderHabitPage(items){
  if(!items.length) return `<div class="dashboard-empty">Пока пусто. Добавь привычку через «Новая запись».</div>`;
  return items.map(h=>`<div class="list-card"><div class="list-row"><button class="task-check ${h.last_done_date===todayStr()?'done':''}" onclick="toggleHabit('${h.id}',this)">${h.last_done_date===todayStr()?'✓':''}</button><div style="min-width:0;flex:1"><div style="font-size:12px;font-weight:800">${escapeHtml(h.title)}</div><div class="meta-small">🔥 ${Number(h.streak)||0} дн. подряд</div></div><button class="icon-plain" onclick="deleteEntry('${h.id}')">✕</button></div></div>`).join('');
}
function renderBookPage(items){
  if(!items.length) return `<div class="dashboard-empty">Пока нет книг.<br><span style="font-size:10px">Открой «Добавить» через экран задач.</span></div>`;
  return items.map(e=>{const total=Number(e.progress_total)||0;const current=Number(e.progress_current)||0;const pct=total?Math.round(current/total*100):0;return `<div class="list-card"><div class="list-row"><div class="book-cover" style="width:46px;height:64px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div><div style="min-width:0;flex:1"><div style="font-size:12px;font-weight:800">${escapeHtml(e.title)}</div><div class="meta-small">${current} из ${total||'?'} стр. · ${pct}%</div><div style="height:6px;background:#eee9e4;border-radius:99px;overflow:hidden;margin-top:7px"><div style="width:${pct}%;height:100%;background:var(--gesso-accent);border-radius:99px"></div></div></div><button class="icon-plain" onclick="deleteEntry('${e.id}')">✕</button></div></div>`}).join('');
}
