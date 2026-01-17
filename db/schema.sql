create table announcements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  image_url text not null,
  display_duration integer default 10,
  transition_type text default 'fade',
  active boolean default true
);

-- 1. Enable RLS on the table (if not already)
alter table announcements enable row level security;

-- 2. Allow Public Read Access (so the TV can see images)
create policy "Public Annoucements are viewable by everyone"
on announcements for select
to public
using ( true );

-- 3. Allow Public Insert/Update/Delete (for the Admin Panel)
-- WARNING: This allows anyone with your URL to edit. 
-- You should add Auth later!
create policy "Anyone can upload announcements"
on announcements for insert
to public
with check ( true );

create policy "Anyone can update announcements"
on announcements for update
to public
using ( true );

create policy "Anyone can delete announcements"
on announcements for delete
to public
using ( true );

-- 4. Storage Policies (If you created the bucket strictly)
-- Allow public access to view files in 'announcements' bucket
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'announcements' );

-- Allow public access to upload files
create policy "Public Upload"
on storage.objects for insert
to public
with check ( bucket_id = 'announcements' );