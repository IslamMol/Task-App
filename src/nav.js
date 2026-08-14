import { state } from './state.js';
import { renderCalendar } from './pages/calendar.js';
import { renderSettings } from './pages/settings.js';
import { renderDashboard, renderFinancePage, renderTasksPage } from './dashboard.js';
import { openAdd } from './entries.js';

export const MAIN_TABS = ['home','tasks','calendar','finance','settings'];

export function switchMainTab(tab){
  if(!MAIN_TABS.includes(tab)) tab='home';
  state.mainTab=tab;
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  const page=document.getElementById('page-'+tab);
  if(page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.type===tab));
  if(tab==='home') renderDashboard();
  if(tab==='tasks') renderTasksPage('quest');
  if(tab==='calendar') renderCalendar();
  if(tab==='finance') renderFinancePage();
  if(tab==='settings') renderSettings();
  window.scrollTo({top:0,behavior:'instant'});
}

export function initPagerSync(){
  // Pager больше не используется: жёсткий горизонтальный swipe удалён,
  // чтобы интерфейс реагировал мгновенно и не конфликтовал с вертикальным скроллом.
}

export function fabClick(){ openAdd(); }
export function toggleStatsView(){ switchMainTab('tasks'); }
export function switchHomeSub(sub){ state.homeSub=sub; }
export function switchTaskSub(sub){ state.taskSub=sub; }
