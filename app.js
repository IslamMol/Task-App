import { toggleTheme, applyTheme } from './theme.js';
import { init, toggleAuthMode, signIn, signUp } from './auth.js';
import { openCompass, saveCompass, savePathTitle, addJournalEntry } from './compass.js';
import { toggleDone, toggleHabit, updatePage, deleteEntry, openAdd, saveNew } from './entries.js';
import { switchTab, initPagerSync } from './nav.js';

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

if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

init();
initPagerSync();
