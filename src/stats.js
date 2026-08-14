import { state } from './state.js';
import { todayStr } from './utils/date.js';

function dayKey(d){ return d.toISOString().slice(0,10); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

export function renderStats(list){
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inMonth = d => d && new Date(d) >= monthStart;
  const actions = state.entries.filter(e => ['habit','note','quest'].includes(e.type));
  const doneToday = actions.filter(e => e.type === 'habit' ? e.last_done_date === todayStr() : !!e.done).length;
  const questsDone = state.entries.filter(e => e.type==='quest' && e.done && inMonth(e.updated_at)).length;
  const habitsDone = state.entries.filter(e => e.type==='habit' && e.last_done_date === todayStr()).length;
  const pagesRead = state.entries.filter(e => e.type==='book').reduce((s,e)=>s+(Number(e.progress_current)||0),0);
  const notesDone = state.entries.filter(e => e.type==='note' && e.done && inMonth(e.updated_at)).length;
  const completion = actions.length ? Math.round(doneToday / actions.length * 100) : 0;

  const recent = [];
  for(let i=6;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i); const key=dayKey(d);
    const total = actions.filter(e => e.type==='habit' || e.done || e.last_done_date===key).length;
    const done = actions.filter(e => e.type==='habit' ? e.last_done_date===key : (e.done && dayKey(new Date(e.updated_at||e.created_at))===key)).length;
    recent.push({ label:d.toLocaleDateString('ru-RU',{weekday:'short'}).replace('.',''), value: total ? Math.round(done/Math.max(1,total)*100) : 0 });
  }

  list.innerHTML = `
    <div class="stats-shell stats-shell-v6">
      <div class="stats-header"><div><div class="stats-kicker">АНАЛИТИКА</div><div class="stats-title">Твоя динамика</div><div class="stats-caption">Последние 7 дней и текущий месяц</div></div><button class="stats-close" onclick="toggleStatsView()">×</button></div>
      <div class="stats-hero-card">
        <div><div class="stats-hero-label">Сегодня</div><div class="stats-hero-num">${completion}%</div><div class="stats-hero-sub">${doneToday} из ${actions.length || 0} пунктов завершено</div></div>
        <div class="stats-mini-ring" style="--p:${completion}"><span>${completion}%</span></div>
      </div>
      <div class="stats-chart-card"><div class="stats-chart-head"><div><strong>Ритм недели</strong><span>процент выполнения</span></div><span class="stats-range">7 дней</span></div><div class="stats-bars">${recent.map(x=>`<div class="stats-bar-col"><div class="stats-bar-track"><div class="stats-bar-fill" style="height:${clamp(x.value,4,100)}%"></div></div><span>${x.label}</span></div>`).join('')}</div></div>
      <div class="stats-grid stats-grid-v6">
        <div class="stats-card accent"><div class="stats-num">${questsDone}</div><div class="stats-label">квестов в этом месяце</div></div>
        <div class="stats-card"><div class="stats-num">${habitsDone}</div><div class="stats-label">привычек сегодня</div></div>
        <div class="stats-card"><div class="stats-num">${pagesRead}</div><div class="stats-label">прочитано страниц</div></div>
        <div class="stats-card"><div class="stats-num">${notesDone}</div><div class="stats-label">дел закрыто</div></div>
      </div>
    </div>`;
}
