import { sb } from './services/supabase.js';
import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { enqueue } from './db/sync.js';
import { getCurrencySymbol } from './pages/settings.js';
import {
  cacheTransactions, readTransactionsFromCache, removeTransactionFromCache,
} from './db/indexeddb.js';

const EXPENSE_CATEGORIES = [
  ['Еда','🍔'], ['Транспорт','🚗'], ['Учёба','📚'], ['Связь','📶'],
  ['Развлечения','🎮'], ['По мелочи','🧾'], ['Подписки','🔁'], ['Постоянные','📌'],
  ['Сезонные','🍂'], ['Непредвиденное','⚠️'], ['Семья и дети','👨‍👩‍👧'],
  ['Здоровье','💊'], ['Домашние','🏠'],
];
const INCOME_CATEGORIES = [
  ['Зарплата','💼'], ['Премии','🏆'], ['Бонусы','🎁'], ['Отпускные','🏖️'],
  ['Калым','🤝'], ['Продажа','💰'], ['Подарки','🎉'], ['Пособия','🧑‍🍼'], ['Пенсия','👴'],
];

// Выбранная категория в текущем открытом окне добавления операции —
// храним отдельно от DOM, чтобы не завязываться на текстовый инпут.
let selectedCategory = null;

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

function ensureCategoryChipStyles(){
  if(document.getElementById('finance-chip-style')) return;
  const style = document.createElement('style');
  style.id = 'finance-chip-style';
  style.textContent = `
    .category-grid{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}
    .category-chip{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:9999px;background:var(--gesso-surface);border:1px solid var(--gesso-divider);color:var(--gesso-fg);font-size:12px;font-weight:700;transition:transform .12s ease,background .16s ease,color .16s ease,border-color .16s ease;-webkit-tap-highlight-color:transparent}
    .category-chip:active{transform:scale(.94)}
    .category-chip .chip-icon{font-size:14px;line-height:1}
    .category-chip.active{background:var(--gesso-accent);border-color:var(--gesso-accent);color:#fff;box-shadow:0 3px 10px rgba(75,90,140,.28)}
    .category-grid.shake{animation:finance-chip-shake .4s ease}
    @keyframes finance-chip-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
  `;
  document.head.appendChild(style);
}

function categoryChipsHtml(kind){
  const list = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return `<div class="category-grid" id="categoryGrid">
    ${list.map(([name, icon]) => `<button type="button" class="category-chip" onclick="selectFinanceCategory('${name}', this)"><span class="chip-icon">${icon}</span>${escapeHtml(name)}</button>`).join('')}
  </div>`;
}

export function selectFinanceCategory(name, btn){
  selectedCategory = name;
  btn.parentElement.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
}

export function openFinanceInfo(kind = 'expense'){
  selectedCategory = null;
  ensureCategoryChipStyles();
  const title = kind === 'expense' ? 'Расход' : 'Доход';
  const sym = getCurrencySymbol();
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  modal.innerHTML = `<div class="modal">
    <div class="modal-handle"></div>
    <h2>${title}</h2>
    <label>Сумма (${sym})<input type="number" id="financeAmount" inputmode="decimal" placeholder="0"></label>
    <label>Категория</label>
    ${categoryChipsHtml(kind)}
    <label style="margin-top:12px">Описание<input id="financeDesc" placeholder="Необязательно"></label>
    <label>Дата<input type="date" id="financeDate" value="${new Date().toISOString().slice(0,10)}"></label>
    <button class="primary" onclick="saveTransaction('${kind}')">Сохранить</button>
    <button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button>
  </div>`;
  document.body.appendChild(modal);
}

export async function saveTransaction(kind){
  const amount = Number(document.getElementById('financeAmount').value);
  if(!amount || amount <= 0) return;
  if(!selectedCategory){
    document.getElementById('categoryGrid')?.classList.add('shake');
    setTimeout(() => document.getElementById('categoryGrid')?.classList.remove('shake'), 400);
    return;
  }
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    type: kind,
    amount,
    category: selectedCategory,
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
