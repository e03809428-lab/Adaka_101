-- Отзывы игроков. Применяется командой: npm run db:push
-- Каждый пользователь видит и создаёт только свои отзывы.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 3 and 1000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);
