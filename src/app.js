import { toggleTheme, applyTheme } from './theme.js';
import { init, toggleAuthMode, signIn, signUp } from './auth.js';
import { openCompass, saveCompass, savePathTitle, addJournalEntry } from './compass.js';
import { toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, openAddType, saveNew } from './entries.js';
import { switchMainTab, switchHomeSub, switchTaskSub, initPagerSync, fabClick, toggleStatsView } from './nav.js';
import { onSyncStatusChange, syncState } from './db/sync.js';
import { openEventAdd, saveNewEvent, addEventToPhoneCalendar, shiftCalendarMonth, selectCalendarDay } from './pages/calendar.js';
import { saveAvatar, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount } from './pages/settings.js';
import { moveHomeItem, moveTaskItem } from './personalization.js';
import { renderDashboard } from './dashboard.js';
import { initMotion } from './motion.js';

// index.html до сих пор использует инлайновые onclick="..." атрибуты —
// это сохранено намеренно (см. Этап 2), поэтому нужные функции явно
// выставляются в window.
Object.assign(window, {
  toggleTheme,
  toggleAuthMode, signIn, signUp,
  openCompass, saveCompass, savePathTitle, addJournalEntry,
  toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, openAddType, saveNew,
  switchMainTab, switchHomeSub, switchTaskSub, fabClick, toggleStatsView,
  openEventAdd, saveNewEvent, addEventToPhoneCalendar, shiftCalendarMonth, selectCalendarDay,
  saveAvatar, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount,
  moveHomeItem, moveTaskItem, renderDashboard,
});

applyTheme();
initMotion();

// Тонкая точка в шапке — статус фоновой синхронизации.
function updateSyncDot(status){
  const dot = document.getElementById('syncDot');
  if(!dot) return;
  dot.classList.remove('syncing', 'offline', 'error');
  if(status !== 'synced'){ dot.classList.add(status); }
}
onSyncStatusChange(updateSyncDot);
updateSyncDot(syncState.status);

if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

init();
initPagerSync();
