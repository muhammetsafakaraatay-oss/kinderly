do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'personel'
  loop
    execute format('drop policy if exists %I on public.personel', policy_name);
  end loop;
end $$;

create policy "personel_select_self_only"
on public.personel
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
);

create policy "personel_insert_admin"
on public.personel
for insert
to authenticated
with check (public.is_admin_for_school(okul_id));

create policy "personel_update_admin"
on public.personel
for update
to authenticated
using (public.is_admin_for_school(okul_id))
with check (public.is_admin_for_school(okul_id));
