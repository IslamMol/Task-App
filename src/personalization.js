import { state } from './state.js';
import { HOME_SUBTABS_DEFAULT, TASK_SUBTABS_DEFAULT } from './constants.js';

// ПРИМЕЧАНИЕ: настоящий drag-and-drop (как в Пункте управления iOS,
// с перетаскиванием пальцем) — это отдельная и довольно объёмная задача
// (нужно отслеживать touch-события, инерцию, автоскролл при перетаскивании
// к краю экрана). Вместо этого — тот же результат (можно менять порядок),
// но через кнопки "вверх/вниз". Если важен именно жест перетаскивания —
// скажи, сделаем отдельным шагом.

const SUB_LABELS = { habit: 'Привычки', note: 'Дела', finance: 'Затраты', quest: 'Квесты', book: 'Книги' };

export function getHomeOrder(){
  try { return JSON.parse(localStorage.getItem('homeOrder')) || HOME_SUBTABS_DEFAULT; }
  catch { return HOME_SUBTABS_DEFAULT; }
}
export function getTaskOrder(){
  try { return JSON.parse(localStorage.getItem('taskOrder')) || TASK_SUBTABS_DEFAULT; }
  catch { return TASK_SUBTABS_DEFAULT; }
}
export function setHomeOrder(order){ localStorage.setItem('homeOrder', JSON.stringify(order)); renderSubtabs(); }
export function setTaskOrder(order){ localStorage.setItem('taskOrder', JSON.stringify(order)); renderSubtabs(); }

export function moveHomeItem(sub, dir){
  const order = getHomeOrder();
  const i = order.indexOf(sub);
  const j = i + dir;
  if(i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  setHomeOrder(order);
}
export function moveTaskItem(sub, dir){
  const order = getTaskOrder();
  const i = order.indexOf(sub);
  const j = i + dir;
  if(i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  setTaskOrder(order);
}

export function renderSubtabs(){
  const homeContainer = document.getElementById('homeSubtabs');
  if(homeContainer){
    homeContainer.innerHTML = getHomeOrder().map(s => `
      <button class="subtab ${s === state.homeSub ? 'active' : ''}" data-sub="${s}" onclick="switchHomeSub('${s}')">${SUB_LABELS[s]}</button>
    `).join('');
  }
  const taskContainer = document.getElementById('taskSubtabs');
  if(taskContainer){
    taskContainer.innerHTML = getTaskOrder().map(s => `
      <button class="subtab ${s === state.taskSub ? 'active' : ''}" data-sub="${s}" onclick="switchTaskSub('${s}')">${SUB_LABELS[s]}</button>
    `).join('');
  }
}

export { SUB_LABELS };
