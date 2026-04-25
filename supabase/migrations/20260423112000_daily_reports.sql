create table if not exists public.gun_sonu_raporlari (
  id bigserial primary key,
  okul_id integer not null references public.okullar(id) on delete cascade,
  ogrenci_id bigint not null references public.ogrenciler(id) on delete cascade,
  tarih date not null,
  baslik text not null,
  icerik text not null,
  ozet jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (okul_id, ogrenci_id, tarih)
);

create index if not exists idx_gun_sonu_raporlari_student_date
  on public.gun_sonu_raporlari (okul_id, ogrenci_id, tarih desc);

alter table public.gun_sonu_raporlari enable row level security;

drop policy if exists "gun_sonu_raporlari_select_school_scope" on public.gun_sonu_raporlari;
create policy "gun_sonu_raporlari_select_school_scope"
on public.gun_sonu_raporlari
for select
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
  or public.is_active_parent_of_student(ogrenci_id)
);

drop policy if exists "gun_sonu_raporlari_insert_staff" on public.gun_sonu_raporlari;
create policy "gun_sonu_raporlari_insert_staff"
on public.gun_sonu_raporlari
for insert
to authenticated
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);

drop policy if exists "gun_sonu_raporlari_update_staff" on public.gun_sonu_raporlari;
create policy "gun_sonu_raporlari_update_staff"
on public.gun_sonu_raporlari
for update
to authenticated
using (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
)
with check (
  public.is_admin_for_school(okul_id)
  or public.is_teacher_for_student(okul_id, ogrenci_id)
);
