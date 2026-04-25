do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'servis'
      and column_name = 'tarih'
  ) then
    execute 'alter table public.servis alter column tarih set default current_date';
  end if;
end $$;
