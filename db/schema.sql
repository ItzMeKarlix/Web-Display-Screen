-- Complete Setup Script for Scrollable Announcements
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- ==========================================
-- 1. Tables & Security
-- ==========================================

-- Passwords are stored as bcrypt hashes, never as plaintext.
create extension if not exists pgcrypto;

-- 1.1 Create the announcements table
create table if not exists public.scenes (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scenes enable row level security;
drop policy if exists "Public Scenes are viewable by everyone" on public.scenes;
drop policy if exists "Anyone can manage scenes" on public.scenes;
create policy "Public Scenes are viewable by everyone" on public.scenes for select to public using (true);
create policy "Anyone can manage scenes" on public.scenes for all to public using (true) with check (true);

create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  image_url text not null,
  title text default 'Untitled Announcement',
  display_duration integer default 10,
  transition_type text default 'fade',
  active boolean default true,
  order_index integer default 0
);

alter table public.announcements add column if not exists scene_id uuid references public.scenes(id) on delete cascade;

-- Enable RLS for announcements
alter table public.announcements enable row level security;

-- 1.2 Create the Settings Table
create table if not exists public.settings (
  id integer primary key default 1,
  refresh_interval integer default 5, -- in minutes
  default_duration integer default 10, -- in seconds
  security_enabled boolean default false,
  admin_password text, -- bcrypt hash; nullable to allow setup mode
  active_scene_id uuid references public.scenes(id),
  constraint single_row check (id = 1)
);

-- Enable RLS for settings
alter table public.settings enable row level security;

-- One-time migration for installations created by the original schema.
-- Existing plaintext values are converted in place; already-hashed values are unchanged.
update public.settings
set admin_password = crypt(admin_password, gen_salt('bf'))
where admin_password is not null
  and admin_password <> ''
  and admin_password not like '$2%';

-- ==========================================
-- 2. Row Level Security Policies
-- ==========================================

-- Cleanup old policies to ensure idempotency
drop policy if exists "Public Annoucements are viewable by everyone" on public.announcements;
drop policy if exists "Anyone can upload announcements" on public.announcements;
drop policy if exists "Anyone can update announcements" on public.announcements;
drop policy if exists "Anyone can delete announcements" on public.announcements;

-- Public Access Policies for Announcements
create policy "Public Annoucements are viewable by everyone"
on public.announcements for select
to public
using ( true );

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

-- Settings Policies
drop policy if exists "Public Settings are viewable by everyone" on public.settings;
drop policy if exists "Anyone can update settings" on public.settings;

create policy "Public Settings are viewable by everyone"
on public.settings for select
to public
using ( true );

create policy "Anyone can update settings"
on public.settings for update
to public
using ( true );

create policy "Anyone can insert settings"
on public.settings for insert
to public
with check ( true );

-- ==========================================
-- 3. Functions (RPC) for Security
-- ==========================================

-- 3.1 Function to check if password is set (without revealing it)
create or replace function is_password_set()
returns boolean
language plpgsql
security definer
as $$
declare
  has_pass boolean;
begin
  select (admin_password is not null and admin_password <> '') into has_pass
  from public.settings
  where id = 1;
  
  return coalesce(has_pass, false);
end;
$$;

-- 3.2 Function to verify password safely (prevents leaking password hash)
create or replace function verify_admin_password(attempt text)
returns boolean
language plpgsql
security definer
as $$
declare
  is_correct boolean;
begin
  select (crypt(attempt, admin_password) = admin_password) into is_correct
  from public.settings
  where id = 1;
  
  return coalesce(is_correct, false);
end;
$$;

-- 3.3 Set the first password without exposing the stored hash.
create or replace function setup_admin_password(new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_password is null or length(new_password) < 8 then
    return false;
  end if;

  update public.settings
  set admin_password = crypt(new_password, gen_salt('bf'))
  where id = 1 and (admin_password is null or admin_password = '');

  return found;
end;
$$;

-- 3.4 Function to securely change password
create or replace function change_admin_password(current_password text, new_password text)
returns boolean
language plpgsql
security definer
as $$
declare
  is_valid boolean;
begin
  if new_password is null or length(new_password) < 8 then
    return false;
  end if;

  -- 1. Check if the current password matches
  select (crypt(current_password, admin_password) = admin_password) into is_valid
  from public.settings
  where id = 1;

  if is_valid is not true then
    return false;
  else
    update public.settings
    set admin_password = crypt(new_password, gen_salt('bf'))
    where id = 1;
    return true;
  end if;
end;
$$;

-- ==========================================
-- 4. Initial Data
-- ==========================================

insert into public.settings (id, refresh_interval, default_duration, security_enabled, admin_password)
values (1, 5, 10, false, null)
on conflict (id) do nothing;

-- Create and assign a scene for existing installations. New uploads should use this scene.
insert into public.scenes (name)
values ('Default')
on conflict (name) do nothing;

update public.announcements
set scene_id = (select id from public.scenes where name = 'Default')
where scene_id is null;

update public.settings
set active_scene_id = (select id from public.scenes where name = 'Default')
where id = 1 and active_scene_id is null;

alter table public.announcements alter column scene_id set not null;

create or replace function activate_scene(target_scene_id uuid)
returns public.scenes
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_scene public.scenes;
  has_content boolean;
begin
  select * into selected_scene from public.scenes where id = target_scene_id;
  if not found then raise exception 'Scene not found'; end if;

  select exists(
    select 1 from public.announcements where scene_id = target_scene_id and active = true
  ) into has_content;
  if not has_content then raise exception 'Scene must contain at least one active image'; end if;

  update public.settings set active_scene_id = target_scene_id, id = 1 where id = 1;
  return selected_scene;
end;
$$;

-- ==========================================
-- 5. Storage Setup
-- ==========================================

insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do update
set public = true; 

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
