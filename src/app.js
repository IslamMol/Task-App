import { toggleTheme, applyTheme } from './theme.js';
import { init, toggleAuthMode, signIn, signUp } from './auth.js';
import { openCompass, saveCompass, savePathTitle, addJournalEntry } from './compass.js';
import { toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew } from './entries.js';
import { switchMainTab, switchHomeSub, switchTaskSub, initPagerSync, fabClick, toggleStatsView } from './nav.js';
import { renderDashboard, renderTasksPage, renderFinancePage, openFinanceInfo, openAddForQuest, openHabitsSheet, setActiveAdd, setActiveAdd } from './dashboard.js';
import { onSyncStatusChange, syncState } from './db/sync.js';
import { renderCalendar, renderCalendar, openEventAdd, saveNewEvent, addEventToPhoneCalendar, selectCalendarDate, changeCalendarMonth, setRelativeDay, goToday, selectCalendarDate, changeCalendarMonth, setRelativeDay, goToday } from './pages/calendar.js';
import { saveAvatar, handleAvatarUpload, usePresetAvatar, getCurrencySymbol, setCurrency, setCustomCurrency, openReorderMenu, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount, renderSettings } from './pages/settings.js';
import { moveHomeItem, moveTaskItem, startReorder, finishReorder } from './personalization.js';

// index.html до сих пор использует инлайновые onclick="..." атрибуты —
// это сохранено намеренно (см. Этап 2), поэтому нужные функции явно
// выставляются в window.
Object.assign(window, {
  toggleTheme,
  toggleAuthMode, signIn, signUp,
  openCompass, saveCompass, savePathTitle, addJournalEntry,
  toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew,
  switchMainTab, switchHomeSub, switchTaskSub, fabClick, toggleStatsView,
  renderDashboard, renderTasksPage, renderFinancePage, openFinanceInfo, openAddForQuest, openHabitsSheet, setActiveAdd,
  renderCalendar, openEventAdd, saveNewEvent, addEventToPhoneCalendar, selectCalendarDate, changeCalendarMonth, setRelativeDay, goToday,
  saveAvatar, handleAvatarUpload, usePresetAvatar, getCurrencySymbol, setCurrency, setCustomCurrency, openReorderMenu, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount, renderSettings,
  moveHomeItem, moveTaskItem, startReorder, finishReorder,
});

applyTheme();

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
