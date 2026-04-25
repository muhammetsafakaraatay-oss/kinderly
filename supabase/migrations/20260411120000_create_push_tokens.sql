create table if not exists public.push_tokens (
  id serial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  token text not null,
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists push_tokens_token_idx on public.push_tokens(token);
