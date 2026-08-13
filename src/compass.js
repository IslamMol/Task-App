import { sb } from './services/supabase.js';
import { state } from './state.js';
import { escapeHtml } from './utils/dom.js';
import { cacheCompass, cacheCompassEntries, readCompassFromCache, readCompassEntriesFromCache } from './db/indexeddb.js';
import { enqueue } from './db/sync.js';

// Дневник "Пути" держим в памяти отдельно от state.compassItems, чтобы
// после добавления новой записи не нужно было заново идти в сеть —
// достаточно перерисовать модалку из этого локального списка.
const journalCache = {};

export async function ensureCompass(){
  try {
    const { data, error } = await sb.from('compass').select('*').order('created_at');
    if(error) throw error;
    if(data && data.length >= 3){
      state.compassItems = data;
      cacheCompass(data);
      return;
    }
    const kinds = [['dream','Мечта'],['goal','Цель'],['path','Путь']];
    const existing = (data || []).map(d => d.kind);
    const toCreate = kinds.filter(k => !existing.includes(k[0])).map(k => ({kind:k[0], title:k[1], progress_percent:0}));
    if(toCreate.length){ await sb.from('compass').insert(toCreate); }
    const r2 = await sb.from('compass').select('*').order('created_at');
    state.compassItems = r2.data || [];
    if(state.compassItems.length){ cacheCompass(state.compassItems); }
  } catch (err) {
    console.warn('Не удалось загрузить compass с сервера, читаю локальный кэш', err);
    state.compassItems = await readCompassFromCache();
  }
}

export function renderCompass(){
  const row = document.getElementById('compassRow');
  const labels = {dream:'Мечта', goal:'Цель', path:'Путь'};
  row.innerHTML = state.compassItems.map(c => `
    <div class="compass-card ${c.kind} ${c.cover_url?'has-cover':''}" onclick="openCompass('${c.id}')">
      ${c.cover_url ? `<div class="cover-bg" style="background-image:url('${c.cover_url}')"></div><div class="cover-bg" style="background:rgba(0,0,0,.35)"></div>` : `<div class="cover-grad"></div>`}
      <h3>${labels[c.kind]}</h3>
      <div class="title">${c.title || 'Нажми, чтобы задать'}</div>
      ${c.kind !== 'path' ? `
        <div class="bar"><div class="bar-fill" style="width:${c.progress_percent||0}%"></div></div>
        <div class="pct">${c.progress_percent||0}%</div>
      ` : `<div class="pct">Открыть дневник →</div>`}
    </div>
  `).join('');
}

function pathModalHtml(id, title, journal){
  return `
    <div class="modal">
      <h2>Путь</h2>
      <input id="pathTitle" placeholder="Кто ты / чем занимаешься" value="${escapeHtml(title||'')}">
      <button class="primary" onclick="savePathTitle('${id}')">Сохранить заголовок</button>
      <hr style="border-color:var(--border); margin:16px 0;">
      <textarea id="journalNote" placeholder="Новая запись в дневник пути..." rows="3"></textarea>
      <button class="primary" onclick="addJournalEntry('${id}')">Добавить запись</button>
      <div style="margin-top:16px;">
        ${(journal||[]).map(j=>`<div class="journal-entry"><div class="journal-date">${new Date(j.created_at).toLocaleDateString('ru-RU')}</div>${escapeHtml(j.note)}</div>`).join('') || '<div class="empty">Записей пока нет</div>'}
      </div>
    </div>`;
}

export async function openCompass(id){
  const c = state.compassItems.find(x => x.id === id);
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };

  if(c.kind === 'path'){
    let journal;
    try {
      const { data, error } = await sb.from('compass_entries').select('*').eq('compass_id', id).order('created_at', {ascending:false});
      if(error) throw error;
      journal = data || [];
      if(journal.length){ cacheCompassEntries(id, journal); }
    } catch (err) {
      console.warn('Не удалось загрузить дневник Пути с сервера, читаю локальный кэш', err);
      journal = await readCompassEntriesFromCache(id);
      journal.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }
    journalCache[id] = journal;
    modal.innerHTML = pathModalHtml(id, c.title, journal);
  } else {
    modal.innerHTML = `
      <div class="modal">
        <h2>${c.kind==='dream'?'Мечта':'Цель'}</h2>
        <input id="compassTitle" placeholder="Название" value="${escapeHtml(c.title||'')}">
        <input id="compassCover" placeholder="Ссылка на картинку-обложку (необязательно)" value="${escapeHtml(c.cover_url||'')}">
        <label class="card-meta">Прогресс: <span id="pctLabel">${c.progress_percent||0}</span>%</label>
        <input id="compassPct" type="range" min="0" max="100" value="${c.progress_percent||0}" oninput="document.getElementById('pctLabel').textContent=this.value">
        <button class="primary" onclick="saveCompass('${id}')">Сохранить</button>
      </div>`;
  }
  document.body.appendChild(modal);
}

export async function saveCompass(id){
  const title = document.getElementById('compassTitle').value.trim();
  const pct = Number(document.getElementById('compassPct').value);
  const cover = document.getElementById('compassCover').value.trim();
  const patch = { title, progress_percent: pct, cover_url: cover || null };

  const c = state.compassItems.find(x => x.id === id);
  if(c) Object.assign(c, patch);
  document.querySelector('.modal-bg').remove();
  renderCompass();
  cacheCompass([c]);
  enqueue('compass', 'update', { id, ...patch });
}

export async function savePathTitle(id){
  const title = document.getElementById('pathTitle').value.trim();
  const c = state.compassItems.find(x => x.id === id);
  if(c) c.title = title;
  renderCompass();
  cacheCompass([c]);
  enqueue('compass', 'update', { id, title });
}

export async function addJournalEntry(compassId){
  const note = document.getElementById('journalNote').value.trim();
  if(!note) return;
  const row = {
    id: crypto.randomUUID(),
    compass_id: compassId,
    user_id: state.session.user.id,
    note,
    created_at: new Date().toISOString(),
  };
  journalCache[compassId] = [row, ...(journalCache[compassId] || [])];
  cacheCompassEntries(compassId, [row]);
  enqueue('compass_entries', 'insert', row);

  // Перерисовываем открытую модалку локальными данными — без похода в сеть.
  const c = state.compassItems.find(x => x.id === compassId);
  document.querySelector('.modal-bg').remove();
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  modal.innerHTML = pathModalHtml(compassId, c?.title, journalCache[compassId]);
  document.body.appendChild(modal);
}
