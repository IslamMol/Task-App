import { sb } from './services/supabase.js';
import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { enqueue } from './db/sync.js';
import { getCurrencySymbol } from './pages/settings.js';
import {
  cacheTransactions, readTransactionsFromCache, removeTransactionFromCache,
} from './db/indexeddb.js';

function fmt(n){ return Number(n||0).toLocaleString('ru-RU'); }

export async function loadFinance(){
  try {
    const { data, error } = await sb.from('transactions').select('*').order('tx_date', {ascending:false});
    if(error) throw error;
    state.transactions = data || [];
    if(state.transactions.length){ cacheTransactions(state.transactions); }
  } catch (err) {
    console.warn('Finance: не удалось загрузить с сервера, читаю локальный кэш', err);
    state.transactions = await readTransactionsFromCache();
  }
}

function monthStart(){
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function totals(){
  const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
  const expense = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  return { income, expense, balance: income - expense };
}

// Топ категорий расходов за текущий месяц — то, что раньше было
// захардкожено как "Еда / Транспорт / Прочее" с фиксированными числами.
function topCategoriesThisMonth(limit=3){
  const mStart = monthStart();
  const byCat = {};
  state.transactions
    .filter(t => t.type === 'expense' && new Date(t.tx_date) >= mStart)
    .forEach(t => {
      const cat = t.category || 'Без категории';
      byCat[cat] = (byCat[cat] || 0) + Number(t.amount);
    });
  return Object.entries(byCat)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit);
}

// Используется и на "Домой" (свёрнутая карточка), и на полной странице
// "Финансы" — теперь показывает реальный баланс и реальные категории
// вместо декоративных чисел из макета.
export function financeSnapshot(){
  const sym = getCurrencySymbol();
  const { balance } = totals();
  const cats = topCategoriesThisMonth();
  const catsHtml = cats.length
    ? cats.map(([name, amt]) => `<div class="finance-cat"><span class="amt">${fmt(amt)} ${sym}</span><span class="name">${escapeHtml(name)}</span></div>`).join('')
    : `<div class="finance-cat"><span class="amt">—</span><span class="name">Пока нет расходов</span></div>`;
  return `<div class="finance-card">
    <div class="finance-label">БАЛАНС</div>
    <div class="finance-balance">${fmt(balance)} ${sym}</div>
    <div class="finance-actions">
      <button class="primary-pill" onclick="openFinanceInfo('expense')">＋ Расход</button>
      <button class="secondary-pill" onclick="openFinanceInfo('income')">＋ Доход</button>
    </div>
    <div class="finance-cats">${catsHtml}</div>
  </div>`;
}

function txRowHtml(t){
  const isIncome = t.type === 'income';
  const sym = getCurrencySymbol();
  const dateStr = new Date(t.tx_date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'});
  return `<div class="list-card">
    <div class="list-row">
      <div style="min-width:0;flex:1">
        <div style="font-size:12px;font-weight:800;${isIncome ? 'color:var(--gesso-accent)' : ''}">${isIncome?'+':'−'}${fmt(t.amount)} ${sym}${t.category ? ` · ${escapeHtml(t.category)}` : ''}</div>
        <div class="meta-small">${dateStr}${t.description ? ` · ${escapeHtml(t.description)}` : ''}</div>
      </div>
      <button class="icon-plain" onclick="deleteTransaction('${t.id}')">✕</button>
    </div>
  </div>`;
}

// Полная страница "Финансы" — снапшот сверху + реальная история операций
// под ним (раньше там было только "Таблицу операций подключишь позже").
export function renderFinancePage(){
  const root = document.getElementById('financeRoot');
  if(!root) return;
  const history = state.transactions.slice(0, 50);
  root.innerHTML = `<div class="screen-stack">
    <div class="page-heading-row">
      <div><div class="meta-small">План</div><h1 class="page-title">Финансы</h1></div>
      <button class="primary-icon-button" onclick="openFinanceInfo('expense')">＋</button>
    </div>
    <section>${financeSnapshot()}</section>
    <section style="margin-top:14px">
      <div class="section-head"><h2>История</h2></div>
      <div style="margin-top:10px">
        ${history.length ? history.map(txRowHtml).join('') : `<div class="empty-page"><div class="empty-icon big">₸</div><strong>Пока нет операций</strong><span>Добавь первый доход или расход.</span></div>`}
      </div>
    </section>
  </div>`;
}

export function openFinanceInfo(kind = 'expense'){
  const title = kind === 'expense' ? 'Расход' : 'Доход';
  const sym = getCurrencySymbol();
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  modal.innerHTML = `<div class="modal">
    <div class="modal-handle"></div>
    <h2>${title}</h2>
    <label>Сумма (${sym})<input type="number" id="financeAmount" inputmode="decimal" placeholder="0"></label>
    <label>Категория<input id="financeCategory" placeholder="Еда, транспорт…"></label>
    <label>Описание<input id="financeDesc" placeholder="Необязательно"></label>
    <label>Дата<input type="date" id="financeDate" value="${new Date().toISOString().slice(0,10)}"></label>
    <button class="primary" onclick="saveTransaction('${kind}')">Сохранить</button>
    <button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button>
  </div>`;
  document.body.appendChild(modal);
}

export async function saveTransaction(kind){
  const amount = Number(document.getElementById('financeAmount').value);
  if(!amount || amount <= 0) return;
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    type: kind,
    amount,
    category: document.getElementById('financeCategory').value.trim() || null,
    description: document.getElementById('financeDesc').value.trim() || null,
    tx_date: document.getElementById('financeDate').value || now.slice(0,10),
    user_id: state.session.user.id,
    created_at: now,
    updated_at: now,
  };
  state.transactions.unshift(row);
  document.querySelector('.modal-bg')?.remove();
  refreshFinanceViews();
  cacheTransactions([row]);
  enqueue('transactions', 'insert', row);
}

export async function deleteTransaction(id){
  state.transactions = state.transactions.filter(t => t.id !== id);
  refreshFinanceViews();
  removeTransactionFromCache(id);
  enqueue('transactions', 'delete', { id });
}

// И "Домой", и полная страница "Финансы" могут быть видны/актуальны
// одновременно — перерисовываем оба места, если их DOM сейчас существует.
function refreshFinanceViews(){
  window.renderDashboard?.();
  if(document.getElementById('financeRoot')?.innerHTML){ renderFinancePage(); }
}
