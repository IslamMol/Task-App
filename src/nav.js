import { state } from './state.js';
import { MAIN_TABS } from './constants.js';
import { renderStats } from './stats.js';
import { openAdd } from './entries.js';
import { renderCalendar, openEventAdd } from './pages/calendar.js';
import { renderSettings } from './pages/settings.js';
import { renderSubtabs } from './personalization.js';

// --- Верхний уровень: Домой / Задания / Календарь / Настройки ---

export function switchMainTab(tab){
  state.mainTab = tab;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.type === tab));

  const fab = document.getElementById('fab');
  fab.style.display = tab === 'settings' ? 'none' : 'flex';

  const pager = document.getElementById('pager');
  const idx = MAIN_TABS.indexOf(tab);
  pager.scrollTo({ left: idx * pager.clientWidth, behavior: 'smooth' });

  if(tab === 'calendar'){ renderCalendar(); }
  if(tab === 'settings'){ renderSettings(); }
}

export function initPagerSync(){
  const pager = document.getElementById('pager');
  let ticking = false;
  pager.addEventListener('scroll', () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      const tab = MAIN_TABS[idx];
      if(tab && tab !== state.mainTab){
        state.mainTab = tab;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.type === tab));
        document.getElementById('fab').style.display = tab === 'settings' ? 'none' : 'flex';
        if(tab === 'calendar'){ renderCalendar(); }
        if(tab === 'settings'){ renderSettings(); }
      }
      ticking = false;
    });
  });
}

export function toggleStatsView(){
  const statsView = document.getElementById('statsView');
  const pager = document.getElementById('pager');
  const showing = statsView.style.display === 'block';
  if(showing){
    statsView.style.display = 'none';
    pager.style.display = 'flex';
    document.getElementById('statsBtn').classList.remove('active');
  } else {
    renderStats(statsView);
    statsView.style.display = 'block';
    pager.style.display = 'none';
    document.getElementById('statsBtn').classList.add('active');
  }
}

// Кнопка "+" в нижней панели ведёт себя по-разному в зависимости от того,
// какой раздел сейчас открыт.
export function fabClick(){
  if(state.mainTab === 'calendar'){ openEventAdd(); return; }
  openAdd();
}

// --- Подвкладки внутри "Домой": Привычки / Дела / Затраты ---

export function switchHomeSub(sub){
  state.homeSub = sub;
  renderSubtabs();
  ['habit', 'note', 'finance'].forEach(s => {
    const el = document.getElementById('home-' + s);
    if(el) el.style.display = s === sub ? 'block' : 'none';
  });
  if(sub === 'habit' || sub === 'note'){ state.activeEntryType = sub; }
}

// --- Подвкладки внутри "Задания": Квесты / Книги ---

export function switchTaskSub(sub){
  state.taskSub = sub;
  renderSubtabs();
  ['quest', 'book'].forEach(s => {
    const el = document.getElementById('task-' + s);
    if(el) el.style.display = s === sub ? 'block' : 'none';
  });
  state.activeEntryType = sub;
}
