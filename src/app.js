import { toggleTheme, applyTheme, setTheme } from './theme.js';
import { init, toggleAuthMode, signIn, signUp } from './auth.js';
import { openCompass, saveCompass, savePathTitle, addJournalEntry } from './compass.js';
import { toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew, pickCategory } from './entries.js';
import { switchMainTab, switchHomeSub, switchTaskSub, initPagerSync } from './nav.js';
import { renderDashboard, renderTasksPage, openAddForQuest, openHabitsSheet, setActiveAdd } from './dashboard.js';
import { renderFinancePage, openFinanceInfo, saveTransaction, deleteTransaction, selectFinanceCategory, exportFinanceReport } from './finance.js';
import { onSyncStatusChange, syncState } from './db/sync.js';
import { renderCalendar, openEventAdd, saveNewEvent, saveEventEdit, editEvent, deleteCalendarEvent, addEventToPhoneCalendar, selectCalendarDate, changeCalendarMonth, setRelativeDay, goToday } from './pages/calendar.js';
import { handleAvatarUpload, usePresetAvatar, getCurrencySymbol, setCurrency, setCustomCurrency, openReorderMenu, moveReorderItem, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount, renderSettings } from './pages/settings.js';
import { moveHomeItem, moveTaskItem, moveCalendarItem } from './personalization.js';

// index.html до сих пор использует инлайновые onclick="..." атрибуты —
// это сохранено намеренно (см. Этап 2), поэтому нужные функции явно
// выставляются в window.
Object.assign(window, {
  toggleTheme, setTheme,
  toggleAuthMode, signIn, signUp,
  openCompass, saveCompass, savePathTitle, addJournalEntry,
  toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew, pickCategory,
  switchMainTab, switchHomeSub, switchTaskSub,
  renderDashboard, renderTasksPage, renderFinancePage, openFinanceInfo, saveTransaction, deleteTransaction, selectFinanceCategory, exportFinanceReport, openAddForQuest, openHabitsSheet, setActiveAdd,
  renderCalendar, openEventAdd, saveNewEvent, saveEventEdit, editEvent, deleteCalendarEvent, addEventToPhoneCalendar, selectCalendarDate, changeCalendarMonth, setRelativeDay, goToday,
  handleAvatarUpload, usePresetAvatar, getCurrencySymbol, setCurrency, setCustomCurrency, openReorderMenu, moveReorderItem, setAppLang, changeEmail, changePassword, logout, confirmDeleteAccount, renderSettings,
  moveHomeItem, moveTaskItem, moveCalendarItem,
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
