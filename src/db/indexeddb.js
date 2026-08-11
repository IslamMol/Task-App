// Локальная база данных на телефоне (IndexedDB через Dexie).
//
// ВАЖНО про текущий этап (Этап 3 из плана):
// Сейчас это ТОЛЬКО зеркало данных из Supabase — при каждой загрузке
// entries/compass с сервера, мы также сохраняем их сюда. UI по-прежнему
// читает данные из Supabase, как и раньше (ничего не изменилось в
// поведении). Использовать эту базу как источник данных для офлайн-режима
// будем на Этапе 4 (Sync Manager) — там же появится очередь изменений,
// retry и обработка конфликтов.

export const db = new Dexie('put_app_db');

db.version(1).stores({
  // '&id' — id это первичный ключ (unique).
  // Остальные поля — то, по чему может понадобиться поиск/фильтрация.
  entries: '&id, type, user_id, updated_at, goal_id',
  compass: '&id, kind, user_id',
  compass_entries: '&id, compass_id, user_id, created_at',
});

export async function cacheEntries(entries){
  try {
    await db.entries.bulkPut(entries);
  } catch (err) {
    // Кэш не должен ломать приложение, если вдруг не сработал —
    // просто логируем и продолжаем работать как раньше (из Supabase).
    console.warn('IndexedDB: не удалось сохранить entries локально', err);
  }
}

export async function cacheCompass(items){
  try {
    await db.compass.bulkPut(items);
  } catch (err) {
    console.warn('IndexedDB: не удалось сохранить compass локально', err);
  }
}

export async function cacheCompassEntries(compassId, journal){
  try {
    await db.compass_entries.bulkPut(journal);
  } catch (err) {
    console.warn('IndexedDB: не удалось сохранить compass_entries локально', err);
  }
}
