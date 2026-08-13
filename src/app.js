import { toggleTheme, applyTheme } from './theme.js';
import { init, toggleAuthMode, signIn, signUp } from './auth.js';
import { openCompass, saveCompass, savePathTitle, addJournalEntry } from './compass.js';
import { toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew } from './entries.js';
import { switchTab, initPagerSync } from './nav.js';
import { onSyncStatusChange, syncState } from './db/sync.js';

// index.html до сих пор использует инлайновые onclick="..." атрибуты —
// это сохранено намеренно (Этап 2 = только структура, без изменения
// поведения), поэтому нужные функции явно выставляются в window.
Object.assign(window, {
  toggleTheme,
  toggleAuthMode, signIn, signUp,
  openCompass, saveCompass, savePathTitle, addJournalEntry,
  toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew,
  switchTab,
});

applyTheme();

// Тонкая точка в шапке — статус фоновой синхронизации.
// Классы совпадают со значениями syncState.status: synced/syncing/offline/error.
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
