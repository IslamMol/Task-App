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
  const statsView = document.getElementById('statsView');
  const pager = document.getElementById('pager');
  const statsBtn = document.getElementById('statsBtn');
  if(statsView && statsView.style.display === 'block'){
    statsView.style.display = 'none';
    if(pager) pager.style.display = 'flex';
    if(statsBtn) statsBtn.classList.remove('active');
  }
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.type === tab));

  const fab = document.getElementById('fab');
  if(fab) fab.style.display = tab === 'settings' ? 'none' : 'flex';

  const activePage = document.getElementById('page-' + tab);
  document.querySelectorAll('.page').forEach(page => {
    if(page !== activePage) page.classList.remove('gc-active');
    page.style.display = page === activePage ? 'block' : 'none';
  });
  if(activePage){
    activePage.classList.remove('gc-active');
    requestAnimationFrame(()=>activePage.classList.add('gc-active'));
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  if(tab === 'calendar'){ renderCalendar(); }
  if(tab === 'settings'){ renderSettings(); }
}

export function initPagerSync(){
  // Compatibility hook: the redesigned shell no longer uses the old
  // horizontal pager, but app.js can continue calling this function.
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
