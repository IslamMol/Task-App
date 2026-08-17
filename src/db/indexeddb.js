// Локальная база данных на телефоне (IndexedDB через Dexie).
//
// С Этапа 4 эта база — не просто зеркало. Запись/удаление сначала
// происходит здесь и сразу видно в интерфейсе, а фактическая отправка
// на Supabase идёт через очередь (см. sync.js) — в фоне, с повторными
// попытками при сбоях сети.

export const db = new Dexie('put_app_db');

// version(2), а не правка version(1) — так Dexie понимает, что это
// осознанное обновление схемы (на будущее, если появятся ещё пользователи
// с уже созданной локальной базой версии 1).
// version(3): добавилась таблица Finance (transactions). Dexie сам
// обновит схему на устройстве при следующем открытии, старые данные
// (entries/compass/...) не затрагиваются.
db.version(3).stores({
  entries: '&id, type, user_id, updated_at, goal_id',
  compass: '&id, kind, user_id',
  compass_entries: '&id, compass_id, user_id, created_at',
  sync_queue: '++id, created_at, entity',
  transactions: '&id, type, user_id, tx_date',
});

export async function cacheEntries(entries){
  try { await db.entries.bulkPut(entries); }
  catch (err) { console.warn('IndexedDB: не удалось сохранить entries локально', err); }
}

export async function removeEntryFromCache(id){
  try { await db.entries.delete(id); }
  catch (err) { console.warn('IndexedDB: не удалось удалить entry локально', err); }
}

export async function cacheCompass(items){
  try { await db.compass.bulkPut(items); }
  catch (err) { console.warn('IndexedDB: не удалось сохранить compass локально', err); }
}

export async function cacheCompassEntries(compassId, journal){
  try { await db.compass_entries.bulkPut(journal); }
  catch (err) { console.warn('IndexedDB: не удалось сохранить compass_entries локально', err); }
}

export async function readEntriesFromCache(){
  try {
    const rows = await db.entries.toArray();
    rows.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return rows;
  } catch (err) {
    console.warn('IndexedDB: не удалось прочитать entries из кэша', err);
    return [];
  }
}

export async function readCompassFromCache(){
  try { return await db.compass.toArray(); }
  catch (err) {
    console.warn('IndexedDB: не удалось прочитать compass из кэша', err);
    return [];
  }
}

export async function readCompassEntriesFromCache(compassId){
  try { return await db.compass_entries.where('compass_id').equals(compassId).toArray(); }
  catch (err) {
    console.warn('IndexedDB: не удалось прочитать compass_entries из кэша', err);
    return [];
  }
}

export async function cacheTransactions(rows){
  try { await db.transactions.bulkPut(rows); }
  catch (err) { console.warn('IndexedDB: не удалось сохранить transactions локально', err); }
}
export async function removeTransactionFromCache(id){
  try { await db.transactions.delete(id); }
  catch (err) { console.warn('IndexedDB: не удалось удалить transaction локально', err); }
}
export async function readTransactionsFromCache(){
  try {
    const rows = await db.transactions.toArray();
    rows.sort((a,b) => new Date(b.tx_date) - new Date(a.tx_date));
    return rows;
  } catch (err) {
    console.warn('IndexedDB: не удалось прочитать transactions из кэша', err);
    return [];
  }
}
