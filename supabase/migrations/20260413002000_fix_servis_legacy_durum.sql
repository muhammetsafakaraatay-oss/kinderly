do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'servis'
      and column_name = 'durum'
  ) then
    execute 'alter table public.servis alter column durum set default ''aktif''';
  end if;
end $$;
