-- ============================================================
-- TABEL PENGAJUAN KEBUTUHAN JF ARSIPARIS (kalkulator-jfa.html)
-- Jalankan sekali di Supabase -> SQL Editor.
--
-- Aturan akses:
--  * Siapa pun (instansi, tanpa login) boleh MENGIRIM pengajuan baru.
--  * Hanya admin ANRI (app_metadata.role = 'admin') yang boleh MELIHAT,
--    MENGUBAH status, dan MENGHAPUS pengajuan.
-- ============================================================

create table if not exists public.jfa_pengajuan (
  id               uuid primary key default gen_random_uuid(),
  kode             text not null unique check (kode ~ '^[A-Z0-9]{8}$'),
  created_at       timestamptz not null default now(),
  instansi         text not null check (char_length(instansi) between 3 and 200),
  pengirim_nama    text check (char_length(pengirim_nama) <= 120),
  pengirim_jabatan text check (char_length(pengirim_jabatan) <= 120),
  pengirim_kontak  text check (char_length(pengirim_kontak) <= 120),
  jumlah_unit      int  not null check (jumlah_unit between 1 and 200),
  rekap            jsonb not null,   -- kebutuhan & ketersediaan per unit dan total
  detail           jsonb not null,   -- isian lengkap setiap unit (untuk dihitung ulang)
  status           text not null default 'baru' check (status in ('baru','diproses','selesai')),
  catatan_admin    text,
  constraint jfa_pengajuan_ukuran check (pg_column_size(detail) < 600000 and pg_column_size(rekap) < 200000)
);

alter table public.jfa_pengajuan enable row level security;

drop policy if exists "jfa_kirim_publik" on public.jfa_pengajuan;
create policy "jfa_kirim_publik" on public.jfa_pengajuan
  for insert to anon, authenticated
  with check (status = 'baru' and catatan_admin is null);

drop policy if exists "jfa_admin_kelola" on public.jfa_pengajuan;
create policy "jfa_admin_kelola" on public.jfa_pengajuan
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists jfa_pengajuan_created_idx on public.jfa_pengajuan (created_at desc);
