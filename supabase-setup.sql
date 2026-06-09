-- ─────────────────────────────────────────────
-- Greek Empire — Content Submissions Setup
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. Create the table
create table if not exists content_submissions (
  id              uuid primary key default gen_random_uuid(),
  ambassador_name text not null,
  instagram_handle text not null,
  chapter         text,
  platform        text not null,
  caption         text not null,
  notes           text,
  image_url       text,
  status          text not null default 'pending', -- pending | approved | revision
  revision_notes  text,
  submitted_at    timestamptz not null default now()
);

-- 2. Allow public inserts (ambassadors submit without login)
alter table content_submissions enable row level security;

create policy "Anyone can insert"
  on content_submissions for insert
  with check (true);

create policy "Anyone can read"
  on content_submissions for select
  using (true);

create policy "Anyone can update status"
  on content_submissions for update
  using (true);

-- 3. Create storage bucket for file uploads
-- Go to Storage in Supabase dashboard and create a bucket called:
--   content-submissions
-- Set it to PUBLIC so images load in the admin view.
-- (Or run the insert below if using the API)

-- insert into storage.buckets (id, name, public)
-- values ('content-submissions', 'content-submissions', true)
-- on conflict do nothing;

-- 4. Storage policy — allow public uploads
create policy "Public uploads"
  on storage.objects for insert
  with check (bucket_id = 'content-submissions');

create policy "Public reads"
  on storage.objects for select
  using (bucket_id = 'content-submissions');
