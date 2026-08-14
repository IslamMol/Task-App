import { state } from './state.js';
import { HOME_SUBTABS_DEFAULT, TASK_SUBTABS_DEFAULT } from './constants.js';

const SUB_LABELS = { habit: 'Привычки', note: 'Дела', finance: 'Затраты', quest: 'Квесты', book: 'Книги' };

export function getHomeOrder(){
  try { return JSON.parse(localStorage.getItem('homeOrder')) || HOME_SUBTABS_DEFAULT; }
  catch { return HOME_SUBTABS_DEFAULT; }
}
export function getTaskOrder(){
  try { return JSON.parse(localStorage.getItem('taskOrder')) || TASK_SUBTABS_DEFAULT; }
  catch { return TASK_SUBTABS_DEFAULT; }
}
export function setHomeOrder(order){ localStorage.setItem('homeOrder', JSON.stringify(order)); renderSubtabs(); window.renderSettings?.(); window.renderDashboard?.(); }
export function setTaskOrder(order){ localStorage.setItem('taskOrder', JSON.stringify(order)); renderSubtabs(); window.renderSettings?.(); window.renderTasksPage?.(); }

function reorder(order, from, to){
  if(from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
  const next=[...order]; const [item]=next.splice(from,1); next.splice(to,0,item); return next;
}
export function moveHomeItem(sub, dir){
  const order=getHomeOrder(); const i=order.indexOf(sub); const j=i+dir; if(j<0||j>=order.length) return; setHomeOrder(reorder(order,i,j));
}
export function moveTaskItem(sub, dir){
  const order=getTaskOrder(); const i=order.indexOf(sub); const j=i+dir; if(j<0||j>=order.length) return; setTaskOrder(reorder(order,i,j));
}
export function dropHomeItem(sub, target){
  const order=getHomeOrder(); const from=order.indexOf(sub); const to=order.indexOf(target); setHomeOrder(reorder(order,from,to));
}
export function dropTaskItem(sub, target){
  const order=getTaskOrder(); const from=order.indexOf(sub); const to=order.indexOf(target); setTaskOrder(reorder(order,from,to));
}

function renderOrder(container, order, active, type){
  container.innerHTML=order.map((s)=>`
    <div class="settings-row reorder-row" draggable="true" data-reorder-type="${type}" data-reorder-key="${s}" ondragstart="window.startReorder(event,'${type}','${s}')" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="window.finishReorder(event,'${type}','${s}')">
      <div class="reorder-main"><span class="drag-grip" aria-hidden="true">⠿</span><span>${SUB_LABELS[s]}</span></div>
      <button class="row-chevron" onclick="${type==='home'?`window.switchHomeSub('${s}')`:`window.switchTaskSub('${s}')`}" aria-label="Открыть">›</button>
    </div>`).join('');
}

export function renderSubtabs(){
  const homeContainer=document.getElementById('homeSubtabs');
  if(homeContainer) homeContainer.innerHTML=getHomeOrder().map(s=>`<button class="subtab ${s===state.homeSub?'active':''}" data-sub="${s}" onclick="switchHomeSub('${s}')">${SUB_LABELS[s]}</button>`).join('');
  const taskContainer=document.getElementById('taskSubtabs');
  if(taskContainer) taskContainer.innerHTML=getTaskOrder().map(s=>`<button class="subtab ${s===state.taskSub?'active':''}" data-sub="${s}" onclick="switchTaskSub('${s}')">${SUB_LABELS[s]}</button>`).join('');
}

export function renderReorderSettings(view){
  renderOrder(view.querySelector('[data-order="home"]'),getHomeOrder(),state.homeSub,'home');
  renderOrder(view.querySelector('[data-order="task"]'),getTaskOrder(),state.taskSub,'task');
}

export function startReorder(e,type,key){
  e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',JSON.stringify({type,key}));
}
export function finishReorder(e,type,target){
  e.preventDefault(); document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  try{ const data=JSON.parse(e.dataTransfer.getData('text/plain')); if(data.type!==type) return; type==='home'?dropHomeItem(data.key,target):dropTaskItem(data.key,target); }catch{}
}

let pointerDrag=null;
export function startReorderPointer(e,type,key,row){
  e.preventDefault(); e.stopPropagation();
  pointerDrag={type,key,row,pointerId:e.pointerId,target:null};
  row.classList.add('dragging');
  row.setPointerCapture?.(e.pointerId);
}
export function moveReorderPointer(e){
  if(!pointerDrag) return;
  const target=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest?.('.reorder-row')).find(el=>el);
  document.querySelectorAll('.reorder-row.drag-over').forEach(el=>el.classList.remove('drag-over'));
  if(target && target!==pointerDrag.row && target.dataset.reorderType===pointerDrag.type){
    target.classList.add('drag-over'); pointerDrag.target=target;
  } else pointerDrag.target=null;
}
export function endReorderPointer(){
  if(!pointerDrag) return;
  const d=pointerDrag;
  document.querySelectorAll('.reorder-row.drag-over,.reorder-row.dragging').forEach(el=>el.classList.remove('drag-over','dragging'));
  pointerDrag=null;
  if(d.target){ const target=d.target.dataset.reorderKey; d.type==='home'?dropHomeItem(d.key,target):dropTaskItem(d.key,target); }
}

export { SUB_LABELS };
