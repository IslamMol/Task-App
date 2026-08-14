import { state } from './state.js';
import { HOME_SUBTABS_DEFAULT, TASK_SUBTABS_DEFAULT } from './constants.js';

export const SUB_LABELS = { habit:'Привычки', note:'Квесты и дела', finance:'Финансы', quest:'Квесты', book:'Книги' };
export const HOME_LABELS = { habit:'Привычки', note:'Задачи на сегодня', finance:'Финансы', book:'Чтение' };
export const CALENDAR_LABELS = { calendar:'Календарь', selected:'Выбранный день', upcoming:'Ближайшие события' };
const CALENDAR_DEFAULT = ['calendar','selected','upcoming'];

function readOrder(key, fallback){
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) && parsed.length ? parsed : [...fallback];
  } catch { return [...fallback]; }
}
function writeOrder(key, order, cb){
  localStorage.setItem(key, JSON.stringify(order));
  cb?.();
  queueMicrotask(() => {
    window.renderSettings?.();
    window.renderDashboard?.();
    window.renderTasksPage?.();
    window.renderCalendar?.();
  });
}
function reorder(order, from, to){
  if(from===to || from<0 || to<0 || from>=order.length || to>=order.length) return order;
  const next=[...order]; const [item]=next.splice(from,1); next.splice(to,0,item); return next;
}

export function getHomeOrder(){
  const raw=readOrder('homeOrder',['habit','note','finance','book']);
  const desired=['habit','note','finance','book'];
  return desired.filter(k=>raw.includes(k)).concat(desired.filter(k=>!raw.includes(k)));
}
export function getTaskOrder(){
  const raw=readOrder('taskOrder',['quest','book','habit']);
  const desired=['quest','book','habit'];
  return desired.filter(k=>raw.includes(k)).concat(desired.filter(k=>!raw.includes(k)));
}
export function getCalendarOrder(){ return readOrder('calendarOrder', CALENDAR_DEFAULT); }
export function setHomeOrder(order){ writeOrder('homeOrder', order, ()=>{ renderSubtabs(); }); }
export function setTaskOrder(order){ writeOrder('taskOrder', order, ()=>{ renderSubtabs(); }); }
export function setCalendarOrder(order){ writeOrder('calendarOrder', order, ()=>{ window.renderCalendar?.(); }); }

export function moveHomeItem(sub,dir){ const order=getHomeOrder(); const i=order.indexOf(sub); const j=i+dir; if(j>=0&&j<order.length) setHomeOrder(reorder(order,i,j)); }
export function moveTaskItem(sub,dir){ const order=getTaskOrder(); const i=order.indexOf(sub); const j=i+dir; if(j>=0&&j<order.length) setTaskOrder(reorder(order,i,j)); }
export function moveCalendarItem(sub,dir){ const order=getCalendarOrder(); const i=order.indexOf(sub); const j=i+dir; if(j>=0&&j<order.length) setCalendarOrder(reorder(order,i,j)); }
export function dropHomeItem(sub,target){ const o=getHomeOrder(); setHomeOrder(reorder(o,o.indexOf(sub),o.indexOf(target))); }
export function dropTaskItem(sub,target){ const o=getTaskOrder(); setTaskOrder(reorder(o,o.indexOf(sub),o.indexOf(target))); }
export function dropCalendarItem(sub,target){ const o=getCalendarOrder(); setCalendarOrder(reorder(o,o.indexOf(sub),o.indexOf(target))); }

export function renderSubtabs(){
  window.renderDashboard?.();
  window.renderTasksPage?.();
  window.renderCalendar?.();
  window.renderSettings?.();
}
export function startReorder(event,type,key){ event.dataTransfer?.setData('text/plain',JSON.stringify({type,key})); }
export function finishReorder(event,type,target){
  event.preventDefault();
  try{
    const data=JSON.parse(event.dataTransfer?.getData('text/plain')||'');
    if(!data?.key || data.type!==type) return;
    if(type==='home') dropHomeItem(data.key,target);
    else if(type==='task') dropTaskItem(data.key,target);
    else if(type==='calendar') dropCalendarItem(data.key,target);
  }finally{
    event.currentTarget?.classList.remove('drag-over');
  }
}
