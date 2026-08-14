import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { cacheEntries, removeEntryFromCache } from '../db/indexeddb.js';
import { enqueue } from '../db/sync.js';

// ВАЖНО (честно, как договаривались): iOS не даёт веб-приложениям писать
// напрямую в системный Календарь — это ограничение самого Safari/iOS,
// обойти его нельзя. То, что реально работает — экспорт события в файл
// .ics, который iOS сам предлагает открыть в приложении Календарь.

export function renderCalendar(){
  const list = document.getElementById('calendarList');
  const events = state.entries
    .filter(e => e.type === 'event')
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  if(events.length === 0){
    list.innerHTML = '<div class="empty">Пока нет ни одной даты. Нажми + чтобы добавить</div>';
    return;
  }

  list.innerHTML = events.map(e => {
    const d = e.event_date ? new Date(e.event_date) : null;
    const dateStr = d ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return `<div class="card" style="--type-color:var(--c-event)">
      <div class="card-title">${escapeHtml(e.title)}</div>
      <div class="card-meta">${dateStr}</div>
      <div class="progress-input">
        <button class="ghost" style="width:auto; padding:6px 12px;" onclick="addEventToPhoneCalendar('${e.id}')">📅 В календарь телефона</button>
        <button class="ghost" style="width:auto; padding:4px 10px;" onclick="deleteEntry('${e.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

export function openEventAdd(){
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal">
      <h2>Новая дата</h2>
      <input id="newEventTitle" placeholder="Что за событие">
      <input id="newEventDate" type="date">
      <button class="primary" onclick="saveNewEvent()">Сохранить</button>
      <button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button>
    </div>`;
  document.body.appendChild(modal);
}

export async function saveNewEvent(){
  const title = document.getElementById('newEventTitle').value.trim();
  const dateVal = document.getElementById('newEventDate').value;
  if(!title || !dateVal) return;
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    type: 'event',
    title,
    event_date: new Date(dateVal).toISOString(),
    user_id: state.session.user.id,
    created_at: now,
    updated_at: now,
    done: false,
  };
  state.entries.push(row);
  document.querySelector('.modal-bg').remove();
  renderCalendar();
  cacheEntries([row]);
  enqueue('entries', 'insert', row);
}

export function addEventToPhoneCalendar(id){
  const e = state.entries.find(x => x.id === id);
  if(!e || !e.event_date) return;
  const d = new Date(e.event_date);
  const stamp = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${e.id}@put-app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${stamp.slice(0,8)}`,
    `SUMMARY:${e.title.replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.title.slice(0,30) || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
