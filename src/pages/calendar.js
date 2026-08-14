import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { cacheEntries } from '../db/indexeddb.js';
import { enqueue } from '../db/sync.js';

let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = new Date();

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function fmtDate(date){ return date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}); }
function dayKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function normalizeEventDay(e){ return e.event_date ? dayKey(new Date(e.event_date)) : ''; }

export function renderCalendar(){
  const list=document.getElementById('calendarList');
  if(!list) return;
  const events=state.entries.filter(e=>e.type==='event').sort((a,b)=>new Date(a.event_date)-new Date(b.event_date));
  const eventMap=new Map();
  for(const e of events){ const k=normalizeEventDay(e); if(k) eventMap.set(k,(eventMap.get(k)||0)+1); }

  const first=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  const daysInMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,0).getDate();
  const prevDays=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),0).getDate();
  const cells=[];
  for(let i=0;i<42;i++){
    let day=i-offset+1;
    let date;
    let muted=false;
    if(day<=0){ date=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()-1,prevDays+day); muted=true; }
    else if(day>daysInMonth){ date=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,day-daysInMonth); muted=true; }
    else date=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),day);
    const key=dayKey(date);
    const today=key===dayKey(new Date());
    const selected=key===dayKey(selectedDate);
    cells.push(`<button class="calendar-cell ${muted?'muted':''} ${today?'today':''} ${selected?'selected':''}" onclick="selectCalendarDate('${key}')">${date.getDate()}${eventMap.has(key)?`<span style=\"position:absolute;width:4px;height:4px;border-radius:50%;background:${selected?'#fff':'#4b5a8c'};bottom:4px\"></span>`:''}</button>`);
  }

  const selectedEvents=events.filter(e=>normalizeEventDay(e)===dayKey(selectedDate));
  list.innerHTML=`<div class="screen-stack">
    <div><div class="meta-small">План</div><h1 class="page-title">Календарь</h1><p style="font-size:11px;color:var(--gesso-fg-muted);margin:8px 0 0">Важные даты и ближайшие события</p></div>
    <section class="simple-card">
      <div class="calendar-top"><button class="icon-plain" onclick="openEventAdd()">＋</button><div class="calendar-caption">${MONTHS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}</div><div><button class="icon-plain" onclick="changeCalendarMonth(-1)">‹</button><button class="icon-plain" onclick="changeCalendarMonth(1)">›</button></div></div>
      <div class="calendar-grid">${WEEKDAYS.map(w=>`<div class="calendar-cell weekday">${w}</div>`).join('')}${cells.join('')}</div>
    </section>
    <section><div class="section-head"><h2>${fmtDate(selectedDate)}</h2><button class="view-all" onclick="openEventAdd()">Добавить</button></div>
      <div class="event-card">${selectedEvents.length?selectedEvents.map(e=>`<div class="list-row" style="padding:4px 0 10px"><div style="width:8px;height:8px;border-radius:50%;background:#4b5a8c"></div><div style="font-size:11px;font-weight:800;flex:1">${escapeHtml(e.title)}</div><button class="icon-plain" onclick="addEventToPhoneCalendar('${e.id}')">↓</button><button class="icon-plain" onclick="deleteEntry('${e.id}');renderCalendar()">✕</button></div>`).join(''):`<div class="event-empty">${events.length?'Свободный день.<br>На этот день ничего не запланировано.':'Пока нет событий. Нажми +, чтобы добавить первое.'}</div>`}</div>
    </section>
    <section><div class="section-head"><h2>Ближайшие</h2><span class="meta-small">${events.length}</span></div>${events.slice(0,5).map(e=>`<div class="list-card"><div style="font-size:11px;font-weight:800">${escapeHtml(e.title)}</div><div class="meta-small">${fmtDate(new Date(e.event_date))}</div></div>`).join('')}</section>
  </div>`;
}

export function selectCalendarDate(key){ selectedDate=new Date(key+'T12:00:00'); renderCalendar(); }
export function changeCalendarMonth(dir){ visibleMonth=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+dir,1); renderCalendar(); }

export function openEventAdd(){
  const modal=document.createElement('div'); modal.className='modal-bg'; modal.onclick=e=>{if(e.target===modal) modal.remove()};
  modal.innerHTML=`<div class="modal"><div class="modal-handle"></div><h2>Новая дата</h2><input id="newEventTitle" placeholder="Что за событие"><input id="newEventDate" type="date" value="${dayKey(selectedDate)}"><button class="primary" onclick="saveNewEvent()">Сохранить</button><button class="ghost" onclick="this.closest('.modal-bg').remove()">Отмена</button></div>`;
  document.body.appendChild(modal);
}

export async function saveNewEvent(){
  const title=document.getElementById('newEventTitle')?.value.trim(); const dateVal=document.getElementById('newEventDate')?.value;
  if(!title||!dateVal) return;
  const now=new Date().toISOString();
  const row={id:crypto.randomUUID(),type:'event',title,event_date:new Date(dateVal+'T12:00:00').toISOString(),user_id:state.session.user.id,created_at:now,updated_at:now,done:false};
  state.entries.push(row); selectedDate=new Date(dateVal+'T12:00:00'); document.querySelector('.modal-bg')?.remove(); cacheEntries([row]); enqueue('entries','insert',row); renderCalendar();
}

export function addEventToPhoneCalendar(id){
  const e=state.entries.find(x=>x.id===id); if(!e?.event_date) return;
  const d=new Date(e.event_date); const stamp=d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',`UID:${e.id}@put-app`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${stamp.slice(0,8)}`,`SUMMARY:${e.title.replace(/\n/g,' ')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${e.title.slice(0,30)||'event'}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
}
