import { state } from './state.js';
import { todayStr } from './utils/date.js';

export function renderStats(list){
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inMonth = (d) => new Date(d) >= monthStart;

  const questsDone = state.entries.filter(e => e.type==='quest' && e.done && inMonth(e.updated_at)).length;
  const today = todayStr();
  const habitsDone = state.entries.filter(e => e.type==='habit' && e.last_done_date === today).length;
  const pagesRead = state.entries.filter(e => e.type==='book').reduce((s,e)=>s+(Number(e.progress_current)||0),0);
  const notesDone = state.entries.filter(e => e.type==='note' && e.done && inMonth(e.updated_at)).length;

  list.innerHTML = `
    <div class="sub" style="margin:12px 0;">За этот месяц</div>
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--c-quest)">
        <div class="stat-num">${questsDone}</div>
        <div class="stat-label">квестов выполнено</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--c-habit)">
        <div class="stat-num">${habitsDone}</div>
        <div class="stat-label">привычек выполнено сегодня</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--c-book)">
        <div class="stat-num">${pagesRead}</div>
        <div class="stat-label">страниц прочитано всего</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--c-note)">
        <div class="stat-num">${notesDone}</div>
        <div class="stat-label">дел закрыто</div>
      </div>
    </div>
  `;
}
