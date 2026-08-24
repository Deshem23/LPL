-- The media table (migrations/01_create_tables.sql) has existed since
-- the start, and the upload API code already targets a Supabase Storage
-- bucket called "media" - but nothing ever actually created that bucket,
-- so every upload has been failing with "Bucket not found". This creates
-- it (public, so uploaded files are servable by direct URL, matching
-- what getPublicUrl() in the upload route assumes).

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Basic storage.objects policies for the bucket. The app's own upload/
-- delete routes go through the service-role client (bypasses storage
-- RLS entirely), so these aren't required for the admin media page to
-- work - they're here so the bucket behaves sanely if anything ever
-- reads/writes it with a regular (anon/authenticated) client instead.
drop policy if exists "Public read access to media bucket" on storage.objects;
create policy "Public read access to media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Authenticated users can upload to media bucket" on storage.objects;
create policy "Authenticated users can upload to media bucket"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete from media bucket" on storage.objects;
create policy "Authenticated users can delete from media bucket"
  on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
