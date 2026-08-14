import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { cacheEntries } from '../db/indexeddb.js';
import { enqueue } from '../db/sync.js';

let calendarCursor = new Date();

function monthName(d){ return d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase()); }
function isoDay(d){ return d.toISOString().slice(0,10); }
function eventsForDay(key){ return state.entries.filter(e=>e.type==='event' && e.event_date && isoDay(new Date(e.event_date))===key); }

export function renderCalendar(){
  const list=document.getElementById('calendarList'); if(!list) return;
  const y=calendarCursor.getFullYear(), m=calendarCursor.getMonth();
  const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay()+1);
  const today=isoDay(new Date());
  const cells=[];
  for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const key=isoDay(d); const outside=d.getMonth()!==m; const ev=eventsForDay(key); cells.push(`<button class="calendar-day ${outside?'outside':''} ${key===today?'today':''} ${ev.length?'has-event':''}" onclick="selectCalendarDay('${key}')"><span>${d.getDate()}</span>${ev.length?'<i></i>':''}</button>`); }
  const upcoming=state.entries.filter(e=>e.type==='event').sort((a,b)=>new Date(a.event_date)-new Date(b.event_date)).slice(0,5);
  list.innerHTML=`
    <div class="calendar-shell-v6">
      <div class="calendar-head-v6"><div><div class="stats-kicker">ПЛАН</div><h1>Календарь</h1><p>Важные даты и ближайшие события</p></div><button class="calendar-add-mini" onclick="openEventAdd()">+</button></div>
      <div class="calendar-card-v6">
        <div class="calendar-toolbar"><button onclick="shiftCalendarMonth(-1)">‹</button><strong>${monthName(calendarCursor)}</strong><button onclick="shiftCalendarMonth(1)">›</button></div>
        <div class="calendar-weekdays">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<span>${x}</span>`).join('')}</div>
        <div class="calendar-grid-v6">${cells.join('')}</div>
      </div>
      <div id="selectedDayEvents" class="selected-day-v6"></div>
      <div class="upcoming-v6"><div class="upcoming-head"><h2>Ближайшие</h2><span>${upcoming.length}</span></div>${upcoming.length?upcoming.map(e=>{const d=new Date(e.event_date);return `<article class="upcoming-item"><div class="upcoming-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('ru-RU',{month:'short'}).replace('.','')}</span></div><div><strong>${escapeHtml(e.title)}</strong><span>${d.toLocaleDateString('ru-RU',{weekday:'long'})}</span></div><div class="upcoming-actions"><button onclick="addEventToPhoneCalendar('${e.id}')" aria-label="Добавить в календарь">↗</button><button onclick="deleteEntry('${e.id}')" aria-label="Удалить">×</button></div></article>`}).join(''):'<div class="empty">Пока нет событий. Нажми +, чтобы добавить первое.</div>'}</div>
    </div>`;
  selectCalendarDay(today);
}

export function shiftCalendarMonth(dir){ calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+dir,1); renderCalendar(); }
export function selectCalendarDay(key){
  const el=document.getElementById('selectedDayEvents'); if(!el) return;
  const d=new Date(key+'T12:00:00'); const events=eventsForDay(key);
  el.innerHTML=`<div class="selected-head"><strong>${d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</strong><span>${events.length?'Есть события':'Свободный день'}</span></div>${events.length?events.map(e=>`<div class="selected-event"><span class="event-dot"></span><div><strong>${escapeHtml(e.title)}</strong><span>Важная дата</span></div><div class="selected-actions"><button onclick="addEventToPhoneCalendar('${e.id}')" aria-label="Добавить в календарь">↗</button><button onclick="deleteEntry('${e.id}')" aria-label="Удалить">×</button></div></div>`).join(''):'<div class="selected-empty">На этот день ничего не запланировано.</div>'}`;
}

export function openEventAdd(){
  const modal=document.createElement('div'); modal.className='modal-bg add-sheet-bg'; modal.onclick=e=>{if(e.target===modal) modal.remove();};
  modal.innerHTML=`<div class="modal add-sheet" role="dialog"><div class="sheet-handle"></div><div class="sheet-head"><div><div class="sheet-kicker">НОВОЕ СОБЫТИЕ</div><h2>Важная дата</h2></div><button class="sheet-close" onclick="this.closest('.modal-bg').remove()">×</button></div><label class="field-label">Название</label><input class="sheet-input" id="newEventTitle" placeholder="Например, день рождения"><label class="field-label">Дата</label><input class="sheet-input" id="newEventDate" type="date"><button class="sheet-primary" onclick="saveNewEvent()">Добавить событие</button><button class="sheet-secondary" onclick="this.closest('.modal-bg').remove()">Отмена</button></div>`;
  document.body.appendChild(modal); setTimeout(()=>document.getElementById('newEventTitle')?.focus(),30);
}

export async function saveNewEvent(){
  const title=document.getElementById('newEventTitle')?.value.trim(), dateVal=document.getElementById('newEventDate')?.value; if(!title||!dateVal) return;
  const now=new Date().toISOString(); const row={id:crypto.randomUUID(),type:'event',title,event_date:new Date(dateVal+'T12:00:00').toISOString(),user_id:state.session.user.id,created_at:now,updated_at:now,done:false};
  state.entries.push(row); document.querySelector('.modal-bg')?.remove(); renderCalendar(); cacheEntries([row]); enqueue('entries','insert',row);
}

export function addEventToPhoneCalendar(id){
  const e=state.entries.find(x=>x.id===id); if(!e||!e.event_date)return; const d=new Date(e.event_date); const stamp=d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',`UID:${e.id}@put-app`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${stamp.slice(0,8)}`,`SUMMARY:${e.title.replace(/\n/g,' ')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download=`${e.title.slice(0,30)||'event'}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
}
