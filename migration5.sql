-- Разрешаем новый тип записи 'event' (для календаря важных дат)
-- и добавляем поле даты события.
alter table entries drop constraint if exists entries_type_check;
alter table entries add constraint entries_type_check
  check (type in ('quest','book','habit','note','event'));

alter table entries add column if not exists event_date timestamptz;
