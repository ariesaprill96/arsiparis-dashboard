-- ============================================================
-- MIGRASI LOGIN ADMIN KE SUPABASE AUTH
-- Jalankan di Supabase -> SQL Editor, SETELAH membuat pengguna admin
-- di Authentication -> Users -> Add user (centang "Auto Confirm User").
--
-- Akun admin: email admin123@arsiparis.local
-- (di dashboard cukup login dengan username "admin123"; bagian
--  "@arsiparis.local" ditambahkan otomatis oleh aplikasi)
-- ============================================================

-- 1. Beri hak admin. app_metadata hanya bisa diubah dari server/SQL,
--    jadi pengguna biasa tidak bisa memberi dirinya sendiri hak ini.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin123@arsiparis.local';

-- 2. Tulis data instansi hanya untuk admin (sebelumnya: semua pengguna terautentikasi)
drop policy if exists "write_authenticated" on public.instansi;
drop policy if exists "admin_write" on public.instansi;
create policy "admin_write" on public.instansi
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3. Tutup akses baca tabel admin_users lama (berisi sidik password).
--    RLS tetap aktif tanpa policy = tidak bisa dibaca lewat API publik.
drop policy if exists "admin_login_check" on public.admin_users;

-- 4. (Opsional, setelah login baru dipastikan berjalan) hapus tabel lama:
-- drop table if exists public.admin_users;

-- Cek hasil:
-- select email, raw_app_meta_data from auth.users where email = 'admin123@arsiparis.local';
-- select policyname, cmd, roles from pg_policies where tablename in ('instansi','admin_users');
