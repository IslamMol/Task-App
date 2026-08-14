import { state } from './state.js';
import { renderCalendar } from './pages/calendar.js';
import { renderSettings } from './pages/settings.js';
import { renderDashboard, renderFinancePage, renderTasksPage } from './dashboard.js';
import { openAdd } from './entries.js';

export const MAIN_TABS = ['home','tasks','calendar','finance','settings'];
export function switchMainTab(tab){
  if(!MAIN_TABS.includes(tab)) tab='home'; state.mainTab=tab;
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+tab)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.type===tab));
  if(tab==='home') renderDashboard();
  if(tab==='tasks') renderTasksPage(state.taskSub||'quest');
  if(tab==='calendar') renderCalendar();
  if(tab==='finance') renderFinancePage();
  if(tab==='settings') renderSettings();
  window.scrollTo(0,0);
}
export function initPagerSync(){}
export function fabClick(){ openAdd(); }
export function toggleStatsView(){ switchMainTab('tasks'); }
export function switchHomeSub(sub){ state.homeSub=sub; document.querySelectorAll('#homeSubtabs .subtab').forEach(el=>el.classList.toggle('active',el.dataset.sub===sub)); if(window.renderDashboard) window.renderDashboard(); }
export function switchTaskSub(sub){ state.taskSub=sub; document.querySelectorAll('#taskSubtabs .subtab').forEach(el=>el.classList.toggle('active',el.dataset.sub===sub)); if(window.renderTasksPage) window.renderTasksPage(sub); }
