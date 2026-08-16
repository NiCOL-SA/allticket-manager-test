-- 券管理クラウド版 v3 下地
-- 期間切替: 毎月 1日09:00 / 16日09:00

create table if not exists accounts(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check(account_type in ('personal','shared'))
);

create table if not exists ticket_types(
  id uuid primary key default gen_random_uuid(),
  location_name text not null,
  time_type text not null check(time_type in ('昼','夜')),
  sort_order int not null,
  unique(location_name,time_type)
);

create table if not exists devices(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  device_name text not null,
  device_token uuid not null default gen_random_uuid(),
  active boolean not null default true
);

create table if not exists transactions(
  id bigint generated always as identity primary key,
  account_id uuid not null references accounts(id),
  ticket_type_id uuid not null references ticket_types(id),
  period_start timestamptz not null,
  qty_delta int not null check(qty_delta<>0),
  kind text not null,
  device_id uuid references devices(id),
  created_at timestamptz not null default now()
);

insert into ticket_types(location_name,time_type,sort_order) values
('舞洲','昼',1),('舞洲','夜',2),('西淀','昼',3),('西淀','夜',4),
('住之江','昼',5),('住之江','夜',6),('東淀','昼',7),('東淀','夜',8),
('平野','昼',9),('平野','夜',10),('八尾','昼',11),('八尾','夜',12)
on conflict(location_name,time_type) do update set sort_order=excluded.sort_order;

-- 本番実装では period_start を
-- 前半: 当月1日 09:00 JST
-- 後半: 当月16日 09:00 JST
-- として保存する。
-- 1日 00:00〜08:59 は前月16日09:00開始の「後半」に属する。
-- 16日 00:00〜08:59 は当月1日09:00開始の「前半」に属する。
