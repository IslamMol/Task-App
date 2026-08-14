import { state } from './state.js';
import { HOME_SUBTABS_DEFAULT, TASK_SUBTABS_DEFAULT } from './constants.js';

const SUB_LABELS = { habit: 'Привычки', note: 'Дела', finance: 'Затраты', quest: 'Квесты', book: 'Книги' };
const HOME_KEY = 'homeOrder';
const TASK_KEY = 'taskOrder';

function safeOrder(key, fallback){
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(value) && value.length) return [...value];
  } catch {}
  return [...fallback];
}
function normalize(order, allowed){
  const unique = [...new Set(order)].filter(x => allowed.includes(x));
  for (const item of allowed) if (!unique.includes(item)) unique.push(item);
  return unique;
}
export function getHomeOrder(){ return normalize(safeOrder(HOME_KEY, HOME_SUBTABS_DEFAULT), HOME_SUBTABS_DEFAULT); }
export function getTaskOrder(){ return normalize(safeOrder(TASK_KEY, TASK_SUBTABS_DEFAULT), TASK_SUBTABS_DEFAULT); }

function afterOrderChanged(){
  renderSubtabs();
  window.renderSettings?.();
  window.renderDashboard?.();
  window.renderTasksPage?.(state.taskSub || getTaskOrder()[0]);
}
export function setHomeOrder(order){ localStorage.setItem(HOME_KEY, JSON.stringify(normalize(order, HOME_SUBTABS_DEFAULT))); afterOrderChanged(); }
export function setTaskOrder(order){ localStorage.setItem(TASK_KEY, JSON.stringify(normalize(order, TASK_SUBTABS_DEFAULT))); afterOrderChanged(); }

function reorder(order, from, to){
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return [...order];
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function moveHomeItem(sub, dir){ const o=getHomeOrder(), i=o.indexOf(sub), j=i+dir; if(j<0||j>=o.length)return; setHomeOrder(reorder(o,i,j)); }
export function moveTaskItem(sub, dir){ const o=getTaskOrder(), i=o.indexOf(sub), j=i+dir; if(j<0||j>=o.length)return; setTaskOrder(reorder(o,i,j)); }
export function dropHomeItem(sub,target){ const o=getHomeOrder(),from=o.indexOf(sub),to=o.indexOf(target); if(from>=0&&to>=0)setHomeOrder(reorder(o,from,to)); }
export function dropTaskItem(sub,target){ const o=getTaskOrder(),from=o.indexOf(sub),to=o.indexOf(target); if(from>=0&&to>=0)setTaskOrder(reorder(o,from,to)); }

export function renderSubtabs(){
  const home=document.getElementById('homeSubtabs');
  if(home) home.innerHTML=getHomeOrder().map(s=>`<button class="subtab ${s===state.homeSub?'active':''}" data-sub="${s}" onclick="switchHomeSub('${s}')">${SUB_LABELS[s]}</button>`).join('');
  const task=document.getElementById('taskSubtabs');
  if(task) task.innerHTML=getTaskOrder().map(s=>`<button class="subtab ${s===state.taskSub?'active':''}" data-sub="${s}" onclick="switchTaskSub('${s}')">${SUB_LABELS[s]}</button>`).join('');
}

let activeDrag = null;
export function startReorderPointer(e, type, key, row){
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  activeDrag = { type, key, row, target: null, moved: false };
  row.classList.add('dragging');
  row.setPointerCapture?.(e.pointerId);
}
export function moveReorderPointer(e){
  if(!activeDrag) return;
  activeDrag.moved = true;
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  const target = els.find(el => el?.closest?.('.reorder-row'))?.closest('.reorder-row');
  document.querySelectorAll('.reorder-row.drag-over').forEach(el=>el.classList.remove('drag-over'));
  if(target && target !== activeDrag.row && target.dataset.reorderType === activeDrag.type){
    target.classList.add('drag-over');
    activeDrag.target = target;
  } else activeDrag.target = null;
}
export function endReorderPointer(e){
  if(!activeDrag) return;
  const d=activeDrag;
  document.querySelectorAll('.reorder-row.drag-over,.reorder-row.dragging').forEach(el=>el.classList.remove('drag-over','dragging'));
  activeDrag=null;
  if(d.target){
    const target=d.target.dataset.reorderKey;
    d.type==='home'?dropHomeItem(d.key,target):dropTaskItem(d.key,target);
  }
}

export function startReorder(e,type,key){
  if(!e.dataTransfer)return;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',JSON.stringify({type,key}));
}
export function finishReorder(e,type,target){
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  try{ const data=JSON.parse(e.dataTransfer?.getData('text/plain')||'{}'); if(data.type!==type)return; type==='home'?dropHomeItem(data.key,target):dropTaskItem(data.key,target); }catch{}
}

export { SUB_LABELS };
