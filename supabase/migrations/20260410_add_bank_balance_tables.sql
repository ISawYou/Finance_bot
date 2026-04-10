create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_account_id text not null,
  bank_name text not null,
  account_name text not null,
  account_number_mask text,
  currency text not null default 'RUB',
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_provider_check
    check (provider in ('mock', 'http_json')),
  constraint bank_accounts_provider_external_account_key
    unique (provider, external_account_id)
);

create table if not exists current_balances (
  bank_account_id uuid primary key references bank_accounts(id) on delete cascade,
  amount numeric(18,2) not null default 0,
  currency text not null default 'RUB',
  balance_at timestamptz not null,
  source text not null default 'cache',
  raw_payload jsonb,
  updated_at timestamptz not null default now(),
  constraint current_balances_source_check
    check (source in ('bank_api', 'cache', 'mock'))
);

create table if not exists bank_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  sync_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  accounts_synced integer not null default 0,
  raw_summary jsonb,
  created_at timestamptz not null default now(),
  constraint bank_sync_logs_provider_check
    check (provider in ('mock', 'http_json')),
  constraint bank_sync_logs_status_check
    check (status in ('success', 'failed'))
);

create index if not exists idx_bank_accounts_provider on bank_accounts(provider);
create index if not exists idx_current_balances_balance_at on current_balances(balance_at desc);
create index if not exists idx_bank_sync_logs_started_at on bank_sync_logs(started_at desc);
