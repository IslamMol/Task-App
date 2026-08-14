import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { todayStr } from './utils/date.js';
import { openAdd, toggleDone, toggleHabit } from './entries.js';
import { getCurrencySymbol, getLocalAvatar } from './pages/settings.js';
import { getHomeOrder } from './personalization.js';

const DATA_COLORS=['#8f96a8','#c98a52','#4b5a8c','#5a9a7a','#b0576a'];
function greeting(){const h=new Date().getHours(); return h<5?'Доброй ночи':h<12?'Доброе утро':h<18?'Добрый день':h<23?'Добрый вечер':'Доброй ночи';}
function displayName(){const email=state.session?.user?.email||''; const m=state.session?.user?.user_metadata||{}; return m.name||email.split('@')[0]||'Пользователь';}
function initials(){return displayName().trim().slice(0,1).toUpperCase()||'П';}
function avatarMarkup(){const url=getLocalAvatar(); return url?`<img src="${url}" alt="">`:`<span>${escapeHtml(initials())}</span>`;}
function dailyTasks(){return state.entries.filter(e=>e.type==='quest'||e.type==='note').slice(0,5);}
function completionStats(){const tasks=dailyTasks(); const done=tasks.filter(e=>e.done).length; const total=tasks.length; return {tasks,done,total,pct:total?Math.round(done/total*100):0};}
function habits(){return state.entries.filter(e=>e.type==='habit');}
function books(){return state.entries.filter(e=>e.type==='book').sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));}
function habitStrip(){const items=habits().slice(0,4); if(!items.length){return `<div class="habit-card habit-empty"><div class="empty-icon">◎</div><strong>Пока нет привычек</strong><span>Добавь первую привычку</span></div>`;} const vals=items.map(h=>Math.max(1,Number(h.streak)||1)); return `<div class="habit-card"><div class="habit-bar">${items.map((h,i)=>`<button class="habit-seg" style="flex-grow:${vals[i]};background:${DATA_COLORS[i]}" onclick="toggleHabit('${h.id}',this)">${vals[i]}</button>`).join('')}</div><div class="habit-legend">${items.map((h,i)=>`<div class="item"><span class="habit-dot" style="background:${DATA_COLORS[i]}"></span><span>${escapeHtml(h.title)} · ${Number(h.streak)||0}</span></div>`).join('')}</div></div>`;}
function taskRows(tasks){if(!tasks.length)return `<div class="task-empty"><div class="empty-icon">◔</div><strong>На сегодня всё спокойно</strong><span>Добавь задачу через «+»</span></div>`; const colors=['#c98a52','#4b5a8c','#5a9a7a','#b0576a','#8f96a8']; return `<div class="task-list">${tasks.map((e,i)=>`<div class="task-row"><button class="task-check ${e.done?'done':''}" onclick="toggleDone('${e.id}',${!e.done},this)">${e.done?'✓':''}</button><span class="task-dot" style="background:${colors[i%colors.length]}"></span><div class="task-text"><span class="task-title ${e.done?'done':''}">${escapeHtml(e.title)}</span><span class="task-meta">${escapeHtml(e.category||'Сегодня')}</span></div></div>`).join('')}</div>`;}
function financeSnapshot(){const sym=getCurrencySymbol(); return `<div class="finance-card"><div class="finance-label">БАЛАНС</div><div class="finance-balance">54 200 ${sym}</div><div class="finance-actions"><button class="primary-pill" onclick="openFinanceInfo('expense')">＋ Расход</button><button class="secondary-pill" onclick="openFinanceInfo('income')">＋ Доход</button></div><div class="finance-cats"><div class="finance-cat"><span class="amt">3 400 ${sym}</span><span class="name">Еда</span></div><div class="finance-cat"><span class="amt">1 200 ${sym}</span><span class="name">Транспорт</span></div><div class="finance-cat"><span class="amt">2 800 ${sym}</span><span class="name">Прочее</span></div></div></div>`;}
function readingSnapshot(){const book=books()[0]; if(!book)return `<div class="reading-empty"><div class="empty-book">▢</div><div><strong>Пока нет книги</strong><span>Добавь книгу и следи за страницами.</span></div></div>`; const total=Number(book.progress_total)||0; const current=Math.max(0,Number(book.progress_current)||0); const pct=total?Math.min(100,Math.round(current/total*100)):0; const left=total?Math.max(0,total-current):0; return `<button class="reading-card" onclick="openReadingProgress('${book.id}')" aria-label="Открыть прогресс чтения"><div class="book-cover"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20"/></svg><span class="book-pct">${pct}%</span></div><div class="read-text"><span class="read-title">${escapeHtml(book.title)}</span><span class="read-meta">Стр. ${current} из ${total||'?'} · осталось ${left||'—'}</span><div class="mini-progress"><span style="width:${pct}%"></span></div></div><span class="reading-edit">Изменить</span></button>`;}

