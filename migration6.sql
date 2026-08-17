-- Finance: реальные доходы/расходы вместо декоративной заглушки.

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  type text not null check (type in ('income','expense')),
  amount numeric not null check (amount > 0),
  category text,
  description text,
  tx_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table transactions enable row level security;
drop policy if exists "own transactions" on transactions;
create policy "own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
