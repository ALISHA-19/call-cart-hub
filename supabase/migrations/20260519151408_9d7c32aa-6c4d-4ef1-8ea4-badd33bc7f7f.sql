
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  api_key_hash text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid());

-- Trigger to create profile + assign 'user' role on signup (admin role assigned separately during seed)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- APIs catalog
create table public.apis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  endpoint_slug text not null unique,
  method text not null default 'GET' check (method in ('GET','POST')),
  price_per_pack numeric not null default 0,
  calls_per_pack int not null default 1000,
  dummy_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.apis enable row level security;
create policy "anyone authenticated reads apis" on public.apis for select to authenticated using (true);
create policy "admins write apis" on public.apis for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_id uuid not null references public.apis(id) on delete cascade,
  remaining_calls int not null default 0,
  total_purchased int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, api_id)
);
alter table public.subscriptions enable row level security;
create policy "users read own subs" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Call logs
create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  api_id uuid references public.apis(id) on delete set null,
  api_slug text,
  response_status int not null,
  response_time_ms int not null default 0,
  ip_address text,
  created_at timestamptz not null default now()
);
alter table public.call_logs enable row level security;
create policy "users read own logs" on public.call_logs for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create index on public.call_logs (user_id, created_at desc);
create index on public.call_logs (api_id, created_at desc);
create index on public.call_logs (created_at desc);

-- Atomic metering: find user by api key hash, check sub + quota, decrement, log, return result
create or replace function public.meter_api_call(
  _key_hash text,
  _slug text,
  _ip text,
  _response_time_ms int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_api record;
  v_sub record;
  v_status int;
begin
  select id into v_user_id from public.profiles where api_key_hash = _key_hash limit 1;

  select * into v_api from public.apis where endpoint_slug = _slug limit 1;
  if v_api.id is null then
    v_status := 404;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, null, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'API not found');
  end if;

  if v_user_id is null then
    v_status := 401;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (null, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'Invalid API key');
  end if;

  select * into v_sub from public.subscriptions
    where user_id = v_user_id and api_id = v_api.id for update;
  if v_sub.id is null then
    v_status := 403;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'No subscription for this API');
  end if;

  if v_sub.remaining_calls <= 0 then
    v_status := 429;
    insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
      values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);
    return jsonb_build_object('status', v_status, 'error', 'Quota exhausted');
  end if;

  update public.subscriptions set remaining_calls = remaining_calls - 1 where id = v_sub.id;
  v_status := 200;
  insert into public.call_logs (user_id, api_id, api_slug, response_status, response_time_ms, ip_address)
    values (v_user_id, v_api.id, _slug, v_status, _response_time_ms, _ip);

  return jsonb_build_object('status', v_status, 'data', v_api.dummy_response, 'remaining', v_sub.remaining_calls - 1);
end;
$$;

-- Seed APIs
insert into public.apis (name, description, endpoint_slug, method, price_per_pack, calls_per_pack, dummy_response) values
  ('Weather API','Real-time weather data for any city','weather','GET',100,1000,'{"city":"Mumbai","temp":"32°C","condition":"Sunny"}'::jsonb),
  ('Currency Exchange API','Live forex rates between currencies','currency','GET',100,1000,'{"base":"USD","INR":83.5,"EUR":0.91}'::jsonb),
  ('Joke API','Random programming jokes','joke','GET',50,500,'{"joke":"Why do programmers prefer dark mode? Light attracts bugs."}'::jsonb),
  ('IP Lookup API','Geolocation lookup for any IP address','iplookup','POST',200,2000,'{"ip":"103.21.244.0","country":"India","isp":"Cloudflare"}'::jsonb);
