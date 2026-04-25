create or replace function public.generate_numeric_code(code_length integer)
returns text
language plpgsql
volatile
as $$
declare
  code text := '';
  index integer;
begin
  for index in 1..greatest(code_length, 1) loop
    code := code || floor(random() * 10)::integer::text;
  end loop;

  return code;
end;
$$;

create or replace function public.generate_child_link_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
set row_security = off
as $$
declare
  candidate text;
begin
  loop
    candidate := public.generate_numeric_code(10);
    exit when not exists (
      select 1
      from public.ogrenciler o
      where o.baglanti_kodu = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table if exists public.ogrenciler
  add column if not exists baglanti_kodu text,
  add column if not exists baglanti_kodu_olusturuldu_at timestamptz;

alter table if exists public.veliler
  add column if not exists teslim_pin text;

update public.ogrenciler
set
  baglanti_kodu = public.generate_child_link_code(),
  baglanti_kodu_olusturuldu_at = coalesce(baglanti_kodu_olusturuldu_at, now())
where baglanti_kodu is null;

update public.veliler
set teslim_pin = public.generate_numeric_code(4)
where teslim_pin is null
  and coalesce(teslim_alabilir, false) = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ogrenciler_baglanti_kodu_digits'
  ) then
    alter table public.ogrenciler
      add constraint ogrenciler_baglanti_kodu_digits
      check (baglanti_kodu is null or baglanti_kodu ~ '^[0-9]{10}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'veliler_teslim_pin_digits'
  ) then
    alter table public.veliler
      add constraint veliler_teslim_pin_digits
      check (teslim_pin is null or teslim_pin ~ '^[0-9]{4}$');
  end if;
end;
$$;

create unique index if not exists idx_ogrenciler_baglanti_kodu
  on public.ogrenciler (baglanti_kodu)
  where baglanti_kodu is not null;

alter table public.ogrenciler
  alter column baglanti_kodu set default public.generate_child_link_code(),
  alter column baglanti_kodu_olusturuldu_at set default now();

alter table public.veliler
  alter column teslim_pin set default public.generate_numeric_code(4);

create or replace function public.is_parent_contact_of_student(target_ogrenci_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.veliler v
    where v.user_id = auth.uid()
      and v.ogrenci_id = target_ogrenci_id
      and coalesce(v.aktif, true) = true
      and coalesce(v.iliski_tipi, 'parent') = 'parent'
  );
end;
$$;

drop policy if exists "veliler_select_self_or_school_staff" on public.veliler;
drop policy if exists "veliler_select_school_scope" on public.veliler;
create policy "veliler_select_school_scope"
on public.veliler
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_parent_contact_of_student(ogrenci_id)
);

drop policy if exists "veliler_insert_admin" on public.veliler;
drop policy if exists "veliler_insert_admin_or_parent" on public.veliler;
create policy "veliler_insert_admin_or_parent"
on public.veliler
for insert
to authenticated
with check (
  public.is_admin_for_school(okul_id)
  or (
    public.is_parent_contact_of_student(ogrenci_id)
    and coalesce(iliski_tipi, 'family') in ('family', 'approved_pickup', 'emergency')
    and user_id is null
    and coalesce(aktif, true) = true
  )
);

drop policy if exists "veliler_update_admin" on public.veliler;
drop policy if exists "veliler_update_admin_or_parent" on public.veliler;
create policy "veliler_update_admin_or_parent"
on public.veliler
for update
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or user_id = auth.uid()
  or (
    public.is_parent_contact_of_student(ogrenci_id)
    and coalesce(iliski_tipi, 'family') in ('family', 'approved_pickup', 'emergency')
  )
)
with check (
  public.is_admin_for_school(okul_id)
  or user_id = auth.uid()
  or (
    public.is_parent_contact_of_student(ogrenci_id)
    and coalesce(iliski_tipi, 'family') in ('family', 'approved_pickup', 'emergency')
    and user_id is null
  )
);

alter function public.generate_numeric_code(integer) owner to postgres;
alter function public.generate_child_link_code() owner to postgres;
alter function public.is_parent_contact_of_student(bigint) owner to postgres;
