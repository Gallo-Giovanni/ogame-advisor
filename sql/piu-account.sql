-- Più account di gioco per utente (uno per server). Compatibile con i dati già salvati:
-- il primo account di ogni utente ha id = user_id e i pianeti senza account vanno al primo account.
alter table public.profiles add column if not exists id uuid;
update public.profiles set id = user_id where id is null;
alter table public.profiles alter column id set default gen_random_uuid(), alter column id set not null;
alter table public.profiles drop constraint profiles_pkey;
alter table public.profiles add primary key (id);
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- il primo account di un utente prende id = user_id (così le versioni precedenti dell'app continuano a funzionare)
create or replace function public.profiles_first_id() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where user_id = new.user_id) then new.id := new.user_id; end if;
  return new;
end $$;
create trigger profiles_first_id before insert on public.profiles for each row execute function public.profiles_first_id();

alter table public.planets add column if not exists account_id uuid references public.profiles (id) on delete cascade;
update public.planets set account_id = user_id where account_id is null;
create index if not exists planets_account_id_idx on public.planets (account_id);

-- pianeti inseriti senza account (versioni precedenti dell'app): vanno al primo account dell'utente
create or replace function public.planets_default_account() returns trigger language plpgsql set search_path = public as $$
begin
  if new.account_id is null then
    select id into new.account_id from public.profiles where user_id = new.user_id order by created_at limit 1;
  end if;
  return new;
end $$;
create trigger planets_default_account before insert on public.planets for each row execute function public.planets_default_account();

-- un pianeta può stare solo in un account dello stesso utente
drop policy planets_insert_own on public.planets;
create policy planets_insert_own on public.planets for insert with check (
  (select auth.uid()) = user_id and (account_id is null or account_id in (select id from public.profiles where user_id = (select auth.uid()))));
drop policy planets_update_own on public.planets;
create policy planets_update_own on public.planets for update using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and (account_id is null or account_id in (select id from public.profiles where user_id = (select auth.uid()))));
