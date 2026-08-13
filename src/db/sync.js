import { db } from './indexeddb.js';
import { sb } from '../services/supabase.js';

// Единственные допустимые значения статуса — держим простыми специально
// (см. задание: "не перегружай UI этими статусами").
// 'synced'  — очередь пуста, всё отправлено
// 'syncing' — сейчас идёт отправка
// 'offline' — сети нет, изменения копятся в очереди
// 'error'   — сеть есть, но часть изменений не смогла отправиться (после MAX_ATTEMPTS)
export const syncState = { status: 'synced' };

const MAX_ATTEMPTS = 5;
let flushing = false;
const listeners = new Set();

export function onSyncStatusChange(fn){ listeners.add(fn); }
function notify(){ listeners.forEach(fn => fn(syncState.status)); }

function setStatus(next){
  if(syncState.status !== next){
    syncState.status = next;
    notify();
  }
}

export async function enqueue(entity, op, payload){
  await db.sync_queue.add({ entity, op, payload, created_at: Date.now(), attempts: 0 });
  flushQueue();
}

export async function flushQueue(){
  if(flushing) return;
  if(!navigator.onLine){ setStatus('offline'); return; }
  flushing = true;
  setStatus('syncing');
  try {
    const items = await db.sync_queue.orderBy('created_at').toArray();
    for(const item of items){
      const ok = await sendOne(item);
      if(ok){
        await db.sync_queue.delete(item.id);
        continue;
      }
      const attempts = (item.attempts || 0) + 1;
      if(attempts >= MAX_ATTEMPTS){
        // Не блокируем очередь навсегда одной "битой" записью —
        // помечаем и идём дальше, но данные остаются в очереди на виду.
        await db.sync_queue.update(item.id, { attempts });
        continue;
      }
      await db.sync_queue.update(item.id, { attempts });
      break; // сохраняем порядок отправки — стоп до следующей попытки
    }
    const remaining = await db.sync_queue.count();
    setStatus(remaining ? 'error' : 'synced');
  } catch (err) {
    console.warn('Sync Manager: ошибка при обработке очереди', err);
    setStatus('error');
  } finally {
    flushing = false;
  }
}

async function sendOne(item){
  try {
    const table = item.entity;
    if(item.op === 'insert'){
      const { error } = await sb.from(table).insert(item.payload);
      return !error;
    }
    if(item.op === 'update'){
      const { id, ...fields } = item.payload;
      const { error } = await sb.from(table).update(fields).eq('id', id);
      return !error;
    }
    if(item.op === 'delete'){
      const { error } = await sb.from(table).delete().eq('id', item.payload.id);
      return !error;
    }
    return true;
  } catch (err) {
    // Сетевая ошибка (нет соединения) — не считается "битой записью",
    // просто повторим позже.
    return false;
  }
}

window.addEventListener('online', flushQueue);
window.addEventListener('offline', () => setStatus('offline'));

// Проверяем очередь сразу при загрузке — вдруг остались несинхронизированные
// изменения с прошлого раза (например, приложение закрыли в офлайне).
flushQueue();