function homeSection(key,tasks,done,total){
  if(key==='habit') return `<section data-home-section="habit"><div class="section-head"><h2>Привычки</h2><div class="section-actions"><button class="add-circle" onclick="window.setActiveAdd('habit');openAdd()">＋</button><button class="view-all" onclick="window.setActiveAdd('habit');openAdd()">Все ›</button></div></div><div style="margin-top:10px">${habitStrip()}</div></section>`;
  if(key==='note') return `<section data-home-section="note"><div class="section-head"><h2>Задачи на сегодня</h2><div class="section-actions"><button class="add-circle" onclick="openAddForQuest()">＋</button><button class="view-all" onclick="switchMainTab('tasks')">Все ›</button></div></div><div style="margin-top:10px">${taskRows(tasks)}</div><div class="completed-card" style="margin-top:10px"><div><div class="completed-label">ВЫПОЛНЕНО СЕГОДНЯ</div><div class="completed-value">${done} из ${total}</div></div><button class="primary-pill" onclick="openAddForQuest()">＋ Задача</button></div></section>`;
  if(key==='finance') return `<section data-home-section="finance"><div class="section-head"><h2>Финансы</h2><div class="section-actions"><button class="add-circle" onclick="openFinanceInfo('expense')">＋</button><button class="view-all" onclick="switchMainTab('finance')">Все ›</button></div></div><div style="margin-top:10px">${financeSnapshot()}</div></section>`;
  if(key==='book') return `<section data-home-section="book" style="padding-bottom:10px"><div class="section-head"><h2>Чтение</h2><div class="section-actions"><button class="add-circle" onclick="window.setActiveAdd('book');openAdd()">＋</button><button class="view-all" onclick="window.setActiveAdd('book');switchMainTab('tasks');renderTasksPage('book')">Все</button></div></div><div style="margin-top:10px">${readingSnapshot()}</div></section>`;
  return '';
}
export function renderDashboard(){const root=document.getElementById('dashboardRoot');if(!root)return; const {tasks,done,total,pct}=completionStats(); const order=getHomeOrder(); root.innerHTML=`<div class="screen-stack"><header class="greeting"><div><div class="hi">${greeting()}, ${escapeHtml(displayName())}</div><h1>Сегодня</h1></div><button class="avatar-button" onclick="switchMainTab('settings')" aria-label="Мой путь">${avatarMarkup()}</button></header><section class="hero-card"><div class="ring-wrap"><svg viewBox="0 0 200 200" style="--p:${pct/100}"><circle cx="100" cy="100" r="80" fill="none" stroke="var(--gesso-surface-recessed)" stroke-width="16"/><circle class="ring-progress" cx="100" cy="100" r="80" fill="none" stroke="var(--gesso-accent)" stroke-width="16" stroke-linecap="round" stroke-dasharray="502" stroke-dashoffset="502" transform="rotate(-90 100 100)"/></svg><div class="ring-center"><span class="num">${pct}%</span><span class="lbl">ПУТИ ПРОЙДЕНО</span></div></div><p class="hero-sub">Из <strong>${total}</strong> пунктов на сегодня выполнено <strong>${done}</strong>. ${total&&done===total?'День завершён.':'Ещё немного — и день завершён.'}</p></section>${order.map(k=>homeSection(k,tasks,done,total)).join('')}</div>`;}

