import { state } from './state.js';

export const SUB_LABELS = { habit:'Привычки', note:'Квесты и дела', finance:'Финансы', quest:'Квесты', book:'Книги' };
export const HOME_LABELS = { habit:'Привычки', note:'Задачи на сегодня', finance:'Финансы', book:'Чтение' };
export const CALENDAR_LABELS = { calendar:'Календарь', selected:'Выбранный день', upcoming:'Ближайшие события' };

const DEFAULTS = {
  home: ['habit','note','finance','book'],
  task: ['quest','book','habit'],
  calendar: ['calendar','selected','upcoming'],
};

function keyFor(type){ return type === 'home' ? 'homeOrder' : type === 'task' ? 'taskOrder' : 'calendarOrder'; }
function readOrder(type){
  const key=keyFor(type), fallback=DEFAULTS[type];
  try {
    const raw=JSON.parse(localStorage.getItem(key)||'null');
    const arr=Array.isArray(raw)?raw:[];
    const clean=arr.filter(k=>fallback.includes(k)); return clean.concat(fallback.filter(k=>!clean.includes(k)));
  } catch { return [...fallback]; }
}
function write(type, order){ localStorage.setItem(keyFor(type), JSON.stringify(order)); }
function move(order, from, to){ if(from<0||to<0||from>=order.length||to>=order.length||from===to) return order; const next=[...order]; const [item]=next.splice(from,1); next.splice(to,0,item); return next; }

export function getHomeOrder(){ return readOrder('home'); }
export function getTaskOrder(){ return readOrder('task'); }
export function getCalendarOrder(){ return readOrder('calendar'); }
function normalize(type, order){ const fallback=DEFAULTS[type]; const clean=Array.isArray(order)?order.filter(k=>fallback.includes(k)):[]; return clean.concat(fallback.filter(k=>!clean.includes(k))); }
export function setHomeOrder(order){ write('home', normalize('home', order)); }
export function setTaskOrder(order){ write('task', normalize('task', order)); }
export function setCalendarOrder(order){ write('calendar', normalize('calendar', order)); }
export function moveHomeItem(key, dir){ const o=getHomeOrder(), i=o.indexOf(key); if(i<0) return false; const n=move(o,i,i+dir); if(n===o) return false; setHomeOrder(n); return true; }
export function moveTaskItem(key, dir){ const o=getTaskOrder(), i=o.indexOf(key); if(i<0) return false; const n=move(o,i,i+dir); if(n===o) return false; setTaskOrder(n); return true; }
export function moveCalendarItem(key, dir){ const o=getCalendarOrder(), i=o.indexOf(key); if(i<0) return false; const n=move(o,i,i+dir); if(n===o) return false; setCalendarOrder(n); return true; }
