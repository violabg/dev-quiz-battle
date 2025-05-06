# handle_new_user()

[← Back to Supabase Docs](./supabase.md)

## Purpose

Automatically creates a new row in the `profiles` table whenever a new user signs up via Supabase Auth.

## How it works

- This is a **trigger function**: it runs automatically after a new user is inserted into the `auth.users` table.
- It copies user metadata (name, full_name, user_name, avatar_url) from the auth system into the `profiles` table.

## SQL Code Explained

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    name,
    full_name,
    user_name,
    avatar_url
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
```

- `new` refers to the new user row being inserted.
- The function extracts fields from the user's metadata and inserts them into the `profiles` table.
- The function returns the new user row (required for triggers).

## Usage

- Linked to the `on_auth_user_created` trigger:
  - Every time a user signs up, this function runs and creates their profile automatically.