export function renderFinancePage(){const root=document.getElementById('financeRoot');if(!root)return; root.innerHTML=`<div class="screen-stack"><div class="page-heading-row"><div><div class="meta-small">План</div><h1 class="page-title">Финансы</h1></div><button class="primary-icon-button" onclick="openFinanceInfo('expense')">＋</button></div><p class="page-description">Сейчас это визуальный модуль. Таблицу операций ты подключишь позже.</p><section>${financeSnapshot()}</section></div>`;}
export function openFinanceInfo(kind='expense'){const title=kind==='expense'?'Расход':'Доход';const sym=getCurrencySymbol();const modal=document.createElement('div');modal.className='modal-bg';modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><h2>${title}</h2><label>Сумма<input type="number" id="financeAmount" inputmode="decimal" placeholder="0"></label><label>Категория<input id="financeCategory" placeholder="Еда, транспорт…"></label><label>Валюта<select id="financeCurrency">${['KZT ₸','RUB ₽','USD $','EUR €','GBP £','CNY ¥'].map(v=>`<option ${getCurrencySymbol()===v.split(' ')[1]?'selected':''}>${v}</option>`).join('')}</select></label><div class="finance-form-hint">Выбрано: <strong>${sym}</strong>. Сохранение в базу добавим после подключения финансовой таблицы.</div><button class="primary" onclick="this.closest('.modal-bg').remove()">Сохранить настройку</button><button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button></div>`;document.body.appendChild(modal);}
export function openAddForQuest(){state.activeEntryType='quest';openAdd();}
export function openHabitsSheet(){ state.taskSub='habit'; window.switchMainTab?.('tasks'); window.renderTasksPage?.('habit'); }
export function renderTasksPage(active='quest'){
  state.taskSub = active;
  const root=document.getElementById('tasksRoot');
  if(!root)return;
  const quests=state.entries.filter(e=>e.type==='quest');
  const booksList=books();
  const hs=habits();
  const order=getTaskOrder();
  const labels={quest:'Квесты',book:'Книги',habit:'Привычки'};
  const tabs=order.map(key=>`<button data-task-tab="${key}" class="${active===key?'active':''}" onclick="renderTasksPage('${key}')">${labels[key]}</button>`).join('');
  const content=active==='quest'?renderQuestPage(quests):active==='book'?renderBookPage(booksList):renderHabitPage(hs);
  root.innerHTML=`<div class="screen-stack"><div class="page-heading-row"><div><div class="meta-small">Раздел</div><h1 class="page-title">Задачи</h1></div><button class="primary-icon-button" onclick="${active==='book'?'window.setActiveAdd(\'book\');openAdd()':active==='habit'?'window.setActiveAdd(\'habit\');openAdd()':'openAddForQuest()'}">＋</button></div><div class="segmented" data-task-tabs>${tabs}</div><div data-task-content="${active}">${content}</div></div>`;
}

export function adjustBookPage(id, delta){
  const e=state.entries.find(x=>x.id===id);
  if(!e || e.type!=='book') return;
  const total=Number(e.progress_total)||0;
  let next=(Number(e.progress_current)||0)+Number(delta||0);
  next=Math.max(0,Math.floor(next));
  if(total>0) next=Math.min(total,next);
  updatePage(e.id,next);
}

export function openReadingProgress(id){
  const book=state.entries.find(x=>x.id===id);
  if(!book || book.type!=='book') return;
  const total=Number(book.progress_total)||0;
  const current=Math.min(Math.max(0,Number(book.progress_current)||0), total||Number.MAX_SAFE_INTEGER);
  const pct=total?Math.min(100,Math.round(current/total*100)):0;
  const modal=document.createElement('div');
  modal.className='modal-bg';
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.innerHTML=`<div class="modal reading-progress-modal">
    <div class="modal-handle"></div>
    <h2>${escapeHtml(book.title)}</h2>
    <div class="reading-progress-summary"><strong id="readingPct">${pct}%</strong><span id="readingPagesLabel">${current} из ${total||'?'} страниц</span></div>
    <div class="reading-big-bar"><span id="readingBar" style="width:${pct}%"></span></div>
    <label>Текущая страница<input id="readingCurrentPage" type="number" inputmode="numeric" min="0" ${total?`max="${total}"`:''} value="${current}"></label>
    ${total?`<input id="readingRange" type="range" min="0" max="${total}" step="1" value="${current}" aria-label="Прогресс чтения">`:''}
    <div class="reading-step-row">
      <button class="stepper-btn" onclick="changeReadingDraft(-10)">−10</button>
      <button class="stepper-btn" onclick="changeReadingDraft(-1)">−1</button>
      <button class="stepper-btn" onclick="changeReadingDraft(1)">+1</button>
      <button class="stepper-btn" onclick="changeReadingDraft(10)">+10</button>
    </div>
    <div class="reading-remaining" id="readingRemaining">Осталось: ${total?Math.max(0,total-current):'—'} стр.</div>
    <button class="primary" onclick="saveReadingProgress('${book.id}')">Сохранить прогресс</button>
    <button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button>
  </div>`;
  document.body.appendChild(modal);
  const input=modal.querySelector('#readingCurrentPage');
  const range=modal.querySelector('#readingRange');
  const syncDraft=(raw)=>{
    let value=Math.max(0,Math.floor(Number(raw)||0));
    if(total>0)value=Math.min(total,value);
    input.value=value;
    if(range)range.value=value;
    const p=total?Math.min(100,Math.round(value/total*100)):0;
    modal.querySelector('#readingPct').textContent=`${p}%`;
    modal.querySelector('#readingPagesLabel').textContent=`${value} из ${total||'?'} страниц`;
    modal.querySelector('#readingBar').style.width=`${p}%`;
    modal.querySelector('#readingRemaining').textContent=`Осталось: ${total?Math.max(0,total-value):'—'} стр.`;
  };
  input.addEventListener('input',()=>syncDraft(input.value));
  if(range)range.addEventListener('input',()=>syncDraft(range.value));
  window.__readingDraftSync=syncDraft;
}

export function changeReadingDraft(delta){
  const input=document.getElementById('readingCurrentPage');
  if(!input)return;
  const next=(Number(input.value)||0)+Number(delta||0);
  window.__readingDraftSync?.(next);
}

export function saveReadingProgress(id){
  const input=document.getElementById('readingCurrentPage');
  const value=input?input.value:0;
  updatePage(id,value);
  document.querySelector('.reading-progress-modal')?.closest('.modal-bg')?.remove();
  delete window.__readingDraftSync;
}

// Эти три функции вызываются из inline onclick в сгенерированных карточках.
window.adjustBookPage=adjustBookPage;
window.openReadingProgress=openReadingProgress;
window.changeReadingDraft=changeReadingDraft;
window.saveReadingProgress=saveReadingProgress;

export function setActiveAdd(type){state.activeEntryType=type;}

// Reading tracker styles are injected here to keep the patch limited to the
// reading/dashboard module; no other application stylesheet needs changing.
if (!document.getElementById('reading-tracker-inline-style')) {
  const style = document.createElement('style');
  style.id = 'reading-tracker-inline-style';
  style.textContent = `
    .reading-card{cursor:pointer;position:relative}.reading-card .reading-edit{font-size:9px;font-weight:800;color:var(--gesso-accent);white-space:nowrap;align-self:flex-end}.book-progress-card .mini-progress{margin-top:8px}.stepper-btn{border:1px solid var(--gesso-divider);background:var(--gesso-surface-recessed);color:var(--gesso-fg);border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800;cursor:pointer;transition:transform .08s ease,background .16s ease}.stepper-btn:active{transform:scale(.94)}.current-page-pill{border:0;background:var(--gesso-surface);color:var(--gesso-fg);border-radius:999px;padding:6px 10px;font-size:10px;font-weight:800;cursor:pointer}.reading-progress-btn{margin-top:8px;width:100%;justify-content:center}.reading-progress-summary{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:6px 0 10px}.reading-progress-summary strong{font-size:36px;line-height:1;font-weight:800;font-family:var(--gesso-font-display)}.reading-progress-summary span{font-size:11px;color:var(--gesso-fg-muted);text-align:right}.reading-big-bar{height:10px;border-radius:999px;background:var(--gesso-surface-recessed);overflow:hidden;margin-bottom:14px}.reading-big-bar span{display:block;height:100%;background:var(--gesso-accent);border-radius:inherit;transition:width 120ms ease}.reading-progress-modal input[type=range]{width:100%;margin:4px 0 12px;accent-color:var(--gesso-accent)}.reading-step-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.reading-step-row .stepper-btn{width:100%;padding:9px 4px}.reading-remaining{font-size:11px;color:var(--gesso-fg-muted);margin:0 0 8px}.reading-progress-modal .primary{margin-top:3px}
  `;
  document.head.appendChild(style);
}
