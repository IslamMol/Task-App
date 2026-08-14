export const TYPE_COLOR = {
  quest: 'var(--c-quest)',
  habit: 'var(--c-habit)',
  book:  'var(--c-book)',
  note:  'var(--c-note)',
  event: 'var(--c-event)',
};

export const CATEGORY_EMOJI = {
  'купить':     '🛒',
  'не забыть':  '📌',
  'сделать':    '✅',
  'попробовать':'🌟',
};

// Куда рендерится каждый тип записи внутри новой структуры (Домой/Задания).
export const CONTAINER_ID = {
  habit: 'home-habit',
  note:  'home-note',
  quest: 'task-quest',
  book:  'task-book',
};

export const MAIN_TABS = ['home', 'tasks', 'calendar', 'settings'];
export const HOME_SUBTABS_DEFAULT = ['habit', 'note', 'finance'];
export const TASK_SUBTABS_DEFAULT = ['quest', 'book'];
