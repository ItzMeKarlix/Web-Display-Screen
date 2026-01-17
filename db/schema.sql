-- Complete Setup Script for Scrollable Announcements
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the announcements table
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  image_url text not null,
  display_duration integer default 10,
  transition_type text default 'fade',
  active boolean default true
);

-- 2. Enable RLS
alter table public.announcements enable row level security;

-- 3. Create RLS Policies for the Table
-- Cleanup old policies to ensure idempotency
drop policy if exists "Public Annoucements are viewable by everyone" on public.announcements;
drop policy if exists "Anyone can upload announcements" on public.announcements;
drop policy if exists "Anyone can update announcements" on public.announcements;
drop policy if exists "Anyone can delete announcements" on public.announcements;

-- PUBLIC VIEW
create policy "Public Annoucements are viewable by everyone"
on public.announcements for select
to public
using ( true );

-- PUBLIC EDIT (Insert/Update/Delete) - logic for Admin Panel w/o Auth
create policy "Anyone can upload announcements"
on public.announcements for insert
to public
with check ( true );

create policy "Anyone can update announcements"
on public.announcements for update
to public
using ( true );

create policy "Anyone can delete announcements"
on public.announcements for delete
to public
using ( true );

-- 4. Create the Storage Bucket
-- Note: 'insert into storage.buckets' requires special permissions or running inside the dashboard SQL editor
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do update
set public = true; 

-- 5. Storage Policies
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Public Upload" on storage.objects;

create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'announcements' );

create policy "Public Upload"
on storage.objects for insert
to public
with check ( bucket_id = 'announcements' );